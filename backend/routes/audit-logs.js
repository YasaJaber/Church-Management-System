const express = require("express");
const AuditLog = require("../models/AuditLog");
const { authMiddleware, adminOrServiceLeader } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route   GET /api/audit-logs
 * @desc    الحصول على سجلات المراجعة (حسب الصلاحيات)
 * @access  Protected
 */
router.get(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, collection, action, classId, startDate, endDate } = req.query;

    // بناء query حسب الصلاحيات
    let query = {};

    // المدرس والخادم يشوفوا سجلات فصلهم بس
    if (req.user.role === "servant" || req.user.role === "classTeacher") {
      if (!req.user.assignedClass) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, pages: 0 },
          message: "لا يوجد فصل مخصص لك",
        });
      }
      query.classId = req.user.assignedClass._id;
    }
    // أمين الخدمة والأدمن يشوفوا كل السجلات أو يفلتروا حسب الفصل
    else if (classId) {
      query.classId = classId;
    }

    // فلترة حسب نوع البيانات
    if (collection) {
      query.collection = collection;
    }

    // فلترة حسب نوع العملية
    if (action) {
      query.action = action;
    }

    // فلترة حسب التاريخ
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // حساب الـ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const pages = Math.ceil(total / parseInt(limit));

    // جلب السجلات
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name username")
      .populate("classId", "name");

    logger.debug("تم جلب سجلات المراجعة", {
      user: req.user.username,
      role: req.user.role,
      count: logs.length,
      total,
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        pages,
        limit: parseInt(limit),
      },
    });
  })
);

/**
 * @route   GET /api/audit-logs/my-class
 * @desc    الحصول على سجلات فصلي فقط
 * @access  Protected
 */
router.get(
  "/my-class",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, collection, action, startDate, endDate } = req.query;

    // التحقق من وجود فصل مخصص
    if (!req.user.assignedClass) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, pages: 0 },
        message: "لا يوجد فصل مخصص لك",
      });
    }

    // بناء query
    let query = {
      classId: req.user.assignedClass._id,
    };

    // فلترة حسب نوع البيانات
    if (collection) {
      query.collection = collection;
    }

    // فلترة حسب نوع العملية
    if (action) {
      query.action = action;
    }

    // فلترة حسب التاريخ
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // حساب الـ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const pages = Math.ceil(total / parseInt(limit));

    // جلب السجلات
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name username")
      .populate("classId", "name");

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        pages,
        limit: parseInt(limit),
      },
      className: req.user.assignedClass.name,
    });
  })
);

/**
 * @route   GET /api/audit-logs/stats
 * @desc    إحصائيات سجلات المراجعة
 * @access  Protected (Admin/Service Leader)
 */
router.get(
  "/stats",
  authMiddleware,
  adminOrServiceLeader,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) {
        dateQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // إحصائيات حسب نوع العملية
    const byAction = await AuditLog.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$action", count: { $sum: 1 } } },
    ]);

    // إحصائيات حسب نوع البيانات
    const byCollection = await AuditLog.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$collection", count: { $sum: 1 } } },
    ]);

    // إحصائيات حسب المستخدم
    const byUser = await AuditLog.aggregate([
      { $match: dateQuery },
      { $group: { _id: { userId: "$userId", userName: "$userName" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // إحصائيات حسب الفصل
    const byClass = await AuditLog.aggregate([
      { $match: { ...dateQuery, classId: { $ne: null } } },
      { $group: { _id: { classId: "$classId", className: "$className" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // إجمالي السجلات
    const total = await AuditLog.countDocuments(dateQuery);

    res.json({
      success: true,
      data: {
        total,
        byAction: byAction.map((item) => ({
          action: item._id,
          count: item.count,
        })),
        byCollection: byCollection.map((item) => ({
          collection: item._id,
          count: item.count,
        })),
        byUser: byUser.map((item) => ({
          userId: item._id.userId,
          userName: item._id.userName,
          count: item.count,
        })),
        byClass: byClass.map((item) => ({
          classId: item._id.classId,
          className: item._id.className,
          count: item.count,
        })),
      },
    });
  })
);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    الحصول على تفاصيل سجل معين
 * @access  Protected
 */
router.get(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const log = await AuditLog.findById(req.params.id)
      .populate("userId", "name username role")
      .populate("classId", "name stage grade");

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "السجل غير موجود",
      });
    }

    // التحقق من الصلاحيات
    if (req.user.role === "servant" || req.user.role === "classTeacher") {
      if (!req.user.assignedClass || 
          (log.classId && log.classId._id.toString() !== req.user.assignedClass._id.toString())) {
        return res.status(403).json({
          success: false,
          error: "ليس لديك صلاحية لعرض هذا السجل",
        });
      }
    }

    res.json({
      success: true,
      data: log,
    });
  })
);

module.exports = router;
