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
const CYCLE_DAYS = 28;

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
  let cycle = await PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });
  if (!cycle) {
    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setDate(endsAt.getDate() + CYCLE_DAYS);
    try {
      cycle = await PointCycle.create({ class: classId, startedAt, endsAt, createdBy: userId });
    } catch (error) {
      if (error.code !== 11000) throw error;
      cycle = await PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });
    }
  }
  return cycle;
};

const getClassIdFromRequest = (req) => req.query.classId || req.body.classId;

// Current leaderboard for one class.
router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const classId = getClassIdFromRequest(req);
  if (!classId) {
    return res.status(400).json({ success: false, error: "يجب اختيار فصل لعرض نظام النقاط" });
  }

  const classData = await ensureClassAccess(req, classId);
  const cycle = await getActiveCycle(classId, req.user.userId || req.user._id);
  const [children, categories, scoreRows, entries] = await Promise.all([
    Child.find({ class: classId, isActive: true }).select("name class image thumbnail").sort({ name: 1 }),
    PointCategory.find({ class: classId, isActive: true }).sort({ order: 1, createdAt: 1 }),
    PointEntry.aggregate([
      { $match: { class: new mongoose.Types.ObjectId(classId), cycle: cycle._id } },
      { $group: { _id: "$child", score: { $sum: "$points" } } },
    ]),
    PointEntry.find({ class: classId, cycle: cycle._id })
      .populate("category", "name")
      .populate("child", "name")
      .sort({ createdAt: -1 })
      .limit(200),
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

router.patch("/categories/:id", authMiddleware, asyncHandler(async (req, res) => {
  const category = await PointCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود" });
  await ensureClassAccess(req, category.class);
  const name = String(req.body.name || "").trim();
  if (name.length < 2) return res.status(400).json({ success: false, error: "اسم البند قصير جدًا" });
  category.name = name;
  await category.save();
  res.json({ success: true, data: category });
}));

router.delete("/categories/:id", authMiddleware, asyncHandler(async (req, res) => {
  const category = await PointCategory.findById(req.params.id);
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود" });
  await ensureClassAccess(req, category.class);
  category.isActive = false;
  await category.save();
  res.json({ success: true, message: "تم إخفاء بند النقاط" });
}));

router.post("/entries", authMiddleware, asyncHandler(async (req, res) => {
  const { classId, childId, categoryId, points, note } = req.body;
  await ensureClassAccess(req, classId);
  const numericPoints = Number(points);
  if (!Number.isInteger(numericPoints) || numericPoints === 0 || Math.abs(numericPoints) > 100) {
    return res.status(400).json({ success: false, error: "قيمة النقاط يجب أن تكون رقمًا صحيحًا بين -100 و100" });
  }

  const [child, category, cycle] = await Promise.all([
    Child.findOne({ _id: childId, class: classId, isActive: true }).select("_id name"),
    PointCategory.findOne({ _id: categoryId, class: classId, isActive: true }),
    getActiveCycle(classId, req.user.userId || req.user._id),
  ]);
  if (!child) return res.status(404).json({ success: false, error: "الطفل غير موجود في هذا الفصل" });
  if (!category) return res.status(404).json({ success: false, error: "بند النقاط غير موجود في هذا الفصل" });

  const entry = await PointEntry.create({
    cycle: cycle._id,
    class: classId,
    child: child._id,
    category: category._id,
    points: numericPoints,
    note: note ? String(note).trim() : undefined,
    createdBy: req.user.userId || req.user._id,
  });
  await entry.populate("category", "name");
  await entry.populate("child", "name");
  res.status(201).json({ success: true, data: entry });
}));

router.post("/reset", authMiddleware, asyncHandler(async (req, res) => {
  const { classId } = req.body;
  await ensureClassAccess(req, classId);
  const currentCycle = await PointCycle.findOne({ class: classId, status: "active" }).sort({ startedAt: -1 });
  const now = new Date();
  if (currentCycle) {
    currentCycle.status = "completed";
    currentCycle.endedAt = now;
    currentCycle.resetBy = req.user.userId || req.user._id;
    await currentCycle.save();
  }
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + CYCLE_DAYS);
  const cycle = await PointCycle.create({
    class: classId,
    startedAt: now,
    endsAt,
    createdBy: req.user.userId || req.user._id,
  });
  res.json({ success: true, data: cycle, message: "تم بدء دورة نقاط جديدة للفصل" });
}));

module.exports = router;
