import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

// دالة لإنشاء HTML مع دعم كامل للعربية
const createHTMLReport = (attendanceData, selectedClass, selectedPeriod) => {
  
  // حساب الإحصائيات
  const totalRecords = attendanceData.length;
  const presentCount = attendanceData.filter(record => record.status === "present").length;
  const absentCount = totalRecords - presentCount;
  const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

  // معلومات الفترة
  const periodMap = {
    "week": "آخر 4 جمعات",
    "month": "آخر 8 جمعات", 
    "quarter": "آخر 12 جمعة"
  };

  // تنسيق التاريخ
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    });
  };

  // إنشاء صفوف الجدول
  const tableRows = attendanceData.map((record, index) => `
    <tr style="${index % 2 === 1 ? 'background-color: #f8f9fa;' : ''}">
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-family: 'Arial Unicode MS', Arial, sans-serif;">${record.childName || "غير محدد"}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-family: 'Arial Unicode MS', Arial, sans-serif;">${record.className || "غير محدد"}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${formatDate(record.date)}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd; color: ${record.status === 'present' ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
        ${record.status === "present" ? "✓ حاضر" : "✗ غائب"}
      </td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-family: 'Arial Unicode MS', Arial, sans-serif;">${record.notes || "-"}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تقرير الحضور</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Noto Sans Arabic', 'Arial Unicode MS', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          direction: rtl;
          padding: 20px;
          background-color: #fff;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #3498db;
          padding-bottom: 20px;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          font-size: 16px;
          color: #7f8c8d;
          margin-bottom: 5px;
        }

        .info-section {
          background-color: #ecf0f1;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 25px;
          text-align: center;
        }

        .info-item {
          display: inline-block;
          margin: 0 15px;
          font-size: 14px;
          color: #2c3e50;
        }

        .table-container {
          margin-bottom: 30px;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background-color: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        th {
          background-color: #3498db;
          color: white;
          padding: 12px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid #2980b9;
        }

        td {
          padding: 10px 8px;
          border: 1px solid #ddd;
          font-size: 13px;
        }

        .stats-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 20px;
        }

        .stats-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 15px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .stat-item {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #ecf0f1;
          font-size: 12px;
          color: #7f8c8d;
        }

        .church-logo {
          font-size: 24px;
          margin-bottom: 10px;
        }

        @media print {
          body {
            padding: 10px;
          }
          
          .header {
            margin-bottom: 20px;
          }
          
          .stats-section {
            background: #f8f9fa !important;
            color: #333 !important;
            border: 2px solid #3498db;
          }
          
          .stat-item {
            background-color: #fff !important;
            border: 1px solid #ddd;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="church-logo">⛪</div>
        <h1 class="title">تقرير الحضور - كنيسة الشهيد العظيم مارجرجس بأولاد علي</h1>
        <p class="subtitle">${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}</p>
      </div>

      <div class="info-section">
        <div class="info-item">
          <strong>الفصل:</strong> ${selectedClass || "جميع الفصول"}
        </div>
        <div class="info-item">
          <strong>الفترة:</strong> ${periodMap[selectedPeriod] || "الكل"}
        </div>
        <div class="info-item">
          <strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString("ar-EG", { 
            year: "numeric", 
            month: "long", 
            day: "numeric",
            weekday: "long"
          })}
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th style="width: 150px;">اسم الطفل</th>
              <th style="width: 120px;">الفصل</th>
              <th style="width: 150px;">التاريخ</th>
              <th style="width: 80px;">الحالة</th>
              <th style="width: 200px;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <div class="stats-section">
        <h2 class="stats-title">ملخص الإحصائيات</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${totalRecords}</div>
            <div class="stat-label">إجمالي السجلات</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${presentCount}</div>
            <div class="stat-label">عدد الحاضرين</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${absentCount}</div>
            <div class="stat-label">عدد الغائبين</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${attendanceRate}%</div>
            <div class="stat-label">نسبة الحضور</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>تم إنشاء هذا التقرير بواسطة نظام إدارة كنيسة الشهيد العظيم مارجرجس بأولاد علي</p>
        <p>التاريخ والوقت: ${new Date().toLocaleString("ar-EG")}</p>
      </div>
    </body>
    </html>
  `;

  return html;
};

