const express = require("express");
const mongoose = require("mongoose");
const Class = require("../models/Class");
const Child = require("../models/Child");
const PointCycle = require("../models/PointCycle");
const PointCategory = require("../models/PointCategory");
const PointEntry = require("../models/PointEntry");
const { authMiddleware } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();
const isManager = (user) => user.role === "admin" || user.role === "serviceLeader";

const canAccessClass = (user, classId) => {
  if (isManager(user)) return true;
  return (
    (user.role === "servant" || user.role === "classTeacher") &&
    user.assignedClass &&
    user.assignedClass._id.toString() === classId.toString()
  );
};

const ensureClassAccess = async (req, classId) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    const error = new Error("معرّف الفصل غير صحيح");
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  if (!canAccessClass(req.user, classId)) {
    const error = new Error("يمكنك إدارة نقاط فصلك فقط");
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  const classData = await Class.findById(classId).select("name grade stage isActive");
  if (!classData) {
    const error = new Error("الفصل غير موجود");
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  return classData;
};

const getActiveCycle = async (classId, userId) => {
  let cycle = await findActiveCycle(classId);
  if (!cycle) {
    const startedAt = new Date();
    try {
      cycle = await PointCycle.create({ class: classId, startedAt, createdBy: userId });
    } catch (error) {
      if (error.code !== 11000) throw error;
      cycle = await PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });
    }
  }
  return cycle;
};

const findActiveCycle = (classId) =>
  PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });

const getClassIdFromRequest = (req) => req.query.classId || req.body.classId;

const getDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
};

const isFridayDate = (value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.getUTCDay() === 5;
};

// Current leaderboard for one class.
router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const classId = getClassIdFromRequest(req);
  if (!classId) {
    return res.status(400).json({ success: false, error: "يجب اختيار فصل لعرض نظام النقاط" });
  }

  const classData = await ensureClassAccess(req, classId);
  const selectedDate = req.query.date ? getDateOnly(req.query.date) : null;
  if (req.query.date && !selectedDate) {
    return res.status(400).json({ success: false, error: "تاريخ التسجيل غير صحيح" });
  }
  if (selectedDate && !isFridayDate(selectedDate)) {
    return res.status(400).json({ success: false, error: "نظام النقاط مخصص ليوم الجمعة فقط" });
  }
  const cycle = await findActiveCycle(classId);
  const dateFilter = selectedDate ? { date: selectedDate } : {};
  const [children, categories, scoreRows, entries] = await Promise.all([
    Child.find({ class: classId, isActive: true }).select("name class image thumbnail").sort({ name: 1 }),
    PointCategory.find({ class: classId, isActive: true }).sort({ order: 1, createdAt: 1 }),
    cycle
      ? PointEntry.aggregate([
          { $match: { class: new mongoose.Types.ObjectId(classId), cycle: cycle._id } },
          { $sort: { updatedAt: -1, createdAt: -1 } },
          {
            $group: {
              _id: { child: "$child", category: "$category", date: "$date" },
              points: { $first: { $cond: [{ $gt: ["$points", 0] }, 1, -1] } },
            },
          },
          { $group: { _id: "$_id.child", score: { $sum: "$points" } } },
        ])
      : Promise.resolve([]),
    cycle
      ? PointEntry.find({ class: classId, cycle: cycle._id, ...dateFilter })
          .populate("category", "name")
          .populate("child", "name")
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(200)
      : Promise.resolve([]),
  ]);

  const scores = new Map(scoreRows.map((row) => [row._id.toString(), row.score]));

  const leaderboard = children
    .map((child) => ({
      _id: child._id,
      name: child.name,
      image: child.image || null,
      score: scores.get(child._id.toString()) || 0,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));

  res.json({
    success: true,
    data: {
      class: classData,
      cycle,
      selectedDate,
      categories,
      leaderboard,
      recentEntries: entries,
    },
  });
}));

router.post("/categories", authMiddleware, asyncHandler(async (req, res) => {
  const { classId, name } = req.body;
  await ensureClassAccess(req, classId);
  const cleanName = String(name || "").trim();
  if (cleanName.length < 2) {
    return res.status(400).json({ success: false, error: "اكتب اسمًا واضحًا لبند النقاط" });
  }

  try {
    const category = await PointCategory.create({
      class: classId,
      name: cleanName,
      createdBy: req.user.userId || req.user._id,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: "هذا البند موجود بالفعل في الفصل" });
    }
    throw error;
  }
}));

const updateCategory = asyncHandler(async (req, res) => {
  const category = await PointCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود" });
  await ensureClassAccess(req, category.class);
  const name = String(req.body.name || "").trim();
  if (name.length < 2) return res.status(400).json({ success: false, error: "اسم البند قصير جدًا" });
  category.name = name;
  await category.save();
  res.json({ success: true, data: category });
});

router.put("/categories/:id", authMiddleware, updateCategory);
router.patch("/categories/:id", authMiddleware, updateCategory);

router.delete("/categories/:id", authMiddleware, asyncHandler(async (req, res) => {
  const category = await PointCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود" });
  await ensureClassAccess(req, category.class);
  category.isActive = false;
  await category.save();
  res.json({ success: true, message: "تم إخفاء بند النقاط" });
}));

