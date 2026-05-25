'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export type Aniversariante = {
  id: string
  nome: string
  data_nascimento: string
  foto_url: string | null
  responsavel: { id: string; nome: string; telefone: string | null } | null
}

type Filtro = 'hoje' | 'semana' | 'mes' | 'todos'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function getBRT() {
  const agora = new Date()
  const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  return {
    ano: brt.getUTCFullYear(),
    mes: brt.getUTCMonth() + 1,
    dia: brt.getUTCDate(),
    dow: brt.getUTCDay(),
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function gerarUrlWhatsApp(telefone: string, responsavelNome: string, pacienteNome: string) {
  const num = telefone.replace(/\D/g, '')
  const completo = num.startsWith('55') ? num : `55${num}`
  const msg =
    `Olá, ${responsavelNome}! 🎂\n\n` +
    `A equipe Alicerce quer celebrar este dia especial junto com vocês!\n\n` +
    `Desejamos um feliz aniversário para ${pacienteNome}! Que seja um dia cheio de alegria, saúde e muito amor. 🌟\n\n` +
    `Com carinho,\nEquipe Alicerce 💛`
  return `https://wa.me/${completo}?text=${encodeURIComponent(msg)}`
}

function buildBirthdayMap(list: Aniversariante[]) {
  const map = new Map<string, Aniversariante[]>()
  for (const a of list) {
    const parts = a.data_nascimento.split('-')
    const key = `${parts[1]}-${parts[2]}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return map
}

function buildCalendarDays(mesBase: Date, birthdayMap: Map<string, Aniversariante[]>) {
  const ano = mesBase.getFullYear()
  const mes = mesBase.getMonth() + 1
  const primeiroDia = new Date(ano, mes - 1, 1)
  const ultimoDia = new Date(ano, mes, 0)
  const dowPrimeiro = (primeiroDia.getDay() + 6) % 7

  const days: { date: Date; outOfMonth: boolean; birthdays: Aniversariante[] }[] = []

  for (let i = dowPrimeiro - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1, -i)
    const key = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    days.push({ date: d, outOfMonth: true, birthdays: birthdayMap.get(key) ?? [] })
  }

  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    const date = new Date(ano, mes - 1, d)
    const key = `${pad(mes)}-${pad(d)}`
    days.push({ date, outOfMonth: false, birthdays: birthdayMap.get(key) ?? [] })
  }

  while (days.length < 35 || days.length % 7 !== 0) {
    const last = days[days.length - 1].date
    const d = new Date(last)
    d.setDate(last.getDate() + 1)
    const key = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    days.push({ date: d, outOfMonth: true, birthdays: birthdayMap.get(key) ?? [] })
  }

  return days.slice(0, 42)
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export function AniversariosClient({
  aniversariantes,
  titulo = 'Aniversários',
}: {
  aniversariantes: Aniversariante[]
  titulo?: string
}) {
  const [filtro, setFiltro] = useState<Filtro>('mes')
  const [mesBase, setMesBase] = useState(() => {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  })

  const hoje = getBRT()
  const birthdayMap = useMemo(() => buildBirthdayMap(aniversariantes), [aniversariantes])
  const calendarDays = useMemo(() => buildCalendarDays(mesBase, birthdayMap), [mesBase, birthdayMap])

  const listaFiltrada = useMemo(() => {
    if (filtro === 'hoje') {
      const key = `${pad(hoje.mes)}-${pad(hoje.dia)}`
      return birthdayMap.get(key) ?? []
    }

    if (filtro === 'semana') {
      const dow = (hoje.dow + 6) % 7
      const diasSemana: { mes: number; dia: number }[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(hoje.ano, hoje.mes - 1, hoje.dia - dow + i)
        diasSemana.push({ mes: d.getMonth() + 1, dia: d.getDate() })
      }
      return diasSemana
        .flatMap(({ mes, dia }) => birthdayMap.get(`${pad(mes)}-${pad(dia)}`) ?? [])
        .sort((a, b) => {
          const [, am, ad] = a.data_nascimento.split('-')
          const [, bm, bd] = b.data_nascimento.split('-')
          return am === bm ? parseInt(ad) - parseInt(bd) : parseInt(am) - parseInt(bm)
        })
    }

    if (filtro === 'mes') {
      const mesStr = pad(hoje.mes)
      return aniversariantes
        .filter(a => a.data_nascimento.split('-')[1] === mesStr)
        .sort((a, b) => parseInt(a.data_nascimento.split('-')[2]) - parseInt(b.data_nascimento.split('-')[2]))
    }

    return [...aniversariantes].sort((a, b) => {
      const [, am, ad] = a.data_nascimento.split('-')
      const [, bm, bd] = b.data_nascimento.split('-')
      return am === bm ? parseInt(ad) - parseInt(bd) : parseInt(am) - parseInt(bm)
    })
  }, [filtro, aniversariantes, birthdayMap, hoje])

  function isToday(date: Date) {
    return (
      date.getFullYear() === hoje.ano &&
      date.getMonth() + 1 === hoje.mes &&
      date.getDate() === hoje.dia
    )
  }

  const filtroLabels: Record<Filtro, string> = {
    hoje: 'Hoje',
    semana: 'Esta semana',
    mes: 'Este mês',
    todos: 'Todos',
  }

  const emptyMessages: Record<Filtro, string> = {
    hoje: 'Nenhum aniversariante hoje',
    semana: 'Nenhum aniversariante esta semana',
    mes: 'Nenhum aniversariante este mês',
    todos: 'Nenhum paciente com data de nascimento cadastrada',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
        >
          {titulo}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
          {aniversariantes.length} paciente{aniversariantes.length !== 1 ? 's' : ''} com data de nascimento cadastrada
        </p>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--color-border-soft)' }}
      >
        {(Object.keys(filtroLabels) as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={
              filtro === f
                ? {
                    background: 'var(--color-warm-white)',
                    color: 'var(--color-rose-main)',
                    boxShadow: '0 1px 4px rgba(44,32,24,0.08)',
                  }
                : { color: 'var(--color-ink-soft)' }
            }
          >
            {filtroLabels[f]}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Calendar */}
        <div
          className="w-full lg:w-72 shrink-0 rounded-2xl p-4"
          style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMesBase(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors hover:bg-[var(--color-border-soft)]"
              aria-label="Mês anterior"
              style={{ color: 'var(--color-ink-mid)' }}
            >
              ‹
            </button>
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-lora)', color: 'var(--color-ink)' }}
            >
              {MESES[mesBase.getMonth()]} {mesBase.getFullYear()}
            </span>
            <button
              onClick={() => setMesBase(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors hover:bg-[var(--color-border-soft)]"
              aria-label="Próximo mês"
              style={{ color: 'var(--color-ink-mid)' }}
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map(d => (
              <div
                key={d}
                className="text-center text-xs font-medium py-1"
                style={{ color: 'var(--color-ink-faint)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((cell, i) => {
              const today = isToday(cell.date)
              const hasBirthday = cell.birthdays.length > 0
              return (
                <div
                  key={i}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg"
                  style={{
                    background: today ? 'var(--color-rose-blush)' : 'transparent',
                    opacity: cell.outOfMonth ? 0.3 : 1,
                  }}
                >
                  <span
                    className="text-xs font-medium leading-none"
                    style={{ color: today ? 'var(--color-rose-main)' : 'var(--color-ink-mid)' }}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasBirthday && (
                    <div className="flex gap-px mt-0.5">
                      {cell.birthdays.slice(0, 3).map((_, j) => (
                        <div
                          key={j}
                          className="w-1 h-1 rounded-full"
                          style={{ background: 'var(--color-rose-main)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div
            className="flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: '1px solid var(--color-border-soft)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-rose-main)' }} />
            <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Aniversário no dia
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 space-y-3 w-full min-w-0">
          {listaFiltrada.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-14 text-center"
              style={{ background: 'var(--color-warm-white)', border: '1px solid var(--color-border)' }}
            >
              <div className="text-4xl mb-3 opacity-40">🎂</div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink-mid)' }}>
                {emptyMessages[filtro]}
              </p>
            </div>
          ) : (
            <>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                {listaFiltrada.length} aniversariante{listaFiltrada.length !== 1 ? 's' : ''}
              </p>
              {listaFiltrada.map(a => {
                const [ano, mes, dia] = a.data_nascimento.split('-')
                const idade = hoje.ano - parseInt(ano)
                const diaNum = parseInt(dia)
                const mesIdx = parseInt(mes) - 1
                const isHojeAniv = parseInt(mes) === hoje.mes && diaNum === hoje.dia

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
                    style={{
                      background: 'var(--color-warm-white)',
                      border: isHojeAniv
                        ? '1.5px solid var(--color-rose-soft)'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{
                        background: isHojeAniv ? 'var(--color-rose-blush)' : 'var(--color-border-soft)',
                        color: isHojeAniv ? 'var(--color-rose-main)' : 'var(--color-ink-mid)',
                      }}
                    >
                      {initials(a.nome)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/pacientes/${a.id}`}
                          className="font-medium text-sm transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-ink)', textDecoration: 'none' }}
                        >
                          {a.nome}
                        </Link>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: isHojeAniv ? 'var(--color-rose-blush)' : 'var(--color-border-soft)',
                            color: isHojeAniv ? 'var(--color-rose-main)' : 'var(--color-ink-soft)',
                          }}
                        >
                          {isHojeAniv ? '🎂' : '📅'} {diaNum} de {MESES[mesIdx]}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                          {isHojeAniv ? `completa ${idade} anos hoje` : `${idade} anos`}
                        </span>
                      </div>
                      {a.responsavel ? (
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-soft)' }}>
                          Resp.: {a.responsavel.nome}
                          {!a.responsavel.telefone && (
                            <span className="ml-1" style={{ color: 'var(--color-ink-faint)' }}>
                              · sem telefone
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                          Sem responsável cadastrado
                        </div>
                      )}
                    </div>

                    {/* WhatsApp button */}
                    {a.responsavel?.telefone && (
                      <a
                        href={gerarUrlWhatsApp(a.responsavel.telefone, a.responsavel.nome, a.nome)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Enviar parabéns pelo WhatsApp para responsável de ${a.nome}`}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-opacity hover:opacity-85"
                        style={{ background: '#25D366', color: '#fff' }}
                      >
                        <WhatsAppIcon />
                        Parabéns
                      </a>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
