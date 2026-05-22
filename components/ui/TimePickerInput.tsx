'use client'

import { useState, useRef, useEffect } from 'react'

const ITEM_H = 36
const VISIBLE = 5

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function fmt(n: number) {
  return String(n).padStart(2, '0')
}

interface Props {
  value: string
  onChange: (val: string) => void
}

export function TimePickerInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const hourColRef = useRef<HTMLDivElement>(null)
  const minColRef = useRef<HTMLDivElement>(null)
  const timerH = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerM = useRef<ReturnType<typeof setTimeout> | null>(null)

  const match = value.match(/^(\d{2}):(\d{2})$/)
  const selH = match ? parseInt(match[1]) : -1
  const selM = match ? parseInt(match[2]) : -1

  function jumpTo(ref: React.RefObject<HTMLDivElement>, idx: number) {
    if (ref.current) ref.current.scrollTop = idx * ITEM_H
  }

  function smoothTo(ref: React.RefObject<HTMLDivElement>, idx: number) {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
  }

  // Jump to selected value when picker opens
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      jumpTo(hourColRef, selH >= 0 ? selH : 8)
      jumpTo(minColRef, selM >= 0 ? selM : 0)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync scroll when typed value changes while picker is open
  useEffect(() => {
    if (!open || selH < 0) return
    smoothTo(hourColRef, selH)
    smoothTo(minColRef, selM)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function onScrollH() {
    if (timerH.current) clearTimeout(timerH.current)
    timerH.current = setTimeout(() => {
      const el = hourColRef.current
      if (!el) return
      const h = Math.min(23, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
      const m = selM >= 0 ? selM : 0
      onChange(`${fmt(h)}:${fmt(m)}`)
    }, 150)
  }

  function onScrollM() {
    if (timerM.current) clearTimeout(timerM.current)
    timerM.current = setTimeout(() => {
      const el = minColRef.current
      if (!el) return
      const m = Math.min(59, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
      const h = selH >= 0 ? selH : 8
      onChange(`${fmt(h)}:${fmt(m)}`)
    }, 150)
  }

  function selectHour(h: number) {
    const m = selM >= 0 ? selM : 0
    onChange(`${fmt(h)}:${fmt(m)}`)
    smoothTo(hourColRef, h)
  }

  function selectMinute(m: number) {
    const h = selH >= 0 ? selH : 8
    onChange(`${fmt(h)}:${fmt(m)}`)
    smoothTo(minColRef, m)
  }

  const colStyle: React.CSSProperties = {
    height: ITEM_H * VISIBLE,
    scrollSnapType: 'y mandatory',
    overscrollBehavior: 'contain',
    overflowY: 'scroll',
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Input with clock icon */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="HH:MM"
          maxLength={5}
          inputMode="numeric"
          className="input-base w-24 text-center pr-7"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          className="absolute right-2 transition-opacity hover:opacity-60"
          style={{ color: open ? 'var(--color-sage-main)' : 'var(--color-ink-faint)' }}
          aria-label="Abrir seletor de horário"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>

      {/* Picker dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl shadow-xl border overflow-hidden"
          style={{
            background: 'var(--color-warm-white)',
            borderColor: 'var(--color-border)',
            left: 0,
            minWidth: 108,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border-b text-xs"
            style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-ink-soft)' }}
          >
            <span>Selecionar hora</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-sage-main)' }}
            >
              OK
            </button>
          </div>

          {/* Columns */}
          <div className="relative flex" style={{ height: ITEM_H * VISIBLE }}>
            {/* Center highlight band */}
            <div
              className="absolute inset-x-0 pointer-events-none"
              style={{
                top: ITEM_H * 2,
                height: ITEM_H,
                background: 'var(--color-sage-light)',
                borderTop: '1px solid var(--color-sage-soft)',
                borderBottom: '1px solid var(--color-sage-soft)',
              }}
            />

            {/* Hours column */}
            <div
              ref={hourColRef}
              onScroll={onScrollH}
              className="flex-1"
              style={colStyle}
            >
              <div style={{ height: ITEM_H * 2 }} />
              {HOURS.map(h => (
                <div
                  key={h}
                  onClick={() => selectHour(h)}
                  style={{
                    height: ITEM_H,
                    scrollSnapAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: h === selH ? 700 : 400,
                    color: h === selH ? 'var(--color-sage-main)' : 'var(--color-ink)',
                    transition: 'color 0.1s',
                  }}
                >
                  {fmt(h)}
                </div>
              ))}
              <div style={{ height: ITEM_H * 2 }} />
            </div>

            {/* Divider */}
            <div
              style={{
                width: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--color-ink-soft)',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            >
              :
            </div>

            {/* Minutes column */}
            <div
              ref={minColRef}
              onScroll={onScrollM}
              className="flex-1"
              style={colStyle}
            >
              <div style={{ height: ITEM_H * 2 }} />
              {MINUTES.map(m => (
                <div
                  key={m}
                  onClick={() => selectMinute(m)}
                  style={{
                    height: ITEM_H,
                    scrollSnapAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: m === selM ? 700 : 400,
                    color: m === selM ? 'var(--color-sage-main)' : 'var(--color-ink)',
                    transition: 'color 0.1s',
                  }}
                >
                  {fmt(m)}
                </div>
              ))}
              <div style={{ height: ITEM_H * 2 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
