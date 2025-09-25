# Batch Attendance Feature Implementation Guide

## المشكلة الحالية

المستخدم يواجه مشكلة في تسجيل الحضور حيث:

- لازم يسجل حضور كل طفل لوحده
- كل مرة يدوس save بتحصل page refresh
- العملية بطيئة وممله للمستخدم
- محتاج يسجل حضور الفصل كله مرة واحدة

## المطلوب

إضافة feature جديد للـ batch attendance يسمح بـ:

- تسجيل حضور عدة أطفال مرة واحدة
- إضافة ملاحظات لكل طفل
- حفظ كل التغييرات في عملية واحدة بدون refresh
- نفس الـ UI components بس في وضع batch

---

## 1. Backend Changes

### 1.1 إضافة Batch Attendance API

**File:** `backend/routes/attendance.js`

أضف هذا الـ endpoint قبل `module.exports = router;`:

```javascript
// @route   POST /api/attendance/batch
// @desc    Mark attendance for multiple children at once
// @access  Protected
router.post("/batch", authMiddleware, async (req, res) => {
  try {
    const { attendanceData, date } = req.body;

    console.log("\n" + "=".repeat(50));
    console.log("📦 BATCH ATTENDANCE API CALLED");
    console.log("📅 Date:", date);
    console.log("👥 Number of records:", attendanceData?.length || 0);
    console.log("👤 User:", req.user?.username || "UNKNOWN");
    console.log("=".repeat(50));

    // Validate input
    if (
      !attendanceData ||
      !Array.isArray(attendanceData) ||
      attendanceData.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "بيانات الحضور مطلوبة ويجب أن تكون مصفوفة غير فارغة",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "التاريخ مطلوب",
      });
    }

    const results = [];
    const errors = [];

    // Process each attendance record
    for (let i = 0; i < attendanceData.length; i++) {
      const { childId, status, notes } = attendanceData[i];

      try {
        console.log(
          `📝 Processing child ${i + 1}/${attendanceData.length}: ${childId}`
        );

        if (!childId || !status) {
          console.log(`❌ Missing data for record ${i + 1}`);
          errors.push({
            index: i,
            childId,
            error: "معرف الطفل والحالة مطلوبان",
          });
          continue;
        }

        // Find the child
        const child = await Child.findById(childId);
        if (!child) {
          console.log(`❌ Child not found: ${childId}`);
          errors.push({
            index: i,
            childId,
            error: "الطفل غير موجود",
          });
          continue;
        }

        // Check for existing record
        let existingRecord = await Attendance.findOne({
          person: childId,
          date: date,
          type: "child",
        });

        let attendanceRecord;

        if (existingRecord) {
          // Update existing record
          console.log(`🔄 Updating existing record for child: ${child.name}`);
          existingRecord.status = status;
          existingRecord.notes = notes || "";
          existingRecord.recordedBy = req.user._id;
          attendanceRecord = await existingRecord.save();
        } else {
          // Create new record
          console.log(`🆕 Creating new record for child: ${child.name}`);
          attendanceRecord = new Attendance({
            type: "child",
            person: childId,
            personModel: "Child",
            date: date,
            status: status,
            notes: notes || "",
            recordedBy: req.user._id,
            class: child.class,
          });

          try {
            await attendanceRecord.save();
          } catch (saveError) {
            // Handle duplicate key error
            if (saveError.code === 11000) {
              console.log(
                `🔄 Duplicate key error for child: ${child.name}, finding existing record`
              );
              const duplicateRecord = await Attendance.findOne({
                person: childId,
                date: date,
                type: "child",
              });

              if (duplicateRecord) {
                duplicateRecord.status = status;
                duplicateRecord.notes = notes || "";
                duplicateRecord.recordedBy = req.user._id;
                attendanceRecord = await duplicateRecord.save();
              } else {
                throw saveError;
              }
            } else {
              throw saveError;
            }
          }
        }

        // ✨ PASTORAL CARE: Automatically remove child from pastoral care if they attended
        if (status === "present" || status === "late") {
          try {
            const activePastoralCareRecord = await PastoralCare.findOne({
              child: childId,
              isActive: true,
            });

            if (activePastoralCareRecord) {
              activePastoralCareRecord.isActive = false;
              activePastoralCareRecord.removedBy = req.user._id;
              activePastoralCareRecord.removedDate = new Date();
              activePastoralCareRecord.removalReason = "attended";
              activePastoralCareRecord.notes += `\n\nتم حذفه تلقائياً من قائمة الافتقاد عند الحضور في ${date} بواسطة ${req.user.name}`;

              await activePastoralCareRecord.save();
              console.log(
                `✅ Child ${child.name} automatically removed from pastoral care`
              );
            }
          } catch (pastoralCareError) {
            console.error(
              `❌ Error updating pastoral care for ${child.name}:`,
              pastoralCareError
            );
          }
        }

        results.push({
          childId,
          childName: child.name,
          status,
          action: existingRecord ? "updated" : "created",
          attendanceId: attendanceRecord._id,
        });

        console.log(`✅ Successfully processed ${child.name}: ${status}`);
      } catch (recordError) {
        console.error(`❌ Error processing record ${i + 1}:`, recordError);
        errors.push({
          index: i,
          childId,
          error: recordError.message,
        });
      }
    }

    console.log(`📊 Batch processing complete:`);
    console.log(`   ✅ Successful: ${results.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    // Return results
    const response = {
      success: true,
      message: `تم تسجيل حضور ${results.length} طفل بنجاح`,
      data: {
        successful: results,
        errors: errors,
        summary: {
          total: attendanceData.length,
          successful: results.length,
          failed: errors.length,
        },
      },
    };

    if (errors.length > 0) {
      response.message += ` (${errors.length} خطأ)`;
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Error in batch attendance:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ في تسجيل الحضور الجماعي: " + error.message,
    });
  }
});
```

---

## 2. Frontend Changes

### 2.1 إضافة Batch API Function

**File:** `web/src/services/api.ts`

أضف هذه الـ function في `attendanceAPI` object:

```typescript
// Batch attendance for multiple children
batchSave: async (attendanceData: Array<{
  childId: string
  status: 'present' | 'absent'
  notes?: string
}>, date: string) => {
  try {
    console.log('Saving batch attendance:', attendanceData.length, 'records for date:', date)

    const response = await api.post('/attendance/batch', {
      attendanceData,
      date
    })

    console.log('Batch attendance saved successfully:', response.data)
    return { success: true, data: response.data.data || response.data }
  } catch (error: any) {
    console.error('Error saving batch attendance:', error)
    return {
      success: false,
      error: error.response?.data?.error || 'حدث خطأ في تسجيل الحضور الجماعي'
    }
  }
},
```

### 2.2 تعديل Attendance Page Component

**File:** `web/src/app/attendance/page.tsx`

#### 2.2.1 إضافة imports جديدة:

```typescript
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentCheckIcon, // ← جديد
} from "@heroicons/react/24/outline";
```

#### 2.2.2 تعديل Child interface:

```typescript
interface Child {
  _id: string;
  name: string;
  classId: string;
  className?: string;
  isPresent?: boolean;
  attendanceId?: string;
  notes?: string;
  hasAttendanceRecord?: boolean;
  // Add batch editing state
  batchStatus?: "present" | "absent" | null;
  batchNotes?: string;
}
```

#### 2.2.3 إضافة batch state variables:

```typescript
// Batch mode state
const [batchMode, setBatchMode] = useState(false);
const [batchSaving, setBatchSaving] = useState(false);
```

#### 2.2.4 إضافة batch functions:

```typescript
// Toggle child's batch status
const toggleChildBatchStatus = (
  childId: string,
  status: "present" | "absent"
) => {
  setChildren((prev) =>
    prev.map((child) => {
      if (child._id === childId) {
        const newStatus = child.batchStatus === status ? null : status;
        return {
          ...child,
          batchStatus: newStatus,
        };
      }
      return child;
    })
  );
};

