# Insight: Contatos > Aniversariantes (ClinicaExperts)

## Layout
- Listagem simples de pacientes filtrada por mês de aniversário
- Filtro padrão: mês atual ("Mês de aniversário: Maio")
- Campos: Buscar, Exportar, "+ Adicionar filtro", paginação 25/página
- Estado vazio com CTA direto: "+ Adicionar novo paciente"

## Lógica
- Filtra `data_nascimento` pelo mês (não pelo ano)
- Pré-seleciona mês corrente automaticamente
- Exportável (CSV/Excel provavelmente)

## Para implementar no Alicerce

### Dependência crítica: `data_nascimento` em pacientes
Verificar se campo existe no schema atual. Se não existir: migration simples.

```sql
-- verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pacientes' AND column_name = 'data_nascimento';
```

### Query base
```sql
SELECT * FROM pacientes
WHERE EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY EXTRACT(DAY FROM data_nascimento);
```

### Onde exibir
1. **Widget no dashboard admin** — "Aniversariantes do mês" com lista rápida
2. **Página dedicada** em `/admin/pacientes/aniversariantes`
3. **Notificação diária** para recepção (via push ou comunicado automático)

## Esforço estimado
- Baixo — se `data_nascimento` já existe: só UI + query
- Médio — se precisar de migration: campo novo + UI + query
