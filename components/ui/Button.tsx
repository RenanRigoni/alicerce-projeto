interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = [
    'inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'active:scale-[0.98] select-none',
  ].join(' ')

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-sm gap-2',
  }

  const variants = {
    primary: [
      'bg-[var(--color-rose-main)] hover:bg-[var(--color-rose-deep)]',
      'text-white shadow-sm hover:shadow',
      'focus-visible:ring-[var(--color-rose-main)]',
    ].join(' '),
    secondary: [
      'bg-[var(--color-rose-blush)] hover:bg-[var(--color-rose-muted)]/30',
      'text-[var(--color-rose-deep)] border border-[var(--color-rose-muted)]',
      'focus-visible:ring-[var(--color-rose-main)]',
    ].join(' '),
    ghost: [
      'hover:bg-[var(--color-border-soft)] text-[var(--color-ink-mid)]',
      'focus-visible:ring-[var(--color-border)]',
    ].join(' '),
    danger: [
      'bg-red-50 hover:bg-red-100 text-red-600',
      'border border-red-200 focus-visible:ring-red-400',
    ].join(' '),
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