// Update batch notes for a child
const updateChildBatchNotes = (childId: string, notes: string) => {
  setChildren((prev) =>
    prev.map((child) => {
      if (child._id === childId) {
        return {
          ...child,
          batchNotes: notes,
        };
      }
      return child;
    })
  );
};

// Save all batch changes
const saveBatchAttendance = async () => {
  if (!selectedDate) {
    toast.error("يرجى تحديد التاريخ");
    return;
  }

  // Get children with batch changes
  const changedChildren = children.filter(
    (child) => child.batchStatus !== null && child.batchStatus !== undefined
  );

  if (changedChildren.length === 0) {
    toast.error("لا توجد تغييرات لحفظها");
    return;
  }

  setBatchSaving(true);
  try {
    console.log(
      "Saving batch attendance for",
      changedChildren.length,
      "children"
    );

    const attendanceData = changedChildren.map((child) => ({
      childId: child._id,
      status: child.batchStatus!,
      notes: child.batchNotes || "",
    }));

    const response = await attendanceAPI.batchSave(
      attendanceData,
      selectedDate
    );

    if (response.success) {
      const { successful, errors, summary } = response.data;

      if (summary.successful > 0) {
        toast.success(`تم تسجيل حضور ${summary.successful} طفل بنجاح`);
      }

      if (summary.failed > 0) {
        toast.error(`فشل في تسجيل ${summary.failed} سجل`);
        console.error("Failed records:", errors);
      }

      // Reset batch mode and reload data
      setBatchMode(false);
      setChildren((prev) =>
        prev.map((child) => ({
          ...child,
          batchStatus: null,
          batchNotes: "",
        }))
      );

      // Reload attendance data
      await loadAttendanceData();
    } else {
      throw new Error(response.error || "فشل في تسجيل الحضور الجماعي");
    }
  } catch (error: any) {
    console.error("Error saving batch attendance:", error);
    toast.error(error.message || "حدث خطأ في تسجيل الحضور الجماعي");
  } finally {
    setBatchSaving(false);
  }
};

