import { statisticsAPI, attendanceAPI } from '../services/api';

// دالة محسّنة لجلب بيانات الحضور للتصدير
export const fetchAttendanceDataForExport = async (attendanceAPI, selectedClass, selectedPeriod, selectedClassName = null) => {
  try {
    console.log("🔍 جلب بيانات الحضور للتصدير...");
    console.log("📋 الفصل المختار:", selectedClass);
    console.log("📚 اسم الفصل المختار:", selectedClassName);
    console.log("📅 الفترة المختارة:", selectedPeriod);
    
    const exportData = [];
    
    // استخدم export API مباشرة للحصول على جميع البيانات
    try {
      console.log(`📅 جلب جميع بيانات الحضور للفصل ${selectedClass || 'جميع الفصول'}`);
      
      let response;
      if (selectedClass && selectedClass !== "") {
        // للفصل المحدد، استخدم export API
        console.log("🔄 استخدام export API للفصل المحدد...");
        response = await statisticsAPI.exportClassAttendance(selectedClass);
      } else {
        // لجميع الفصول، استخدم export API
        console.log("🔄 استخدام export API لجميع الفصول...");
        response = await statisticsAPI.exportAllClassesAttendance();
      }
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log(`✅ تم جلب ${response.data.length} سجل إجمالي من export API`);
        
        // معالجة البيانات من export API
        const records = response.data;
        
        records.forEach(record => {
          // البيانات من export API تأتي بالشكل:
          // { childName, className, date, status, notes }
          const childName = record.childName || "غير محدد";
          const className = record.className || "غير محدد";
          const date = record.date;
          const status = record.status || "absent";
          const notes = record.notes || "";
          
          console.log(`👤 إضافة سجل: ${childName} - ${className} - ${date}`);
          
          exportData.push({
            childName: childName,
            className: className,
            date: typeof date === 'string' ? date : (date ? date.toString() : "غير محدد"),
            status: status,
            notes: notes
          });
        });
        
        // فلتر إضافي للتأكد من الفصل المختار (في حالة وجود بيانات مختلطة)
        if (selectedClass && selectedClass !== "" && selectedClassName && selectedClassName !== "جميع الفصول") {
          const originalLength = exportData.length;
          const filteredData = exportData.filter(record => record.className === selectedClassName);
          console.log(`🔍 بعد فلتر الفصل: ${filteredData.length} سجل من أصل ${originalLength}`);
          exportData = filteredData;
        }
      } else {
        console.log("❌ لا توجد بيانات من export API، محاولة طريقة بديلة...");
        
        // طريقة بديلة: جلب البيانات من جميع الأيام (ليس الجمعة فقط)
        const endDate = new Date();
        const startDate = new Date();
        
        const periodDays = {
          "week": 28,
          "month": 56,
          "quarter": 84
        };
        
        startDate.setDate(endDate.getDate() - (periodDays[selectedPeriod] || 28));
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          try {
            console.log(`📅 جلب بيانات تاريخ ${dateString} للفصل ${selectedClass || 'جميع الفصول'}`);
            const dayResponse = await attendanceAPI.getAttendanceByDate(dateString, selectedClass);
            
            if (dayResponse.success && dayResponse.data && Array.isArray(dayResponse.data)) {
              console.log(`✅ تم جلب ${dayResponse.data.length} سجل لتاريخ ${dateString}`);
              
              dayResponse.data.forEach(record => {
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
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    } catch (apiError) {
      console.error("❌ خطأ في استدعاء export API:", apiError);
      return [];
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
          const filteredData = exportData.filter(record => record.className === selectedClassName);
          console.log(`🔍 تم تصفية البيانات: ${filteredData.length} من أصل ${originalLength}`);
          exportData = filteredData;
        }
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
