import React from 'react'

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-md ${className}`} />
}
