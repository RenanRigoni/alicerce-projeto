export function expandirFeriadosAnuais(
  feriados: Array<{ data: string; anual?: boolean | null }>,
  anoInicio: number,
  anoFim: number,
): string[] {
  const datas = new Set<string>()

  for (const f of feriados) {
    datas.add(f.data)
    if (f.anual) {
      const [, mesStr, diaStr] = f.data.split('-')
      const mes = parseInt(mesStr, 10)
      const dia = parseInt(diaStr, 10)
      for (let ano = anoInicio; ano <= anoFim; ano++) {
        const dataAno = `${ano}-${mesStr}-${diaStr}`
        if (dataAno === f.data) continue
        // Valida data (ex: 29/fev em anos não-bissextos)
        const dt = new Date(`${dataAno}T12:00:00`)
        if (dt.getMonth() + 1 === mes && dt.getDate() === dia) {
          datas.add(dataAno)
        }
      }
    }
  }

  return Array.from(datas)
}
