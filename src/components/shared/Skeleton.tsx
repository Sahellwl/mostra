import type { CSSProperties } from 'react'

interface Props {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className = '', style }: Props) {
  return <div className={`animate-pulse rounded-lg bg-[#1a1a1a] ${className}`} style={style} />
}
