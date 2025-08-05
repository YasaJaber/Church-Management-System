import React from 'react'

interface ChartData {
  label: string
  value: number
  percentage: number
  color: string
}

interface SimpleBarChartProps {
  data: ChartData[]
  title: string
  height?: number
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  title, 
  height = 200 
}) => {
  const maxValue = Math.max(...data.map(item => item.value))
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-right">{title}</h3>
      <div className="flex items-end justify-between gap-4 min-h-[200px]">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="text-sm font-medium text-gray-700 mb-2">{item.value}</div>
            <div 
              className={`w-full rounded-t-lg min-h-[10px] flex items-end justify-center transition-all duration-300 ${item.color}`}
              style={{ height: `${(item.value / maxValue) * (height - 60)}px` }}
            >
            </div>
            <div className="text-xs text-gray-600 mt-2 text-center">
              {item.label}
            </div>
            <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  label: string
  value: number
  total: number
  color?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  label, 
  value, 
  total, 
  color = 'bg-blue-500' 
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-right text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color,
  trend 
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="text-center">
        <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
          <span className="text-white text-xl">{icon}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
        {trend && (
          <div className={`text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  )
}

interface AttendanceCalendarProps {
  dates: string[]
  attendanceData: { [key: string]: { present: number; total: number } }
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ 
  dates, 
  attendanceData 
}) => {
  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500'
    if (rate >= 80) return 'bg-green-400'
    if (rate >= 70) return 'bg-yellow-400'
    if (rate >= 60) return 'bg-orange-400'
    return 'bg-red-400'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-right">خريطة الحضور الشهرية</h3>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date, index) => {
          const data = attendanceData[date]
          const rate = data ? (data.present / data.total) * 100 : 0
          const colorClass = getAttendanceColor(rate)
          
          return (
            <div
              key={index}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs text-white ${colorClass}`}
              title={`${date}: ${data?.present || 0}/${data?.total || 0} (${rate.toFixed(1)}%)`}
            >
              {new Date(date).getDate()}
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-400 rounded"></div>
          <span>&lt;60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-400 rounded"></div>
          <span>60-70%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
          <span>70-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-400 rounded"></div>
          <span>80-90%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>&gt;90%</span>
        </div>
      </div>
    </div>
  )
}
