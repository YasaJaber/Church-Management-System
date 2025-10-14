'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TrendData {
  date: string
  present: number
  absent: number
  total: number
}

interface ClassComparisonData {
  className: string
  attendanceRate: number
  presentCount: number
  absentCount: number
}

// خط الاتجاه للحضور عبر الزمن
export function AttendanceTrendLineChart({ data }: { data: TrendData[] }) {
  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date)
      return date.toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })
    }),
    datasets: [
      {
        label: 'الحاضرون',
        data: data.map(item => item.present),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'الغائبون',
        data: data.map(item => item.absent),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 14 },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'منحنى الحضور والغياب عبر الوقت',
        font: { size: 18, weight: 'bold' as const },
        padding: 20,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  return (
    <div style={{ height: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// معدل الحضور اليومي (Area Chart)
export function DailyAttendanceRateChart({ data }: { data: TrendData[] }) {
  const chartData = {
    labels: data.map(item => {
      const date = new Date(item.date)
      return date.toLocaleDateString('ar-EG', { weekday: 'short', day: '2-digit' })
    }),
    datasets: [
      {
        label: 'معدل الحضور %',
        data: data.map(item => 
          item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
        ),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'معدل الحضور اليومي (%)',
        font: { size: 18, weight: 'bold' as const },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          label: function(context: any) {
            return `معدل الحضور: ${context.parsed.y}%`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value: any) {
            return value + '%'
          },
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
    },
  }

  return (
    <div style={{ height: '350px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// مقارنة الفصول (Bar Chart)
export function ClassComparisonBarChart({ data }: { data: ClassComparisonData[] }) {
  const chartData = {
    labels: data.map(item => item.className),
    datasets: [
      {
        label: 'معدل الحضور %',
        data: data.map(item => item.attendanceRate),
        backgroundColor: data.map(item => {
          if (item.attendanceRate >= 80) return 'rgba(34, 197, 94, 0.8)'
          if (item.attendanceRate >= 60) return 'rgba(251, 191, 36, 0.8)'
          return 'rgba(239, 68, 68, 0.8)'
        }),
        borderColor: data.map(item => {
          if (item.attendanceRate >= 80) return 'rgb(34, 197, 94)'
          if (item.attendanceRate >= 60) return 'rgb(251, 191, 36)'
          return 'rgb(239, 68, 68)'
        }),
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'مقارنة معدلات الحضور بين الفصول',
        font: { size: 18, weight: 'bold' as const },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          afterLabel: function(context: any) {
            const idx = context.dataIndex
            return [
              `الحاضرون: ${data[idx].presentCount}`,
              `الغائبون: ${data[idx].absentCount}`,
            ]
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value: any) {
            return value + '%'
          },
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
    },
  }

  return (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

// توزيع الحضور والغياب (Doughnut Chart)
export function AttendanceDistributionChart({ data }: { data: TrendData[] }) {
  const totalPresent = data.reduce((sum, item) => sum + item.present, 0)
  const totalAbsent = data.reduce((sum, item) => sum + item.absent, 0)

  const chartData = {
    labels: ['الحاضرون', 'الغائبون'],
    datasets: [
      {
        data: [totalPresent, totalAbsent],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 14 },
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'توزيع الحضور والغياب الإجمالي',
        font: { size: 18, weight: 'bold' as const },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const total = totalPresent + totalAbsent
            const value = context.parsed
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `${context.label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <div style={{ height: '350px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  )
}

// مقارنة أسبوعية
export function WeeklyComparisonChart({ data }: { data: TrendData[] }) {
  // تجميع البيانات حسب الأسبوع
  const weeks: { [key: string]: { present: number; absent: number; count: number } } = {}
  
  data.forEach(item => {
    const date = new Date(item.date)
    const weekNumber = Math.ceil(date.getDate() / 7)
    const monthName = date.toLocaleDateString('ar-EG', { month: 'short' })
    const weekKey = `${monthName} - أسبوع ${weekNumber}`
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { present: 0, absent: 0, count: 0 }
    }
    
    weeks[weekKey].present += item.present
    weeks[weekKey].absent += item.absent
    weeks[weekKey].count += 1
  })

  const weekLabels = Object.keys(weeks)
  const avgPresent = weekLabels.map(key => Math.round(weeks[key].present / weeks[key].count))
  const avgAbsent = weekLabels.map(key => Math.round(weeks[key].absent / weeks[key].count))

  const chartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'متوسط الحاضرون',
        data: avgPresent,
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: 'متوسط الغائبون',
        data: avgAbsent,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 14 },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'مقارنة أسبوعية للحضور والغياب',
        font: { size: 18, weight: 'bold' as const },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 12 },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
    },
  }

  return (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
