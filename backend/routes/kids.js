const express = require("express");
const Kid = require("../models/Kid");
const { authMiddleware } = require("../middleware/auth");
const { upload, handleMulterError } = require("../middleware/upload");
const { uploadToCloudinary, deleteFromCloudinary, getThumbnailUrl, getOptimizedUrl } = require("../config/cloudinary");
const logger = require("../utils/logger");

const router = express.Router();

// @route   POST /api/kids/add-kid
// @desc    Add a new kid with image upload
// @access  Protected
router.post(
  "/add-kid",
  authMiddleware,
  upload.single("image"),
  handleMulterError,
  async (req, res) => {
    try {
      const { name, phone, notes } = req.body;

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "اسم الطفل مطلوب",
        });
      }

      let imageUrl = null;
      let imagePublicId = null;

      // Upload image to Cloudinary if provided
      if (req.file) {
        try {
          // Generate unique public_id using name and timestamp
          const sanitizedName = name.trim().replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
          const timestamp = Date.now();
          const publicId = `${sanitizedName}_${timestamp}`;

          logger.info(`Uploading image for kid: ${name}`);

          const uploadResult = await uploadToCloudinary(req.file.buffer, {
            folder: 'kids',
            public_id: publicId,
          });

          imageUrl = uploadResult.secure_url;
          imagePublicId = uploadResult.public_id;

          logger.info(`Image uploaded successfully: ${imagePublicId}`);
        } catch (uploadError) {
          logger.error("Error uploading image to Cloudinary:", uploadError);
          return res.status(500).json({
            success: false,
            error: "فشل في رفع الصورة. يرجى المحاولة مرة أخرى",
          });
        }
      }

      // Create new kid
      const newKid = new Kid({
        name: name.trim(),
        phone: phone ? phone.trim() : "",
        notes: notes ? notes.trim() : "",
        image: imageUrl,
        imagePublicId: imagePublicId,
      });

      // Save to database
      const savedKid = await newKid.save();

      logger.info(`Kid created successfully: ${savedKid._id}`);

      // Return the saved kid with virtual fields
      const kidResponse = savedKid.toObject({ virtuals: true });

      res.status(201).json({
        success: true,
        data: kidResponse,
        message: "تم إضافة الطفل بنجاح",
      });
    } catch (error) {
      logger.error("Error creating kid:", error);

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          error: "خطأ في التحقق من البيانات",
          details: validationErrors.join(", "),
        });
      }

      res.status(500).json({
        success: false,
        error: "حدث خطأ في الخادم أثناء إضافة الطفل",
      });
    }
  }
);

// @route   GET /api/kids
// @desc    Get all kids
// @access  Protected
router.get("/", authMiddleware, async (req, res) => {
  try {
    const kids = await Kid.find({ isActive: true })
      .sort({ createdAt: -1 });

    // Convert to objects with virtuals
    const kidsWithVirtuals = kids.map(kid => kid.toObject({ virtuals: true }));

    res.json({
      success: true,
      data: kidsWithVirtuals,
    });
  } catch (error) {
    logger.error("Error fetching kids:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في جلب بيانات الأطفال",
    });
  }
});

// @route   GET /api/kids/:id
// @desc    Get a single kid by ID
// @access  Protected
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const kid = await Kid.findById(req.params.id);

    if (!kid) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    res.json({
      success: true,
      data: kid.toObject({ virtuals: true }),
    });
  } catch (error) {
    logger.error("Error fetching kid:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في جلب بيانات الطفل",
    });
  }
});

// @route   PUT /api/kids/:id
// @desc    Update a kid
// @access  Protected
router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  handleMulterError,
  async (req, res) => {
    try {
      const { name, phone, notes } = req.body;

      const kid = await Kid.findById(req.params.id);

      if (!kid) {
        return res.status(404).json({
          success: false,
          error: "الطفل غير موجود",
        });
      }

      // Update fields
      if (name) kid.name = name.trim();
      if (phone !== undefined) kid.phone = phone.trim();
      if (notes !== undefined) kid.notes = notes.trim();

      // Handle image update
      if (req.file) {
        try {
          // Delete old image if exists
          if (kid.imagePublicId) {
            await deleteFromCloudinary(kid.imagePublicId);
            logger.info(`Old image deleted: ${kid.imagePublicId}`);
          }

          // Upload new image
          const sanitizedName = kid.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
          const timestamp = Date.now();
          const publicId = `${sanitizedName}_${timestamp}`;

          const uploadResult = await uploadToCloudinary(req.file.buffer, {
            folder: 'kids',
            public_id: publicId,
          });

          kid.image = uploadResult.secure_url;
          kid.imagePublicId = uploadResult.public_id;

          logger.info(`New image uploaded: ${kid.imagePublicId}`);
        } catch (uploadError) {
          logger.error("Error updating image:", uploadError);
          return res.status(500).json({
            success: false,
            error: "فشل في تحديث الصورة",
          });
        }
      }

      const updatedKid = await kid.save();

      res.json({
        success: true,
        data: updatedKid.toObject({ virtuals: true }),
        message: "تم تحديث بيانات الطفل بنجاح",
      });
    } catch (error) {
      logger.error("Error updating kid:", error);

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message
        );
        return res.status(400).json({
          success: false,
          error: "خطأ في التحقق من البيانات",
          details: validationErrors.join(", "),
        });
      }

      res.status(500).json({
        success: false,
        error: "حدث خطأ في تحديث بيانات الطفل",
      });
    }
  }
);

// @route   DELETE /api/kids/:id
// @desc    Delete a kid (soft delete)
// @access  Protected
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const kid = await Kid.findById(req.params.id);

    if (!kid) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    // Delete image from Cloudinary if exists
    if (kid.imagePublicId) {
      try {
        await deleteFromCloudinary(kid.imagePublicId);
        logger.info(`Image deleted from Cloudinary: ${kid.imagePublicId}`);
      } catch (deleteError) {
        logger.error("Error deleting image from Cloudinary:", deleteError);
        // Continue with deletion even if image deletion fails
      }
    }

    // Soft delete
    kid.isActive = false;
    await kid.save();

    res.json({
      success: true,
      message: "تم حذف الطفل بنجاح",
    });
  } catch (error) {
    logger.error("Error deleting kid:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في حذف الطفل",
    });
  }
});

// @route   DELETE /api/kids/:id/image
// @desc    Remove kid's image
// @access  Protected
router.delete("/:id/image", authMiddleware, async (req, res) => {
  try {
    const kid = await Kid.findById(req.params.id);

    if (!kid) {
      return res.status(404).json({
        success: false,
        error: "الطفل غير موجود",
      });
    }

    if (kid.imagePublicId) {
      try {
        await deleteFromCloudinary(kid.imagePublicId);
        logger.info(`Image deleted from Cloudinary: ${kid.imagePublicId}`);
      } catch (deleteError) {
        logger.error("Error deleting image from Cloudinary:", deleteError);
      }
    }

    kid.image = null;
    kid.imagePublicId = null;
    await kid.save();

    res.json({
      success: true,
      data: kid.toObject({ virtuals: true }),
      message: "تم حذف الصورة بنجاح",
    });
  } catch (error) {
    logger.error("Error removing kid image:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في حذف الصورة",
    });
  }
});

module.exports = router;
