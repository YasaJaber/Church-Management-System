const express = require("express");
const Child = require("../models/Child");
const Attendance = require("../models/Attendance");
const PastoralCare = require("../models/PastoralCare");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Helper function to get the most recent date with attendance records
const getMostRecentAttendanceDate = async (childrenIds) => {
  try {
    // Find all attendance records for children (no sorting first)
    const allAttendanceRecords = await Attendance.find({
      type: "child",
      person: { $in: childrenIds }
    })
    .select('date');
    
    if (allAttendanceRecords.length === 0) {
      return null;
    }
    
    // Convert all dates to comparable format and find the most recent
    let mostRecentDate = null;
    let mostRecentTimestamp = 0;
    
    for (const record of allAttendanceRecords) {
      let dateStr;
      let timestamp;
      
      if (record.date instanceof Date) {
        // Actual Date object
        dateStr = record.date.toISOString().split('T')[0];
        timestamp = record.date.getTime();
      } else if (typeof record.date === 'string') {
        if (record.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Already in YYYY-MM-DD format
          dateStr = record.date;
          timestamp = new Date(record.date).getTime();
        } else {
          // String representation of Date object
          const dateObj = new Date(record.date);
          if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toISOString().split('T')[0];
            timestamp = dateObj.getTime();
          } else {
            console.warn(`Invalid date format: ${record.date}`);
            continue;
          }
        }
      }
      
      if (dateStr && timestamp > mostRecentTimestamp) {
        mostRecentTimestamp = timestamp;
        mostRecentDate = dateStr;
      }
    }
    
    console.log(`📅 Most recent attendance date found: ${mostRecentDate}`);
    return mostRecentDate;
  } catch (error) {
    console.error("Error finding recent attendance date:", error);
    return null;
  }
};