// الدالة الرئيسية الجديدة لتصدير PDF من HTML
export const exportAttendanceToPDF = async (attendanceData, selectedClass, selectedPeriod) => {
  try {
    console.log("🔄 بدء تصدير PDF باستخدام HTML...");

    if (!attendanceData || attendanceData.length === 0) {
      console.log("⚠️ لا توجد بيانات للتصدير");
      return {
        success: false,
        message: "لا توجد بيانات حضور للتصدير"
      };
    }

    // إنشاء HTML للتقرير
    const htmlContent = createHTMLReport(attendanceData, selectedClass, selectedPeriod);

    console.log("📄 تحويل HTML إلى PDF...");

    // تحويل HTML إلى PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20
      }
    });

    // إنشاء اسم ملف جديد
    const fileName = `تقرير_الحضور_${new Date().toLocaleDateString("ar-EG", { month: "long", year: "numeric" }).replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${fileName}`;

    // نقل الملف إلى المجلد المطلوب
    await FileSystem.moveAsync({
      from: uri,
      to: newPath
    });

    console.log("📤 مشاركة ملف PDF...");

    // مشاركة الملف
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: "مشاركة تقرير الحضور",
        UTI: "com.adobe.pdf"
      });
    }

    console.log("✅ تم تصدير PDF بنجاح باستخدام HTML!");

    return {
      success: true,
      message: "تم تصدير التقرير بنجاح مع دعم كامل للعربية",
      fileUri: newPath
    };

  } catch (error) {
    console.error("❌ خطأ في تصدير PDF من HTML:", error);
    return {
      success: false,
      message: "حدث خطأ أثناء تصدير التقرير: " + error.message
    };
  }
};

// باقي الدوال كما هي
export const prepareAttendanceDataForExport = (statisticsData) => {
  try {
    const exportData = [];
    
    if (statisticsData?.attendance?.daily) {
      statisticsData.attendance.daily.forEach(dayData => {
        if (dayData.details && Array.isArray(dayData.details)) {
          dayData.details.forEach(record => {
            exportData.push({
              childName: record.childName || "غير محدد",
              className: record.className || "غير محدد",
              date: dayData.date,
              status: record.status || "absent",
              notes: record.notes || ""
            });
          });
        }
      });
    }
    
    return exportData;
  } catch (error) {
    console.error("خطأ في تحضير بيانات التصدير:", error);
    return [];
  }
};

