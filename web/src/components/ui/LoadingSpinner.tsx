interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'text-blue-600',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} ${color} animate-spin`}
        style={{
          background: `conic-gradient(from 0deg, transparent, currentColor)`,
          borderRadius: '50%',
        }}
      >
        <div 
          className="w-full h-full bg-white rounded-full"
          style={{ 
            margin: '2px',
            width: 'calc(100% - 4px)',
            height: 'calc(100% - 4px)' 
          }}
        />
      </div>
    </div>
  )
}