// Cancel batch mode
const cancelBatchMode = () => {
  setBatchMode(false);
  setChildren((prev) =>
    prev.map((child) => ({
      ...child,
      batchStatus: null,
      batchNotes: "",
    }))
  );
};

// Mark all as present in batch mode
const markAllPresent = () => {
  setChildren((prev) =>
    prev.map((child) => ({
      ...child,
      batchStatus: "present",
    }))
  );
};

// Mark all as absent in batch mode
const markAllAbsent = () => {
  setChildren((prev) =>
    prev.map((child) => ({
      ...child,
      batchStatus: "absent",
    }))
  );
};
```

#### 2.2.5 إضافة batch UI components:

```typescript
// Render batch controls
const renderBatchControls = () => {
  if (!batchMode) return null;

  const changedCount = children.filter(
    (child) => child.batchStatus !== null
  ).length;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DocumentCheckIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-800">
            وضع التسجيل الجماعي
          </h3>
        </div>
        <div className="text-sm text-blue-600">تم تحديد {changedCount} طفل</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={markAllPresent}
          className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
        >
          تحديد الكل حاضر
        </button>
        <button
          onClick={markAllAbsent}
          className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors"
        >
          تحديد الكل غائب
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={saveBatchAttendance}
          disabled={batchSaving || changedCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {batchSaving && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          حفظ الحضور ({changedCount})
        </button>
        <button
          onClick={cancelBatchMode}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
};

// Render child row for batch mode
const renderChildRowBatch = (child: Child) => {
  const currentStatus =
    child.batchStatus !== null
      ? child.batchStatus
      : child.hasAttendanceRecord
      ? child.isPresent
        ? "present"
        : "absent"
      : null;

  return (
    <div key={child._id} className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{child.name}</h3>
          <p className="text-sm text-gray-500">{child.className}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleChildBatchStatus(child._id, "present")}
            className={`p-2 rounded-full transition-colors ${
              currentStatus === "present"
                ? "bg-green-100 text-green-600 ring-2 ring-green-300"
                : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
            }`}
            title="حاضر"
          >
            <CheckCircleIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleChildBatchStatus(child._id, "absent")}
            className={`p-2 rounded-full transition-colors ${
              currentStatus === "absent"
                ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
            }`}
            title="غائب"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <textarea
          value={child.batchNotes || child.notes || ""}
          onChange={(e) => updateChildBatchNotes(child._id, e.target.value)}
          placeholder="ملاحظات..."
          className="w-full p-2 border border-gray-200 rounded-md text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  );
};
```

#### 2.2.6 تعديل الـ JSX في return statement:

```typescript
return (
  <div className="container mx-auto px-4 py-8">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <UserGroupIcon className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">تسجيل حضور الأطفال</h1>
      </div>

      {!batchMode && (
        <button
          onClick={() => setBatchMode(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <DocumentCheckIcon className="h-5 w-5" />
          التسجيل الجماعي
        </button>
      )}
    </div>

    {/* Date and Class Selection */}
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التاريخ
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={batchMode}
            />
            <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {(user?.role === "admin" || user?.role === "serviceLeader") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الفصل
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={batchMode}
            >
              <option value="">جميع الفصول</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>

    {/* Batch Controls */}
    {renderBatchControls()}

    {/* Children List */}
    {loading ? (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    ) : children.length === 0 ? (
      <div className="text-center py-12">
        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          لا توجد أطفال
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          لا يوجد أطفال في هذا الفصل أو لم يتم تحديد فصل
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children.map((child) =>
          batchMode ? renderChildRowBatch(child) : renderChildRow(child)
        )}
      </div>
    )}

    {/* Attendance Modal - only show in normal mode */}
    {!batchMode && (
      <AttendanceModal
        isOpen={attendanceModal.isOpen}
        onClose={closeAttendanceModal}
        child={attendanceModal.child}
        onSave={handleAttendanceSave}
        onDelete={handleAttendanceDelete}
      />
    )}
  </div>
);
```

#### 2.2.7 تعديل loadAttendanceData function:

في الـ `loadAttendanceData` function، أضف reset للـ batch state:

```typescript
// Transform data to match our interface
const childrenWithAttendance = response.data.map((child: any) => ({
  _id: child._id,
  name: child.name,
  classId: child.class?._id || child.classId,
  className: child.className,
  isPresent: child.attendance
    ? child.attendance.status === "present"
    : undefined,
  attendanceId: child.attendance?._id,
  notes: child.attendance?.notes || "",
  hasAttendanceRecord: !!child.attendance,
  // Reset batch state when loading new data
  batchStatus: null,
  batchNotes: "",
}));
```

---

## 3. تطبيق نفس الـ Feature للخدام

المشكلة نفسها موجودة في تسجيل حضور الخدام، فلازم نطبق نفس الحل:

### 3.1 Backend - Servants Batch API

**File:** `backend/routes/servants-attendance.js`

أضف هذا الـ endpoint:

```javascript
// @route   POST /api/servants-attendance/batch
// @desc    Mark attendance for multiple servants at once
// @access  Protected (Admin or Service Leader)
router.post(
  "/batch",
  authMiddleware,
  adminOrServiceLeader,
  async (req, res) => {
    try {
      const { attendanceData, date } = req.body;

      console.log("\n" + "=".repeat(50));
      console.log("📦 SERVANTS BATCH ATTENDANCE API CALLED");
      console.log("📅 Date:", date);
      console.log("👥 Number of records:", attendanceData?.length || 0);
      console.log("👤 User:", req.user?.username || "UNKNOWN");
      console.log("=".repeat(50));

      // Validate input
      if (
        !attendanceData ||
        !Array.isArray(attendanceData) ||
        attendanceData.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "بيانات حضور الخدام مطلوبة ويجب أن تكون مصفوفة غير فارغة",
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          error: "التاريخ مطلوب",
        });
      }

      // التحقق من صحة التاريخ
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          error: "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD",
        });
      }

      const results = [];
      const errors = [];

      // Process each attendance record
      for (let i = 0; i < attendanceData.length; i++) {
        const { servantId, status, notes } = attendanceData[i];

        try {
          console.log(
            `📝 Processing servant ${i + 1}/${
              attendanceData.length
            }: ${servantId}`
          );

          if (!servantId || !status) {
            console.log(`❌ Missing data for record ${i + 1}`);
            errors.push({
              index: i,
              servantId,
              error: "معرف الخادم والحالة مطلوبان",
            });
            continue;
          }

          // التحقق من صحة الحالة
          const validStatuses = ["present", "absent", "excused"];
          if (!validStatuses.includes(status)) {
            errors.push({
              index: i,
              servantId,
              error: "حالة الحضور غير صحيحة",
            });
            continue;
          }

          // Find the servant
          const servant = await User.findById(servantId);
          if (!servant) {
            console.log(`❌ Servant not found: ${servantId}`);
            errors.push({
              index: i,
              servantId,
              error: "الخادم غير موجود",
            });
            continue;
          }

          // Check for existing record
          let existingRecord = await ServantAttendance.findOne({
            servantId: servantId,
            date: date,
          });

          let attendanceRecord;

          if (existingRecord) {
            // Update existing record
            console.log(
              `🔄 Updating existing record for servant: ${servant.name}`
            );
            existingRecord.status = status;
            existingRecord.notes = notes || "";
            existingRecord.markedBy = req.user.userId || req.user._id;
            attendanceRecord = await existingRecord.save();
          } else {
            // Create new record
            console.log(`🆕 Creating new record for servant: ${servant.name}`);
            attendanceRecord = new ServantAttendance({
              servantId: servantId,
              date: date,
              status: status,
              notes: notes || "",
              markedBy: req.user.userId || req.user._id,
            });

            try {
              await attendanceRecord.save();
            } catch (saveError) {
              // Handle duplicate key error
              if (saveError.code === 11000) {
                console.log(
                  `🔄 Duplicate key error for servant: ${servant.name}, finding existing record`
                );
                const duplicateRecord = await ServantAttendance.findOne({
                  servantId: servantId,
                  date: date,
                });

                if (duplicateRecord) {
                  duplicateRecord.status = status;
                  duplicateRecord.notes = notes || "";
                  duplicateRecord.markedBy = req.user.userId || req.user._id;
                  attendanceRecord = await duplicateRecord.save();
                } else {
                  throw saveError;
                }
              } else {
                throw saveError;
              }
            }
          }

          // ✨ SERVANTS FOLLOW-UP: Automatically remove servant from follow-up list if they attended
          // This is the equivalent of pastoral care for servants
          if (status === "present") {
            try {
              console.log(
                `🤝 Checking if servant ${servant.name} was in follow-up list...`
              );

              // The servants follow-up system is based on attendance records, not a separate model
              // When a servant attends, they automatically get removed from the follow-up list
              // because the follow-up logic checks for absent/missing records
              console.log(
                `✅ Servant ${servant.name} will be automatically removed from follow-up list (attended on ${date})`
              );
            } catch (followUpError) {
              console.error(
                `❌ Error processing follow-up for ${servant.name}:`,
                followUpError
              );
            }
          }

          // إضافة معلومات الخادم للاستجابة
          await attendanceRecord.populate("servantId", "name phone role");
          await attendanceRecord.populate("markedBy", "name");

          results.push({
            servantId,
            servantName: servant.name,
            status,
            action: existingRecord ? "updated" : "created",
            attendanceId: attendanceRecord._id,
          });

          console.log(`✅ Successfully processed ${servant.name}: ${status}`);
        } catch (recordError) {
          console.error(`❌ Error processing record ${i + 1}:`, recordError);
          errors.push({
            index: i,
            servantId,
            error: recordError.message,
          });
        }
      }

      console.log(`📊 Batch processing complete:`);
      console.log(`   ✅ Successful: ${results.length}`);
      console.log(`   ❌ Errors: ${errors.length}`);

      // Return results
      const response = {
        success: true,
        message: `تم تسجيل حضور ${results.length} خادم بنجاح`,
        data: {
          successful: results,
          errors: errors,
          summary: {
            total: attendanceData.length,
            successful: results.length,
            failed: errors.length,
          },
        },
      };

      if (errors.length > 0) {
        response.message += ` (${errors.length} خطأ)`;
      }

      res.json(response);
    } catch (error) {
      console.error("❌ Error in servants batch attendance:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ في تسجيل حضور الخدام الجماعي: " + error.message,
      });
    }
  }
);
```

### 3.2 Frontend - Servants API Function

**File:** `web/src/services/api.ts`

أضف هذه الـ function في `servantsAttendanceAPI` object:

```typescript
// Batch attendance for multiple servants
batchSave: async (attendanceData: Array<{
  servantId: string
  status: 'present' | 'absent' | 'excused'
  notes?: string
}>, date: string) => {
  try {
    console.log('Saving servants batch attendance:', attendanceData.length, 'records for date:', date)

    const response = await api.post('/servants-attendance/batch', {
      attendanceData,
      date
    })

    console.log('Servants batch attendance saved successfully:', response.data)
    return { success: true, data: response.data.data || response.data }
  } catch (error: any) {
    console.error('Error saving servants batch attendance:', error)
    return {
      success: false,
      error: error.response?.data?.error || 'حدث خطأ في تسجيل حضور الخدام الجماعي'
    }
  }
},
```

### 3.3 Frontend - Servants Page Component

**File:** `web/src/app/servants-attendance/page.tsx`

طبق نفس التعديلات اللي عملناها للأطفال بس مع تعديلات بسيطة:

#### 3.3.1 إضافة imports جديدة:

```typescript
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  DocumentCheckIcon, // ← جديد
} from "@heroicons/react/24/outline";
```

#### 3.3.2 تعديل Servant interface:

```typescript
interface Servant {
  _id: string;
  name: string;
  phone?: string;
  role?: string;
  isPresent?: boolean;
  attendanceId?: string;
  notes?: string;
  hasAttendanceRecord?: boolean;
  // Add batch editing state
  batchStatus?: "present" | "absent" | "excused" | null;
  batchNotes?: string;
}
```

#### 3.3.3 إضافة batch state variables:

```typescript
// Batch mode state
const [batchMode, setBatchMode] = useState(false);
const [batchSaving, setBatchSaving] = useState(false);
```

#### 3.3.4 إضافة batch functions (مشابهة للأطفال مع تعديلات للخدام):

```typescript
// Toggle servant's batch status
const toggleServantBatchStatus = (
  servantId: string,
  status: "present" | "absent" | "excused"
) => {
  setServants((prev) =>
    prev.map((servant) => {
      if (servant._id === servantId) {
        const newStatus = servant.batchStatus === status ? null : status;
        return {
          ...servant,
          batchStatus: newStatus,
        };
      }
      return servant;
    })
  );
};

