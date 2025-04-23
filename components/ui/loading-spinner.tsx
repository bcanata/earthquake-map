import React from 'react'

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export function LoadingSpinner({ size = "medium", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    medium: "w-8 h-8 border-[3px]",
    large: "w-12 h-12 border-4"
  }

  return (
    <div className={`${sizeClasses[size]} border-t-transparent border-primary rounded-full animate-spin ${className}`}></div>
  )
}

export function LoadingState({
  text = "Loading...",
  fullScreen = false
}: {
  text?: string
  fullScreen?: boolean
}) {
  const containerClasses = fullScreen
    ? "fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center"
    : "w-full h-full min-h-[200px] flex flex-col items-center justify-center"

  return (
    <div className={containerClasses}>
      <LoadingSpinner size="large" />
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  )
} 