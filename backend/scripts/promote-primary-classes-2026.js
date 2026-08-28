const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PROMOTION_KEY = "primary-promotion-2026-stop-at-fifth";

const PROMOTIONS = [
  { from: "أولى", to: "ثانية" },
  { from: "ثانية", to: "ثالثة" },
  { from: "ثالثة", to: "رابعة" },
  { from: "رابعة", to: "خامسة" },
];

const args = new Set(process.argv.slice(2));
const shouldExecute = args.has("--execute");
const assumeYes = args.has("--yes");
const force = args.has("--force");

function formatClass(classDoc) {
  return `${classDoc.name} (${classDoc.grade}, ${classDoc._id})`;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function askForConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function loadPromotionPlan(db) {
  const classes = await db
    .collection("classes")
    .find({ stage: "Primary", isActive: true })
    .toArray();

  const classesByGrade = new Map(classes.map((classDoc) => [classDoc.grade, classDoc]));
  const missingGrades = new Set();

  const steps = PROMOTIONS.map(({ from, to }) => {
    const fromClass = classesByGrade.get(from);
    const toClass = classesByGrade.get(to);

    if (!fromClass) missingGrades.add(from);
    if (!toClass) missingGrades.add(to);

    return { from, to, fromClass, toClass };
  });

  if (missingGrades.size > 0) {
    throw new Error(`Missing active Primary classes for grades: ${[...missingGrades].join(", ")}`);
  }

  for (const step of steps) {
    step.children = await db
      .collection("children")
      .find({ class: step.fromClass._id })
      .sort({ name: 1 })
      .toArray();
  }

  return steps;
}

async function writeBackup(steps) {
  const backupDir = path.join(__dirname, "../backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(
    backupDir,
    `primary-promotion-2026-${timestampForFile()}.json`
  );

  const backup = {
    promotionKey: PROMOTION_KEY,
    createdAt: new Date().toISOString(),
    note: "Backup before promoting Primary children. Images are Cloudinary URLs and are not modified.",
    promotions: steps.map((step) => ({
      fromClass: step.fromClass,
      toClass: step.toClass,
      childrenCount: step.children.length,
      children: step.children,
    })),
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  return backupPath;
}

async function printPlan(db, steps) {
  console.log("\n=== PRIMARY CLASS PROMOTION PLAN ===");
  console.log("Scope: Primary only");
  console.log("Moves: أولى -> ثانية, ثانية -> ثالثة, ثالثة -> رابعة, رابعة -> خامسة");
  console.log("Untouched: Nursery, Preparatory, خامسة -> سادسة, سادسة, Secondary");
  console.log("Images: untouched");
  console.log("Attendance records: untouched\n");

  for (const step of steps) {
    const activeCount = step.children.filter((child) => child.isActive !== false).length;
    console.log(
      `${formatClass(step.fromClass)} -> ${formatClass(step.toClass)} | children=${step.children.length}, active=${activeCount}`
    );
  }

  const fifthClass = await db.collection("classes").findOne({
    stage: "Primary",
    grade: "خامسة",
    isActive: true,
  });

  if (fifthClass) {
    const currentFifthCount = await db
      .collection("children")
      .countDocuments({ class: fifthClass._id });
    const incomingToFifth =
      steps.find((step) => step.to === "خامسة")?.children.length || 0;

    console.log(
      `\nخامسة after promotion will contain current ${currentFifthCount} + incoming ${incomingToFifth} = ${currentFifthCount + incomingToFifth} children.`
    );
  }

  const totalChildren = steps.reduce((sum, step) => sum + step.children.length, 0);
  console.log(`\nTotal children to update once: ${totalChildren}`);
}

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/church_management";

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  try {
    const existingRun = await db.collection("schoolyearpromotions").findOne({
      key: PROMOTION_KEY,
      status: "completed",
    });

    if (existingRun && !force) {
      console.log(`Promotion already completed at ${existingRun.completedAt}.`);
      console.log("Use --force only if you intentionally need to run it again.");
      return;
    }

    const steps = await loadPromotionPlan(db);
    await printPlan(db, steps);

    if (!shouldExecute) {
      console.log("\nDry run only. Re-run with --execute to apply these changes.");
      return;
    }

    if (!assumeYes) {
      const answer = await askForConfirmation("\nType PROMOTE to execute: ");
      if (answer !== "PROMOTE") {
        console.log("Cancelled. No changes were made.");
        return;
      }
    }

    const backupPath = await writeBackup(steps);
    console.log(`\nBackup written: ${backupPath}`);

    const results = [];
    for (const step of steps) {
      const childIds = step.children.map((child) => child._id);

      if (childIds.length === 0) {
        results.push({
          from: step.from,
          to: step.to,
          matched: 0,
          modified: 0,
        });
        continue;
      }

      const result = await db.collection("children").updateMany(
        { _id: { $in: childIds }, class: step.fromClass._id },
        {
          $set: {
            class: step.toClass._id,
            stage: step.toClass.stage,
            grade: step.toClass.grade,
            updatedAt: new Date(),
          },
        }
      );

      results.push({
        from: step.from,
        to: step.to,
        matched: result.matchedCount,
        modified: result.modifiedCount,
      });
    }

    await db.collection("schoolyearpromotions").insertOne({
      key: PROMOTION_KEY,
      status: "completed",
      completedAt: new Date(),
      backupPath,
      steps: results,
    });

    console.log("\n=== PROMOTION COMPLETE ===");
    for (const result of results) {
      console.log(
        `${result.from} -> ${result.to}: matched=${result.matched}, modified=${result.modified}`
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Promotion failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