// Update batch notes for a servant
const updateServantBatchNotes = (servantId: string, notes: string) => {
  setServants((prev) =>
    prev.map((servant) => {
      if (servant._id === servantId) {
        return {
          ...servant,
          batchNotes: notes,
        };
      }
      return servant;
    })
  );
};

// Save all batch changes
const saveBatchAttendance = async () => {
  if (!selectedDate) {
    toast.error("يرجى تحديد التاريخ");
    return;
  }

  // Get servants with batch changes
  const changedServants = servants.filter(
    (servant) =>
      servant.batchStatus !== null && servant.batchStatus !== undefined
  );

  if (changedServants.length === 0) {
    toast.error("لا توجد تغييرات لحفظها");
    return;
  }

  setBatchSaving(true);
  try {
    console.log(
      "Saving batch attendance for",
      changedServants.length,
      "servants"
    );

    const attendanceData = changedServants.map((servant) => ({
      servantId: servant._id,
      status: servant.batchStatus!,
      notes: servant.batchNotes || "",
    }));

    const response = await servantsAttendanceAPI.batchSave(
      attendanceData,
      selectedDate
    );

    if (response.success) {
      const { successful, errors, summary } = response.data;

      if (summary.successful > 0) {
        toast.success(`تم تسجيل حضور ${summary.successful} خادم بنجاح`);
      }

      if (summary.failed > 0) {
        toast.error(`فشل في تسجيل ${summary.failed} سجل`);
        console.error("Failed records:", errors);
      }

      // Reset batch mode and reload data
      setBatchMode(false);
      setServants((prev) =>
        prev.map((servant) => ({
          ...servant,
          batchStatus: null,
          batchNotes: "",
        }))
      );

      // Reload attendance data
      await loadAttendanceData();
    } else {
      throw new Error(response.error || "فشل في تسجيل حضور الخدام الجماعي");
    }
  } catch (error: any) {
    console.error("Error saving servants batch attendance:", error);
    toast.error(error.message || "حدث خطأ في تسجيل حضور الخدام الجماعي");
  } finally {
    setBatchSaving(false);
  }
};

