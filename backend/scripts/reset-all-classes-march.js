/**
 * Script to reset consecutive attendance for ALL classes
 * Sets reset date to 2026-03-20 so that 2026-03-27 is the first Friday counted
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function resetAllClasses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Reset date: 20 March 2026, 10:00 AM UTC
    const resetDate = new Date("2026-03-20T10:00:00.000Z");
    const resetDateStr = resetDate.toISOString().split("T")[0];

    console.log("=== RESET ALL CLASSES ===");
    console.log("Reset Date:", resetDateStr);
    console.log("Purpose: So that 2026-03-27 (Friday) is the first Friday counted\n");

    // Check if reset already exists for this date
    const existingResets = await db.collection("giftdeliveries").countDocuments({
      consecutiveWeeksEarned: 0,
      isActive: true,
      deliveryDate: {
        $gte: new Date(resetDateStr + "T00:00:00.000Z"),
        $lt: new Date(resetDateStr + "T23:59:59.999Z"),
      },
    });

    if (existingResets > 0) {
      console.log("WARNING: Already found " + existingResets + " reset records for this date!");
      console.log("Aborting to prevent duplicates.");
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get all active children
    const children = await db.collection("children").find({ isActive: true }).toArray();
    console.log("Total active children:", children.length);

    // Get a user to use as deliveredBy (get an admin)
    const admin = await db.collection("users").findOne({ role: "admin" });
    if (!admin) {
      console.log("ERROR: No admin user found!");
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log("Using admin:", admin.name, "(", admin._id, ")");

    // Create reset records
    const giftRecords = children.map((child) => ({
      child: child._id,
      deliveredBy: admin._id,
      consecutiveWeeksEarned: 0,
      giftType: "reset marker",
      notes: "reset tl2a2y ltarikh 27/3/2026 - awel gom3a ba3d el reset",
      deliveryDate: resetDate,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    console.log("\nReady to insert", giftRecords.length, "reset records");
    console.log("Date:", resetDateStr);
    console.log("\nType YES to confirm:");

    // Wait for user input
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.question("", async (answer) => {
      if (answer.trim().toUpperCase() === "YES") {
        const result = await db.collection("giftdeliveries").insertMany(giftRecords);
        console.log("\nSUCCESS! Inserted", result.insertedCount, "reset records");
        console.log("Reset date:", resetDateStr);
        console.log("First Friday after reset: 2026-03-27");
      } else {
        console.log("Cancelled.");
      }

      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

resetAllClasses();