router.post("/entries/batch", authMiddleware, asyncHandler(async (req, res) => {
  const { classId, date, entries } = req.body;
  await ensureClassAccess(req, classId);
  const entryDate = getDateOnly(date);
  if (!entryDate || !isFridayDate(entryDate)) {
    return res.status(400).json({ success: false, error: "يمكن تسجيل النقاط ليوم الجمعة فقط" });
  }
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) {
    return res.status(400).json({ success: false, error: "لا توجد حركات نقاط صالحة للحفظ" });
  }

  const invalidEntry = entries.find((entry) => {
    const numericPoints = Number(entry.points);
    return (
      !mongoose.Types.ObjectId.isValid(entry.childId) ||
      !mongoose.Types.ObjectId.isValid(entry.categoryId) ||
      !Number.isInteger(numericPoints) ||
      (numericPoints !== 1 && numericPoints !== -1)
    );
  });
  if (invalidEntry) {
    return res.status(400).json({ success: false, error: "يوجد تسجيل نقاط غير صحيح" });
  }

  const childIds = [...new Set(entries.map((entry) => String(entry.childId)))];
  const categoryIds = [...new Set(entries.map((entry) => String(entry.categoryId)))];
  const entryKeys = entries.map((entry) => `${entry.childId}:${entry.categoryId}`);
  if (new Set(entryKeys).size !== entryKeys.length) {
    return res.status(400).json({ success: false, error: "كل طفل يسمح له بنقطة واحدة فقط لكل بند في الجمعة" });
  }
  const [children, categories] = await Promise.all([
    Child.find({ _id: { $in: childIds }, class: classId, isActive: true }).select("_id"),
    PointCategory.find({ _id: { $in: categoryIds }, class: classId, isActive: true }).select("_id"),
  ]);
  if (children.length !== childIds.length) {
    return res.status(404).json({ success: false, error: "يوجد طفل غير موجود في هذا الفصل" });
  }
  if (categories.length !== categoryIds.length) {
    return res.status(404).json({ success: false, error: "يوجد بند نقاط غير موجود في هذا الفصل" });
  }

  // A batch starts the cycle only after all entries have been validated.
  const cycle = await getActiveCycle(classId, req.user.userId || req.user._id);
  const documents = entries.map((entry) => ({
    cycle: cycle._id,
    class: classId,
    child: entry.childId,
    category: entry.categoryId,
    date: entryDate,
    points: Number(entry.points),
    note: entry.note ? String(entry.note).trim() : undefined,
    createdBy: req.user.userId || req.user._id,
  }));
  const operations = documents.map((document) => ({
    updateOne: {
      filter: {
        cycle: document.cycle,
        date: document.date,
        child: document.child,
        category: document.category,
      },
      update: {
        $set: {
          class: document.class,
          points: document.points,
          note: document.note,
          createdBy: document.createdBy,
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const batchResult = await PointEntry.bulkWrite(operations);
  res.status(201).json({
    success: true,
    data: { count: operations.length, modified: batchResult.modifiedCount, upserted: batchResult.upsertedCount },
    message: `تم حفظ ${operations.length} حالة نقاط مرة واحدة`,
  });
}));

router.post("/entries", authMiddleware, asyncHandler(async (req, res) => {
  const { classId, childId, categoryId, points, note, date } = req.body;
  await ensureClassAccess(req, classId);
  const entryDate = getDateOnly(date);
  if (!entryDate) {
    return res.status(400).json({ success: false, error: "يجب اختيار تاريخ الجمعة قبل تسجيل النقاط" });
  }
  if (!isFridayDate(entryDate)) {
    return res.status(400).json({ success: false, error: "يمكن تسجيل النقاط ليوم الجمعة فقط" });
  }
  const numericPoints = Number(points);
  if (numericPoints !== 1 && numericPoints !== -1) {
    return res.status(400).json({ success: false, error: "كل بند يسمح بنقطة واحدة فقط: إضافة أو خصم" });
  }

  const [child, category] = await Promise.all([
    Child.findOne({ _id: childId, class: classId, isActive: true }).select("_id name"),
    PointCategory.findOne({ _id: categoryId, class: classId, isActive: true }),
  ]);
  if (!child) return res.status(404).json({ success: false, error: "الطفل غير موجود في هذا الفصل" });
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود في هذا الفصل" });

  // The first valid point entry starts the class cycle. Merely opening the page
  // or creating a category must not start the competition.
  const cycle = await getActiveCycle(classId, req.user.userId || req.user._id);

  const entry = await PointEntry.findOneAndUpdate(
    { cycle: cycle._id, date: entryDate, child: child._id, category: category._id },
    {
      $set: {
        class: classId,
        points: numericPoints,
        note: note ? String(note).trim() : undefined,
        createdBy: req.user.userId || req.user._id,
      },
      $setOnInsert: { cycle: cycle._id, date: entryDate, child: child._id, category: category._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await entry.populate("category", "name");
  await entry.populate("child", "name");
  res.status(201).json({ success: true, data: entry });
}));

router.post("/reset", authMiddleware, asyncHandler(async (req, res) => {
  const { classId } = req.body;
  await ensureClassAccess(req, classId);
  const currentCycle = await PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });
  if (!currentCycle) {
    return res.status(400).json({ success: false, error: "لا توجد دورة نشطة لإعادة ضبطها" });
  }
  const now = new Date();
  currentCycle.status = "completed";
  currentCycle.endedAt = now;
  currentCycle.resetBy = req.user.userId || req.user._id;
  await currentCycle.save();
  res.json({
    success: true,
    data: null,
    message: "تم إنهاء الدورة الحالية، وستبدأ الدورة الجديدة عند أول نقطة مسجلة",
  });
}));

module.exports = router;