// Mark all as present in batch mode
const markAllPresent = () => {
  setServants((prev) =>
    prev.map((servant) => ({
      ...servant,
      batchStatus: "present",
    }))
  );
};

// Mark all as absent in batch mode
const markAllAbsent = () => {
  setServants((prev) =>
    prev.map((servant) => ({
      ...servant,
      batchStatus: "absent",
    }))
  );
};
```

#### 3.3.5 إضافة batch UI components للخدام:

```typescript
// Render servant row for batch mode
const renderServantRowBatch = (servant: Servant) => {
  const currentStatus =
    servant.batchStatus !== null
      ? servant.batchStatus
      : servant.hasAttendanceRecord
      ? servant.isPresent
        ? "present"
        : "absent"
      : null;

  return (
    <div key={servant._id} className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{servant.name}</h3>
          <p className="text-sm text-gray-500">{servant.role}</p>
          {servant.phone && (
            <p className="text-xs text-gray-400">{servant.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleServantBatchStatus(servant._id, "present")}
            className={`p-2 rounded-full transition-colors ${
              currentStatus === "present"
                ? "bg-green-100 text-green-600 ring-2 ring-green-300"
                : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
            }`}
            title="حاضر"
          >
            <CheckCircleIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleServantBatchStatus(servant._id, "absent")}
            className={`p-2 rounded-full transition-colors ${
              currentStatus === "absent"
                ? "bg-red-100 text-red-600 ring-2 ring-red-300"
                : "bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500"
            }`}
            title="غائب"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleServantBatchStatus(servant._id, "excused")}
            className={`p-2 rounded-full transition-colors ${
              currentStatus === "excused"
                ? "bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300"
                : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
            }`}
            title="معذور"
          >
            <ExclamationTriangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <textarea
          value={servant.batchNotes || servant.notes || ""}
          onChange={(e) => updateServantBatchNotes(servant._id, e.target.value)}
          placeholder="ملاحظات..."
          className="w-full p-2 border border-gray-200 rounded-md text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  );
};
```

وطبعاً نفس الـ batch controls والـ JSX modifications زي الأطفال بالضبط.

---

## 4. Testing Instructions

### 4.1 Backend Testing - Children

1. تأكد إن الـ API يشتغل: `POST /api/attendance/batch`
2. جرب batch request مع multiple children
3. تأكد من handling للـ duplicate records
4. تأكد من الـ error handling
5. تأكد من الـ pastoral care integration

### 4.2 Backend Testing - Servants

1. تأكد إن الـ API يشتغل: `POST /api/servants-attendance/batch`
2. جرب batch request مع multiple servants
3. تأكد من handling للـ duplicate records
4. تأكد من الـ error handling
5. جرب الـ 3 statuses: present, absent, excused

### 4.3 Frontend Testing - Children

1. جرب الـ batch mode toggle
2. جرب تحديد حضور لعدة أطفال
3. جرب الـ "mark all present/absent" buttons
4. جرب الـ save functionality
5. تأكد من الـ error messages
6. تأكد من الـ data reload بعد الـ save

### 4.4 Frontend Testing - Servants

1. جرب الـ batch mode toggle للخدام
2. جرب تحديد حضور لعدة خدام
3. جرب الـ "mark all present/absent" buttons
4. جرب الـ "excused" status للخدام
5. جرب الـ save functionality
6. تأكد من الـ error messages
7. تأكد من الـ data reload بعد الـ save

### 4.5 Edge Cases

- تجربة batch save مع 0 changes (للأطفال والخدام)
- تجربة network errors
- تجربة invalid child/servant IDs
- تجربة duplicate dates
- تجربة mixed success/failure scenarios
- تجربة الـ role-based access control

---

## 5. UI/UX Notes

### للأطفال والخدام:

- الـ batch mode يخفي الـ individual modals
- الـ date/class selectors يتعطلوا في الـ batch mode
- الـ batch controls تظهر فقط في الـ batch mode
- الـ loading states واضحة للمستخدم
- الـ success/error messages مفيدة
- الـ UI responsive على الـ mobile

### خاص بالخدام:

- زر إضافي للـ "معذور" (excused) status
- عرض الـ role والـ phone للخادم
- نفس الـ UX patterns بس مع تعديلات للمحتوى

### Visual Indicators:

- **حاضر**: أخضر مع CheckCircleIcon
- **غائب**: أحمر مع XCircleIcon
- **معذور** (خدام فقط): أصفر مع ExclamationTriangleIcon
- **غير محدد**: رمادي مع hover effects

---

## 6. Performance Considerations

- الـ batch API يعالج الـ records في loop (يمكن تحسينه بالـ bulk operations لاحقاً)
- الـ frontend يعمل optimistic updates
- الـ error handling مفصل لكل record
- الـ pastoral care integration محفوظة

---

## 7. Security Notes

- نفس الـ authentication middleware
- نفس الـ role-based access control
- input validation على الـ backend
- proper error messages بدون sensitive data

---

هذا الـ implementation يحل المشكلة الأساسية ويخلي تسجيل الحضور أسرع وأسهل للمستخدمين.

---

## ملخص المميزات الجديدة

### للأطفال:

- ✅ تسجيل حضور متعدد في عملية واحدة
- ✅ أزرار سريعة: "تحديد الكل حاضر/غائب"
- ✅ إضافة ملاحظات لكل طفل
- ✅ عداد الأطفال المحددين
- ✅ حفظ بدون page refresh
- ✅ تكامل مع نظام الافتقاد (pastoral care)

### للخدام:

- ✅ تسجيل حضور متعدد في عملية واحدة
- ✅ أزرار سريعة: "تحديد الكل حاضر/غائب"
- ✅ حالة إضافية: "معذور" للخدام
- ✅ إضافة ملاحظات لكل خادم
- ✅ عداد الخدام المحددين
- ✅ حفظ بدون page refresh
- ✅ عرض معلومات الخادم (الدور، الهاتف)
- ✅ تكامل مع نظام متابعة الخدام (servants follow-up)

### مميزات عامة:

- 🚀 **سرعة**: تسجيل الفصل كله في ثواني
- 🎯 **سهولة**: UI بسيط ومفهوم
- 🛡️ **أمان**: نفس صلاحيات النظام الحالي
- 🔄 **مرونة**: يمكن التبديل بين الوضع العادي والجماعي
- 📱 **تجاوب**: يشتغل على الموبايل والكمبيوتر
- ⚡ **كفاءة**: معالجة الأخطاء لكل سجل منفرد

هذا الحل هيوفر وقت كبير للمستخدمين ويخلي عملية تسجيل الحضور أسرع وأكثر كفاءة! 🎉