// @route   GET /api/pastoral-care/absent-children
// @desc    Get children who were absent on the most recent attendance date
// @access  Protected (Role-based: Admin sees all, Servants see their class only)
router.get("/absent-children", authMiddleware, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(50));
    console.log("🔍 GET /pastoral-care/absent-children API CALLED");
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("🔐 Role:", req.user?.role || "UNKNOWN");
    console.log("🏫 Assigned Class:", req.user?.assignedClass || "NONE");
    console.log("=".repeat(50));

    // Build children query based on user role
    let childrenQuery = { isActive: true };
    if (req.user.role === "admin") {
      // Admin sees all children
      console.log("👑 Admin access - showing all absent children");
    } else if ((req.user.role === "servant" || req.user.role === "classTeacher") && req.user.assignedClass) {
      // Servant/ClassTeacher sees only their assigned class
      childrenQuery.class = req.user.assignedClass._id;
      console.log("👤 Servant/ClassTeacher access - filtering by class:", req.user.assignedClass._id);
    } else {
      console.log("❌ Access denied - invalid role or no assigned class");
      return res.status(403).json({
        success: false,
        error: "Access denied. You don't have permission to view pastoral care data.",
      });
    }

    // Get all active children based on role
    const allChildren = await Child.find(childrenQuery).populate("class");
    console.log(`👶 Found ${allChildren.length} children to check`);

    if (allChildren.length === 0) {
      return res.json({
        success: true,
        data: [],
        date: "",
        message: "No children found for your access level"
      });
    }

    // Find the most recent date with attendance records (any day, not just Friday)
    const mostRecentAttendanceDate = await getMostRecentAttendanceDate(
      allChildren.map(child => child._id)
    );
    
    if (!mostRecentAttendanceDate) {
      return res.json({
        success: true,
        data: [],
        date: "",
        totalAbsent: 0,
        totalChildren: allChildren.length,
        message: "No attendance records found for these children"
      });
    }
    
    console.log(`📅 Most recent attendance date: ${mostRecentAttendanceDate}`);
    
    // Get attendance records for the most recent attendance date
    // Since dates are stored in mixed formats, we need to search for both formats
    const attendanceRecords = await Attendance.find({
      $or: [
        { date: mostRecentAttendanceDate }, // YYYY-MM-DD format
        { date: new Date(mostRecentAttendanceDate + 'T00:00:00.000Z') }, // Date object
        { date: new Date(mostRecentAttendanceDate).toString() } // String format
      ],
      type: "child",
      person: { $in: allChildren.map(child => child._id) }
    });
    
    console.log(`📊 Found ${attendanceRecords.length} attendance records for ${mostRecentAttendanceDate}`);

    // Find children who were explicitly marked as ABSENT (status = "absent")
    const absentChildIds = attendanceRecords
      .filter(record => record.status === "absent")
      .map(record => record.person.toString());

    // Get the actual absent children objects
    const absentChildren = allChildren.filter(child => 
      absentChildIds.includes(child._id.toString())
    );

    console.log(`🚫 Found ${absentChildren.length} children explicitly marked as absent`);
    
    // If no children were marked as absent, return empty list
    if (absentChildren.length === 0) {
      return res.json({
        success: true,
        data: [],
        date: mostRecentAttendanceDate,
        totalAbsent: 0,
        totalChildren: allChildren.length,
        message: "No children were explicitly marked as absent on the most recent attendance date"
      });
    }

    // Get existing pastoral care records for these absent children
    const existingPastoralCare = await PastoralCare.find({
      child: { $in: absentChildren.map(child => child._id) },
      absentDate: mostRecentAttendanceDate,
      isActive: true
    });

    console.log(`📝 Found ${existingPastoralCare.length} existing pastoral care records`);

    // Get children who were already removed from pastoral care (isActive: false)
    const removedPastoralCare = await PastoralCare.find({
      child: { $in: absentChildren.map(child => child._id) },
      absentDate: mostRecentAttendanceDate,
      isActive: false
    });

    const removedChildIds = removedPastoralCare.map(record => record.child.toString());
    console.log(`🗑️ Found ${removedChildIds.length} children already removed from pastoral care`);

    // Filter out children who were already removed from pastoral care
    const finalAbsentChildren = absentChildren.filter(child => 
      !removedChildIds.includes(child._id.toString())
    );

    console.log(`📋 Final absent children (after filtering removed): ${finalAbsentChildren.length}`);

    // If no children need pastoral care, return empty list
    if (finalAbsentChildren.length === 0) {
      return res.json({
        success: true,
        data: [],
        date: mostRecentAttendanceDate,
        totalAbsent: 0,
        totalChildren: allChildren.length,
        message: "All absent children have already been contacted"
      });
    }

    // Create response data with pastoral care status
    const responseData = finalAbsentChildren.map(child => {
      const pastoralRecord = existingPastoralCare.find(
        record => record.child.toString() === child._id.toString()
      );
      
      return {
        _id: child._id,
        name: child.name,
        phone: child.phone || child.parentPhone || child.parent1_phone || child.parent2_phone || null,
        parentName: child.parentName || child.name,
        className: child.class ? child.class.name : "غير محدد",
        class: child.class ? {
          _id: child.class._id,
          name: child.class.name || `${child.class.stage} - ${child.class.grade}`,
          stage: child.class.stage,
          grade: child.class.grade
        } : null,
        pastoralCareId: pastoralRecord ? pastoralRecord._id : null,
        hasBeenCalled: pastoralRecord ? pastoralRecord.hasBeenCalled : false,
        calledBy: pastoralRecord ? pastoralRecord.calledBy : null,
        calledAt: pastoralRecord ? pastoralRecord.calledAt : null,
        lastAbsentDate: mostRecentAttendanceDate,
        notes: pastoralRecord ? pastoralRecord.notes : "",
        addedDate: pastoralRecord ? pastoralRecord.createdAt : null
      };
    });

    res.json({
      success: true,
      data: responseData,
      date: mostRecentAttendanceDate,
      totalAbsent: finalAbsentChildren.length,
      totalChildren: allChildren.length,
      message: `Found ${finalAbsentChildren.length} children who were marked as absent on ${mostRecentAttendanceDate}`
    });

  } catch (error) {
    console.error("❌ Error in pastoral care API:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching pastoral care data",
      details: error.message
    });
  }
});

