import React from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  onClick: () => void
  isLoading?: boolean
  className?: string
}

export function RefreshButton({ onClick, isLoading = false, className = '' }: RefreshButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-1 ${className}`}
      title="Deprem verilerini yenile"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      <span>{isLoading ? 'Yenileniyor...' : 'Yenile'}</span>
    </Button>
  )
} 