export const fetchAttendanceDataForExport = async (attendanceAPI, selectedClass, selectedPeriod, selectedClassName = null) => {
  try {
    console.log("🔍 جلب بيانات الحضور للتصدير...");
    console.log("📋 الفصل المختار:", selectedClass);
    console.log("📚 اسم الفصل المختار:", selectedClassName);
    console.log("📅 الفترة المختارة:", selectedPeriod);
    
    const endDate = new Date();
    const startDate = new Date();
    
    const periodDays = {
      "week": 28,
      "month": 56,
      "quarter": 84
    };
    
    startDate.setDate(endDate.getDate() - (periodDays[selectedPeriod] || 28));
    
    const exportData = [];
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 5) { // يوم الجمعة
        const dateString = currentDate.toISOString().split('T')[0];
        
        try {
          console.log(`📅 جلب بيانات تاريخ ${dateString} للفصل ${selectedClass || 'جميع الفصول'}`);
          const response = await attendanceAPI.getAttendanceByDate(dateString, selectedClass);
          
          if (response.success && response.data && Array.isArray(response.data)) {
            console.log(`✅ تم جلب ${response.data.length} سجل لتاريخ ${dateString}`);
            
            // فلتر إضافي للتأكد من الفصل المختار (في حالة وجود مشكلة في الـ backend)
            let filteredData = response.data;
            if (selectedClass && selectedClass !== "") {
              filteredData = response.data.filter(record => {
                const recordClassId = record.child?.class?._id || record.classId;
                const recordClassName = record.child?.class?.name || record.className;
                
                // فلتر بحسب ID أولاً، ثم بحسب اسم الفصل كاحتياط
                const matchesById = recordClassId === selectedClass;
                const matchesByName = selectedClassName && recordClassName === selectedClassName;
                
                return matchesById || matchesByName;
              });
              console.log(`🔍 بعد فلتر الفصل: ${filteredData.length} سجل من أصل ${response.data.length}`);
            }
            
            filteredData.forEach(record => {
              const childName = record.child?.name || record.childName || "غير محدد";
              const className = record.child?.class?.name || record.className || "غير محدد";
              
              console.log(`👤 إضافة سجل: ${childName} - ${className}`);
              
              exportData.push({
                childName: childName,
                className: className,
                date: dateString,
                status: record.status || "absent",
                notes: record.notes || ""
              });
            });
          } else {
            console.log(`❌ لا توجد بيانات لتاريخ ${dateString}`);
          }
        } catch (apiError) {
          console.log(`تعذر جلب بيانات ${dateString}:`, apiError.message);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`✅ تم جلب ${exportData.length} سجل حضور إجمالي`);
    
    // إضافة تسجيل للتحقق من تنوع الفصول
    if (exportData.length > 0) {
      const uniqueClasses = [...new Set(exportData.map(record => record.className))];
      console.log(`📊 الفصول الموجودة في البيانات: ${uniqueClasses.join(', ')}`);
      
      if (selectedClass && selectedClass !== "" && uniqueClasses.length > 1) {
        console.warn(`⚠️ تحذير: يوجد أكثر من فصل في البيانات رغم اختيار فصل واحد!`);
        console.warn(`🔍 الفصل المختار: ${selectedClass}`);
        console.warn(`📚 الفصول الموجودة: ${uniqueClasses.join(', ')}`);
        
        // فلتر نهائي للبيانات للتأكد من عرض الفصل المختار فقط
        if (selectedClassName && selectedClassName !== "جميع الفصول") {
          console.log("🧹 تطبيق فلتر نهائي للبيانات حسب اسم الفصل...");
          const originalLength = exportData.length;
          exportData = exportData.filter(record => record.className === selectedClassName);
          console.log(`🔍 تم تصفية البيانات: ${exportData.length} من أصل ${originalLength}`);
        }
      }
    }
    
    // فلتر نهائي إضافي للتأكد من تنظيف البيانات
    if (selectedClass && selectedClass !== "" && selectedClassName && selectedClassName !== "جميع الفصول") {
      const finalFilteredData = exportData.filter(record => record.className === selectedClassName);
      if (finalFilteredData.length !== exportData.length) {
        console.log(`🧹 تطبيق فلتر نهائي إضافي: ${finalFilteredData.length} من أصل ${exportData.length}`);
        exportData = finalFilteredData;
      }
    }
    
    console.log(`📊 البيانات النهائية للتصدير: ${exportData.length} سجل`);
    
    // تحقق نهائي من البيانات
    if (exportData.length > 0 && selectedClass && selectedClass !== "") {
      const finalUniqueClasses = [...new Set(exportData.map(record => record.className))];
      if (finalUniqueClasses.length > 1) {
        console.error(`❌ خطأ: ما زالت البيانات تحتوي على فصول متعددة: ${finalUniqueClasses.join(', ')}`);
        console.error(`❌ الفصل المطلوب: ${selectedClassName || selectedClass}`);
      } else {
        console.log(`✅ تأكيد: جميع البيانات تخص فصل واحد: ${finalUniqueClasses[0]}`);
      }
    }
    
    return exportData;
    
  } catch (error) {
    console.error("❌ خطأ في جلب بيانات الحضور للتصدير:", error);
    
    return [];
  }
};
