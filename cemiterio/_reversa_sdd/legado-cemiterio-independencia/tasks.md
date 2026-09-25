# Legado — Cemitério Independência, Tarefas de Implementação

> Gerado pelo Redator em 2026-09-24.

## Pré-requisitos
- [ ] Acesso de leitura a `Cemiterio Independencia/*.DBF`/`*.NTX`
- [ ] `extracao-dbf` T-07 aplicado antes de validar `FUNCIONA`/`PEDREIRO`

## Tarefas

- [ ] T-01, Validar volumetria extraída contra `EXTRACTION_SUMMARY.txt` para as 16 tabelas
  - Critério de pronto: contagens batem (14.906 / 11.642 / 7.437 / 7.864 / 5.012 OBA / 2.126 TTT / 712)
  - Confiança: 🟢

- [ ] T-02, Confirmar dados reais de `FUNCIONA.DBF`/`PEDREIRO.DBF` desta unidade após correção da extração
  - Origem no legado: RN012 em `domain.md`
  - Critério de pronto: códigos 9, 11, 12 com nomes reais confirmados
  - Confiança: 🟢

- [ ] T-03, Implementar `import_oba`/`import_historico` populando apenas `cemiterio_id = 2`
  - Origem no legado: `code-analysis.md`, `import_csv_to_db.py`
  - Confiança: 🟢

- [ ] T-04, Investigar motivo de `OBA`/`TTT` serem exclusivos desta unidade
  - Confiança: 🔴 — ver `questions.md`

## Tarefas de Teste
- [ ] TT-01, Comparar contagem pós-extração com os totais documentados
- [ ] TT-02, Confirmar que `lote_oba`/`lote_historico_validade` ficam vazias para `cemiterio_id = 1`

## Tarefas de Migração de Dados
- [ ] TM-01, Migrar as 16 tabelas respeitando `cemiterio_id = 2`, incluindo OBA/TTT

## Ordem Sugerida
1. T-01 (validação de volumetria)
2. T-02 e T-03 em paralelo
3. T-04 (investigação de negócio, não bloqueia migração técnica)

## Lacunas Pendentes (🔴)
Ver `questions.md`.
