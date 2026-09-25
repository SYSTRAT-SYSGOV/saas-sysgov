# Legado — Cemitério Central, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24. Tarefas de validação/tratamento de dado, não de código de aplicação.

## Pré-requisitos
- [ ] Acesso de leitura a `Cemiterio Central/*.DBF`/`*.NTX`
- [ ] `extracao-dbf` T-07 aplicado (correção do print/logging) antes de validar `FUNCIONA`/`PEDREIRO`

## Tarefas

- [ ] T-01, Validar volumetria extraída contra `EXTRACTION_SUMMARY.txt` para as 15 tabelas do Central
  - Origem no legado: `code-analysis.md`, módulo `legado-cemiterio-central`
  - Critério de pronto: contagens batem exatamente
  - Confiança: 🟢

- [ ] T-02, Confirmar dados reais de `FUNCIONA.DBF`/`PEDREIRO.DBF` após correção da extração
  - Origem no legado: RN012 em `domain.md`
  - Critério de pronto: código 4=RAFAEL STARON, 8=AUGUSTO BOJAN confirmados no CSV gerado
  - Confiança: 🟢 (nomes já confirmados por leitura de bytes brutos nesta extração)

- [ ] T-03, Avaliar `PEDREIRO.DBF` códigos 2-4 corrompidos — decidir se há registro em papel para reconstrução manual ou se o dado é considerado perdido
  - Origem no legado: achado em `code-analysis.md`
  - Confiança: 🔴 — decisão de negócio, não técnica

- [ ] T-04, Confirmar se `FALECIDO.DBF` tinha propósito além de índice de ocupação antes de descartá-lo definitivamente na migração
  - Origem no legado: RN008 em `domain.md`
  - Confiança: 🔴 — ver `questions.md`

- [ ] T-05, Avaliar backups `.ARJ` (2009-2011) em `Cemiterio Central/backup/` — arquivar, migrar ou descartar
  - Confiança: 🔴 — não analisado nesta extração

## Tarefas de Teste
- [ ] TT-01, Comparar contagem de registros pós-extração com os 6.951/4.332/2.398/2.477/712 documentados

## Tarefas de Migração de Dados
- [ ] TM-01, Migrar as 15 tabelas do Central respeitando `cemiterio_id = 1` em todas as tabelas isoladas por cemitério

## Ordem Sugerida
1. T-01 (validação de volumetria) primeiro, garante que a extração está completa
2. T-02 (depende de `extracao-dbf` T-07) e T-03 podem rodar em paralelo
3. T-04 e T-05 são decisões de negócio, não bloqueiam a migração técnica

## Lacunas Pendentes (🔴)
Ver `questions.md`.
