function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className ?? ''}`}
      style={{ background: 'var(--color-border-soft)', ...style }}
      aria-hidden="true"
    />
  )
}

export default function AgendaLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Bone className="h-8 w-44" />
        <Bone className="h-4 w-64 mt-1.5" />
      </div>

      <div className="flex flex-col lg:flex-row items-start" style={{ minHeight: '75vh' }}>

        {/* Sidebar skeleton — desktop only */}
        <div
          className="hidden lg:flex flex-shrink-0 flex-col"
          style={{ width: 208, borderRight: '1px solid var(--color-border-soft)', minHeight: '75vh' }}
        >
          {/* Mini calendar */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Bone className="h-4 w-5" />
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-5" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Bone key={i} className="h-5" />
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <Bone key={`d${i}`} className="h-7" style={{ opacity: i % 7 === 0 || i % 7 === 6 ? 0.4 : 1 }} />
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />

          {/* View nav */}
          <div className="py-1.5 px-2 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-9" style={{ opacity: i === 0 ? 1 : 0.5 }} />
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />

          {/* Filters */}
          <div className="px-3 py-3 space-y-3">
            <Bone className="h-3 w-14" />
            <Bone className="h-9 w-full" />
            <Bone className="h-9 w-full" />
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 min-w-0 flex flex-col lg:pl-4 w-full">

          {/* Nav header */}
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
            <Bone className="h-9 w-9 flex-shrink-0" />
            <Bone className="h-5 w-48" />
            <Bone className="h-9 w-9 flex-shrink-0" />
            <Bone className="h-9 w-16 ml-auto" />
          </div>

          {/* Week grid */}
          <div className="flex-1 overflow-auto rounded-xl" style={{ border: '1px solid var(--color-border-soft)' }}>

            {/* Column headers */}
            <div
              className="grid sticky top-0 z-10"
              style={{
                gridTemplateColumns: '3rem repeat(5, 1fr)',
                borderBottom: '1px solid var(--color-border-soft)',
                background: 'var(--color-warm-white)',
              }}
            >
              <div className="h-12" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 flex flex-col items-center justify-center gap-1 px-1" style={{ borderLeft: '1px solid var(--color-border-soft)' }}>
                  <Bone className="h-3 w-6" />
                  <Bone className="h-5 w-8" />
                </div>
              ))}
            </div>

            {/* Time rows */}
            {Array.from({ length: 10 }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="grid"
                style={{ gridTemplateColumns: '3rem repeat(5, 1fr)', borderBottom: '1px solid var(--color-border-soft)' }}
              >
                <div className="h-16 flex items-start pt-1 px-2">
                  <Bone className="h-3 w-9 ml-auto" />
                </div>
                {Array.from({ length: 5 }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className="h-16 relative"
                    style={{
                      borderLeft: '1px solid var(--color-border-soft)',
                      background: colIdx % 2 === 0 ? 'var(--color-warm-white)' : 'var(--color-canvas)',
                    }}
                  >
                    {rowIdx === 1 && colIdx === 0 && (
                      <Bone className="absolute inset-x-1 top-2 h-8" style={{ opacity: 0.8, borderRadius: 8, background: 'var(--color-rose-blush)' }} />
                    )}
                    {rowIdx === 3 && colIdx === 2 && (
                      <Bone className="absolute inset-x-1 top-1 h-10" style={{ opacity: 0.6, borderRadius: 8, background: 'var(--color-sage-light)' }} />
                    )}
                    {rowIdx === 6 && colIdx === 4 && (
                      <Bone className="absolute inset-x-1 top-3 h-8" style={{ opacity: 0.5, borderRadius: 8, background: 'var(--color-lavender-light)' }} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