// @route   DELETE /api/pastoral-care/remove-child/:childId
// @desc    Remove a child from pastoral care list (mark as contacted/followed up)
// @access  Protected
router.delete("/remove-child/:childId", authMiddleware, async (req, res) => {
  try {
    const { childId } = req.params;
    const { reason } = req.body; // Optional reason for removal

    console.log(`🗑️ Removing child ${childId} from pastoral care`);
    console.log(`📝 Reason: ${reason || "No reason provided"}`);
    console.log(`👤 Removed by: ${req.user.name} (${req.user._id})`);

    // Get the child to determine the most recent attendance date
    const child = await Child.findById(childId).populate("class");
    if (!child) {
      return res.status(404).json({
        success: false,
        error: "Child not found"
      });
    }

    // Get the most recent attendance date for this child
    const mostRecentAttendanceDate = await getMostRecentAttendanceDate([childId]);
    
    if (!mostRecentAttendanceDate) {
      return res.status(404).json({
        success: false,
        error: "No attendance records found for this child"
      });
    }

    console.log(`📅 Most recent attendance date for this child: ${mostRecentAttendanceDate}`);

    // Check if there's an existing pastoral care record for this child
    let pastoralCareRecord = await PastoralCare.findOne({
      child: childId,
      absentDate: mostRecentAttendanceDate,
      isActive: true
    }).populate({
      path: "child",
      populate: { path: "class" }
    });

    // If no record exists, create one to track the follow-up
    if (!pastoralCareRecord) {
      console.log(`📝 No existing record found, creating new one for tracking follow-up`);
      
      // Check permissions (we already have the child object)
      if (req.user.role !== "admin") {
        if (!req.user.assignedClass || 
            child.class._id.toString() !== req.user.assignedClass._id.toString()) {
          return res.status(403).json({
            success: false,
            error: "Access denied. You can only manage pastoral care for your assigned class."
          });
        }
      }

      // Create new record and immediately mark as resolved
      pastoralCareRecord = new PastoralCare({
        child: childId,
        absentDate: mostRecentAttendanceDate,
        addedBy: req.user._id,
        notes: `تم إنشاء السجل للمتابعة - ${reason || "تم الاتصال"}`,
        isActive: false,
        removedBy: req.user._id,
        removedDate: new Date(),
        removalReason: "contacted"
      });
      
      await pastoralCareRecord.save();
      
      return res.json({
        success: true,
        message: "Child removed from pastoral care list",
        data: {
          childId: childId,
          action: "removed",
          reason: reason || "contacted",
          removedBy: req.user.name,
          removedAt: new Date()
        }
      });
    }

    // If record exists, check permissions
    if (req.user.role !== "admin") {
      if (!req.user.assignedClass || 
          pastoralCareRecord.child.class._id.toString() !== req.user.assignedClass._id.toString()) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You can only manage pastoral care for your assigned class."
        });
      }
    }

    // Update the record to mark it as resolved
    pastoralCareRecord.isActive = false;
    pastoralCareRecord.removedBy = req.user._id;
    pastoralCareRecord.removedDate = new Date();
    pastoralCareRecord.removalReason = "contacted"; // Always set to contacted
    
    // Add reason to notes if provided
    if (reason) {
      pastoralCareRecord.notes += `\n\nإزالة بواسطة ${req.user.name}: ${reason}`;
    }

    await pastoralCareRecord.save();

    console.log(`✅ Pastoral care record resolved for child ${pastoralCareRecord.child.name}`);
    console.log(`   Class: ${pastoralCareRecord.child.class.stage} - ${pastoralCareRecord.child.class.grade}`);
    console.log(`   Action by: ${req.user.name}`);
    console.log(`   Reason: ${reason || "تم الافتقاد"}`);

    res.json({
      success: true,
      message: `تم إزالة ${pastoralCareRecord.child.name} من قائمة الافتقاد بنجاح`,
      data: {
        pastoralCareId: pastoralCareRecord._id,
        childId: pastoralCareRecord.child._id,
        childName: pastoralCareRecord.child.name,
        removedBy: req.user.name,
        reason: reason || "تم الافتقاد",
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error("❌ Error removing child from pastoral care:", error);
    res.status(500).json({
      success: false,
      error: "Server error while removing child from pastoral care",
      details: error.message
    });
  }
});

module.exports = router;
