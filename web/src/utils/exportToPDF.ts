export interface AttendanceRecord {
  date: string
  studentName: string
  status: 'present' | 'absent' | 'late'
  notes?: string
}

export interface AttendanceReportData {
  className: string
  fromDate: string
  toDate: string
  records: AttendanceRecord[]
}

// Group records by date
const groupRecordsByDate = (records: AttendanceRecord[]) => {
  const grouped: { [date: string]: AttendanceRecord[] } = {}
  
  records.forEach(record => {
    if (!grouped[record.date]) {
      grouped[record.date] = []
    }
    grouped[record.date].push(record)
  })
  
  return grouped
}

// Calculate stats for a specific date
const calculateDayStats = (records: AttendanceRecord[]) => {
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length
  const total = records.length
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0
  
  return { present, absent, late, total, attendanceRate }
}

// Generate a visual progress bar
const generateProgressBar = (percentage: number, color: string) => {
  return `
    <div style="background-color: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden; position: relative;">
      <div style="
        background: ${color};
        width: ${percentage}%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: width 0.3s ease;
      ">
        <span style="color: white; font-size: 11px; font-weight: bold;">${percentage}%</span>
      </div>
    </div>
  `
}

// Generate mini chart using CSS
const generateMiniChart = (present: number, absent: number, late: number) => {
  const total = present + absent + late
  if (total === 0) return ''
  
  const presentPercent = (present / total) * 100
  const absentPercent = (absent / total) * 100
  const latePercent = (late / total) * 100
  
  return `
    <div style="display: flex; height: 15px; border-radius: 8px; overflow: hidden; margin: 10px 0;">
      ${present > 0 ? `<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); width: ${presentPercent}%; height: 100%;"></div>` : ''}
      ${absent > 0 ? `<div style="background: linear-gradient(135deg, #e74c3c, #c0392b); width: ${absentPercent}%; height: 100%;"></div>` : ''}
      ${late > 0 ? `<div style="background: linear-gradient(135deg, #f39c12, #e67e22); width: ${latePercent}%; height: 100%;"></div>` : ''}
    </div>
    <div style="display: flex; justify-content: space-around; font-size: 10px; color: #7f8c8d; margin-top: 5px;">
      <span>🟢 ${present} (${Math.round(presentPercent)}%)</span>
      <span>🔴 ${absent} (${Math.round(absentPercent)}%)</span>
      <span>🟡 ${late} (${Math.round(latePercent)}%)</span>
    </div>
  `
}

export const generateAttendancePDF = async (data: AttendanceReportData) => {
  // Dynamic import of html2pdf to avoid SSR issues
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in browser environment')
  }
  
  const html2pdfModule = await import('html2pdf.js')
  const html2pdf = html2pdfModule.default
  
  const groupedByDate = groupRecordsByDate(data.records)
  const dates = Object.keys(groupedByDate).sort()
  
  // Calculate overall stats
  const totalPresent = data.records.filter(r => r.status === 'present').length
  const totalAbsent = data.records.filter(r => r.status === 'absent').length
  const totalLate = data.records.filter(r => r.status === 'late').length
  const totalRecords = data.records.length
  const overallAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          margin: 15mm;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          color: #2c3e50;
          line-height: 1.6;
        }
        
        /* Header Section */
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 25px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .header h1 {
          font-size: 32px;
          margin-bottom: 8px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.95;
        }
        
        /* Info Cards */
        .info-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .info-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          text-align: center;
          border-top: 4px solid;
        }
        
        .info-card.primary {
          border-top-color: #3498db;
        }
        
        .info-card.success {
          border-top-color: #27ae60;
        }
        
        .info-card.danger {
          border-top-color: #e74c3c;
        }
        
        .info-card .label {
          font-size: 13px;
          color: #7f8c8d;
          margin-bottom: 8px;
        }
        
        .info-card .value {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
        }
        
        /* Overall Stats Section */
        .overall-stats {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        
        .overall-stats h2 {
          text-align: center;
          font-size: 22px;
          margin-bottom: 20px;
          color: #2c3e50;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-box {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .stat-box .number {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .stat-box .label {
          font-size: 12px;
          color: #7f8c8d;
        }
        
        .stat-box.green .number {
          color: #27ae60;
        }
        
        .stat-box.red .number {
          color: #e74c3c;
        }
        
        .stat-box.orange .number {
          color: #f39c12;
        }
        
        .stat-box.blue .number {
          color: #3498db;
        }
        
        /* Day Section */
        .day-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        
        .day-header {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .day-header h3 {
          font-size: 18px;
          font-weight: bold;
        }
        
        .day-badge {
          background: rgba(255,255,255,0.2);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 13px;
        }
        
        .day-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          padding: 20px;
          background: #f8f9fa;
        }
        
        .day-stat-item {
          text-align: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .day-stat-item .icon {
          font-size: 24px;
          margin-bottom: 5px;
        }
        
        .day-stat-item .number {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .day-stat-item .label {
          font-size: 11px;
          color: #7f8c8d;
        }
        
        .day-stat-item.present .number {
          color: #27ae60;
        }
        
        .day-stat-item.absent .number {
          color: #e74c3c;
        }
        
        .day-stat-item.late .number {
          color: #f39c12;
        }
        
        /* Table */
        .day-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .day-table thead {
          background: #ecf0f1;
        }
        
        .day-table th {
          padding: 12px;
          text-align: center;
          font-size: 13px;
          font-weight: bold;
          color: #2c3e50;
          border-bottom: 2px solid #bdc3c7;
        }
        
        .day-table td {
          padding: 12px;
          text-align: center;
          font-size: 13px;
          border-bottom: 1px solid #ecf0f1;
        }
        
        .day-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 12px;
        }
        
        .status-badge.present {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .status-badge.absent {
          background: linear-gradient(135deg, #f8d7da, #f5c6cb);
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .status-badge.late {
          background: linear-gradient(135deg, #fff3cd, #ffeeba);
          color: #856404;
          border: 1px solid #ffeeba;
        }
        
        /* Progress Bars */
        .progress-section {
          padding: 20px;
          background: white;
        }
        
        .progress-item {
          margin-bottom: 15px;
        }
        
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
          color: #2c3e50;
        }
        
        .progress-bar {
          background: #e0e0e0;
          border-radius: 10px;
          height: 20px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .progress-fill {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: bold;
          transition: width 0.3s ease;
        }
        
        .progress-fill.green {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
        }
        
        .progress-fill.red {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }
        
        .progress-fill.orange {
          background: linear-gradient(135deg, #f39c12, #e67e22);
        }
        
        /* Footer */
        .footer {
          margin-top: 40px;
          padding: 20px;
          text-align: center;
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          border-radius: 10px;
          font-size: 12px;
        }
        
        .footer p {
          margin: 5px 0;
        }
        
        .no-records {
          text-align: center;
          padding: 60px 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 10px;
          margin: 30px 0;
        }
        
        .no-records .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .no-records p {
          font-size: 20px;
          color: #7f8c8d;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>📊 تقرير حضور وغياب الطلاب</h1>
        <p>كنيسة الشهيد مار جرجس - بأولاد علي</p>
      </div>
      
      <!-- Info Cards -->
      <div class="info-cards">
        <div class="info-card primary">
          <div class="label">الفصل</div>
          <div class="value">${data.className}</div>
        </div>
        <div class="info-card success">
          <div class="label">من تاريخ</div>
          <div class="value">${new Date(data.fromDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</div>
        </div>
        <div class="info-card danger">
          <div class="label">إلى تاريخ</div>
          <div class="value">${new Date(data.toDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</div>
        </div>
      </div>

      ${data.records && data.records.length > 0 ? `
        <!-- Overall Statistics -->
        <div class="overall-stats">
          <h2>📈 الإحصائيات الإجمالية</h2>
          
          <div class="stats-grid">
            <div class="stat-box blue">
              <div class="number">${totalRecords}</div>
              <div class="label">إجمالي السجلات</div>
            </div>
            <div class="stat-box green">
              <div class="number">${totalPresent}</div>
              <div class="label">الحضور</div>
            </div>
            <div class="stat-box red">
              <div class="number">${totalAbsent}</div>
              <div class="label">الغياب</div>
            </div>
            <div class="stat-box orange">
              <div class="number">${totalLate}</div>
              <div class="label">التأخير</div>
            </div>
          </div>
          
          <!-- Overall Progress Bars -->
          <div class="progress-section">
            <div class="progress-item">
              <div class="progress-label">
                <span><strong>نسبة الحضور الإجمالية</strong></span>
                <span><strong>${overallAttendanceRate}%</strong></span>
              </div>
              ${generateProgressBar(overallAttendanceRate, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}
            </div>
            
            ${generateMiniChart(totalPresent, totalAbsent, totalLate)}
          </div>
        </div>

        <!-- Day by Day Breakdown -->
        ${dates.map((date, index) => {
          const dayRecords = groupedByDate[date]
          const dayStats = calculateDayStats(dayRecords)
          const dateObj = new Date(date)
          const formattedDate = dateObj.toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          
          return `
            <div class="day-section">
              <!-- Day Header -->
              <div class="day-header">
                <h3>📅 ${formattedDate}</h3>
                <div class="day-badge">اليوم ${index + 1} من ${dates.length}</div>
              </div>
              
              <!-- Day Statistics -->
              <div class="day-stats">
                <div class="day-stat-item present">
                  <div class="icon">🟢</div>
                  <div class="number">${dayStats.present}</div>
                  <div class="label">حاضر</div>
                </div>
                <div class="day-stat-item absent">
                  <div class="icon">🔴</div>
                  <div class="number">${dayStats.absent}</div>
                  <div class="label">غائب</div>
                </div>
                <div class="day-stat-item late">
                  <div class="icon">🟡</div>
                  <div class="number">${dayStats.late}</div>
                  <div class="label">متأخر</div>
                </div>
              </div>
              
              <!-- Day Progress -->
              <div class="progress-section">
                <div class="progress-item">
                  <div class="progress-label">
                    <span>نسبة الحضور</span>
                    <span><strong>${dayStats.attendanceRate}%</strong></span>
                  </div>
                  ${generateProgressBar(dayStats.attendanceRate, 'linear-gradient(135deg, #27ae60, #2ecc71)')}
                </div>
                
                ${generateMiniChart(dayStats.present, dayStats.absent, dayStats.late)}
              </div>
              
              <!-- Records Table -->
              <table class="day-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الطالب</th>
                    <th>الحالة</th>
                    <th>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayRecords.map((record, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><strong>${record.studentName}</strong></td>
                      <td>
                        <span class="status-badge ${record.status}">
                          ${record.status === 'absent' ? '🔴 غائب' : record.status === 'late' ? '🟡 متأخر' : '🟢 حاضر'}
                        </span>
                      </td>
                      <td>${record.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `
        }).join('')}
      ` : `
        <div class="no-records">
          <div class="icon">📋</div>
          <p>لا توجد سجلات في الفترة المحددة</p>
        </div>
      `}

      <!-- Footer -->
      <div class="footer">
        <p><strong>تم إنشاء هذا التقرير بتاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        <p>نظام إدارة كنيسة الشهيد مار جرجس - بأولاد علي</p>
        <p style="opacity: 0.8; margin-top: 10px;">🙏 صلواتكم</p>
      </div>
    </body>
    </html>
  `

  const options = {
    margin: 10,
    filename: `attendance-report-${data.className.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      letterRendering: true,
      logging: false,
      windowWidth: 1200
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  } as any

  try {
    await html2pdf().from(htmlContent).set(options).save()
    return { success: true, message: 'تم تصدير PDF بنجاح' }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('فشل في إنشاء ملف PDF')
  }
}
