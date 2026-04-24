import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', style, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-[var(--color-warm-white)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 ${className}`}
      style={{ boxShadow: '0 2px 16px rgba(44, 32, 24, 0.06)', ...style }}
    >
      {children}
    </div>
  )
}