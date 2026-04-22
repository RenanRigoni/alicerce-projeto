interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-[var(--color-warm-white)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 ${className}`}
      style={{ boxShadow: '0 2px 16px rgba(44, 32, 24, 0.06)' }}
    >
      {children}
    </div>
  )
}
