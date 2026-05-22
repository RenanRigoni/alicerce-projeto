'use client'

import { useState, useRef, useEffect, type CSSProperties, type RefObject } from 'react'
import { Clock } from 'lucide-react'

const ITEM_H = 34
const VISIBLE = 5

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function fmt(n: number) {
  return String(n).padStart(2, '0')
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return { hour: -1, minute: -1 }

  const hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)

  return {
    hour: hour >= 0 && hour <= 23 ? hour : -1,
    minute: minute >= 0 && minute <= 59 ? minute : -1,
  }
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

  const { hour: selH, minute: selM } = parseTime(value)

  function jumpTo(ref: RefObject<HTMLDivElement | null>, idx: number) {
    if (ref.current) ref.current.scrollTop = idx * ITEM_H
  }

  function smoothTo(ref: RefObject<HTMLDivElement | null>, idx: number) {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      jumpTo(hourColRef, selH >= 0 ? selH : 8)
      jumpTo(minColRef, selM >= 0 ? selM : 0)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || selH < 0) return
    smoothTo(hourColRef, selH)
    if (selM >= 0) smoothTo(minColRef, selM)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function optionStyle(selected: boolean): CSSProperties {
    return {
      height: ITEM_H,
      scrollSnapAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: 16,
      fontWeight: selected ? 700 : 500,
      color: selected ? '#FFFFFF' : 'var(--color-ink-mid)',
      transition: 'color 0.12s, background 0.12s, box-shadow 0.12s',
    }
  }

  function selectedPillStyle(selected: boolean): CSSProperties {
    return selected
      ? {
          minWidth: 32,
          height: 28,
          borderRadius: 8,
          background: 'var(--color-rose-main)',
          color: '#FFFFFF',
          boxShadow: '0 8px 16px rgba(212, 113, 106, 0.26)',
        }
      : {
          minWidth: 32,
          height: 28,
          borderRadius: 8,
          color: 'var(--color-ink-mid)',
        }
  }

  const colStyle: CSSProperties = {
    height: ITEM_H * VISIBLE,
    scrollSnapType: 'y mandatory',
    overscrollBehavior: 'contain',
    overflowY: 'scroll',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--color-ink-faint) transparent',
  }

  const inputStyle: CSSProperties | undefined = open
    ? {
        borderColor: 'var(--color-rose-main)',
        boxShadow: '0 0 0 3px var(--color-rose-blush)',
      }
    : undefined

  return (
    <div ref={rootRef} className="relative w-[108px]">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="HH:MM"
          maxLength={5}
          inputMode="numeric"
          className="input-base h-10 w-[108px] pr-12 text-left font-medium tabular-nums focus:!border-[var(--color-rose-main)] focus:!shadow-[0_0_0_3px_var(--color-rose-blush)]"
          style={inputStyle}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          className="absolute right-1 top-1 flex h-8 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-rose-blush)]"
          style={{
            background: open ? 'var(--color-rose-blush)' : 'var(--color-border-soft)',
            color: open ? 'var(--color-rose-deep)' : 'var(--color-ink-mid)',
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Abrir seletor de horario"
        >
          <Clock size={16} strokeWidth={1.8} />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 mt-1 overflow-hidden rounded-lg border bg-white"
          style={{
            borderColor: 'var(--color-rose-main)',
            boxShadow: '0 18px 40px rgba(44, 32, 24, 0.18)',
            left: 0,
            width: 164,
          }}
        >
          <div className="relative grid grid-cols-2 gap-5 px-4 py-2" style={{ height: ITEM_H * VISIBLE + 16 }}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8"
              style={{
                background: 'linear-gradient(0deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)',
              }}
            />
            <div ref={hourColRef} onScroll={onScrollH} className="relative z-0" style={colStyle}>
              <div style={{ height: ITEM_H * 2 }} />
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => selectHour(h)}
                  className="w-full tabular-nums outline-none"
                  style={optionStyle(h === selH)}
                >
                  <span className="flex items-center justify-center" style={selectedPillStyle(h === selH)}>
                    {fmt(h)}
                  </span>
                </button>
              ))}
              <div style={{ height: ITEM_H * 2 }} />
            </div>

            <div ref={minColRef} onScroll={onScrollM} className="relative z-0" style={colStyle}>
              <div style={{ height: ITEM_H * 2 }} />
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMinute(m)}
                  className="w-full tabular-nums outline-none"
                  style={optionStyle(m === selM)}
                >
                  <span className="flex items-center justify-center" style={selectedPillStyle(m === selM)}>
                    {fmt(m)}
                  </span>
                </button>
              ))}
              <div style={{ height: ITEM_H * 2 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
