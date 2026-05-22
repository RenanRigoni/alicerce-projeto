interface BadgeProps {
  children: React.ReactNode
  color?: 'rose' | 'green' | 'blue' | 'yellow' | 'gray'
}

const colors = {
  rose:   'bg-[var(--color-rose-blush)] text-[var(--color-rose-deep)] border border-[var(--color-rose-muted)]',
  green:  'bg-[var(--color-sage-light)] text-[var(--color-sage-deep)] border border-[var(--color-sage-soft)]',
  blue:   'bg-[var(--color-info-bg)] text-[var(--color-info-text)] border border-[var(--color-info-border)]',
  yellow: 'bg-[var(--color-amber-light)] text-[var(--color-amber-mid)] border border-[var(--color-amber-border)]',
  gray:   'bg-[var(--color-border-soft)] text-[var(--color-ink-mid)] border border-[var(--color-border)]',
}

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}
