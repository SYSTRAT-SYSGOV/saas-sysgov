# Legado — Cemitério Independência

> Gerado pelo Redator em 2026-09-24. Fonte: `code-analysis.md`, `data-dictionary.md`. Fonte de dados legada, código legado `'02'`.

## Visão Geral
Conjunto de 16 arquivos `.DBF`/`.NTX` do cemitério Independência — mesma estrutura base do Central, mas com **duas tabelas exclusivas** (`OBA.DBF`, `TTT.DBF`) sem equivalente na outra unidade, e volumetria maior (mais que o dobro de registros em quase todas as tabelas).

## O que esses dados cobrem
- Mesma cobertura funcional do Central (sepultamentos, responsáveis, lotes, segurança, log de erros)
- **Exclusivo desta unidade:** `TTT.DBF` (histórico de validade de concessão) e `OBA.DBF` (mapeamento alternativo de quadra/lote)
- Base de segurança **independente** do Central (RBAC próprio, não compartilhado)

## Regras de Negócio
- Isolamento total dos dados do Central (RN004, `domain.md`) 🟢
- `OBA.DBF`/`TTT.DBF` só existem aqui — motivo da assimetria não documentado (RN010) 🔴
- `FUNCIONA.DBF`/`PEDREIRO.DBF` desta unidade têm códigos e nomes **totalmente diferentes** dos do Central — universos de numeração independentes (ver ADR 0004, RN012) 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Preservar volumetria original | Must | Contagens batem com `EXTRACTION_SUMMARY.txt` (14.906 falecidos, 11.642 responsáveis, 7.437 lotes, 5.012 OBA, 2.126 TTT) |
| RF-02 | Migrar `OBA`/`TTT` apenas para `cemiterio_id = 2` | Must | `lote_oba`/`lote_historico_validade` vazias para o Central |
| RF-03 | Recuperar nomes reais de `FUNCIONA`/`PEDREIRO` desta unidade | Should | Códigos 9, 11, 12 (e outros) com nomes reais, distintos do hardcode atual |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Integridade de dados | Volumetria mais que dobro do Central exige atenção a performance na importação (ver `_refresh_lote_cache` O(n²) em `importacao-csv`) | `code-analysis.md` | 🟡 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado o conjunto completo de .DBF de Independência, incluindo OBA e TTT
Quando a extração e importação são executadas
Então lote_oba e lote_historico_validade são populadas apenas para cemiterio_id=2, e as demais tabelas seguem a mesma regra do Central

Dado que FUNCIONA/PEDREIRO desta unidade têm numeração própria
Quando a importação usa a lista hardcoded atual (compartilhada com o Central)
Então coveiro_id/pedreiro_id desta unidade apontam para pessoas erradas ou para nenhum registro (comportamento atual, bug — ver RN012)
```

## Prioridade (MoSCoW)

| Item | MoSCoW | Justificativa |
|---|---|---|
| Extração/importação completa incluindo OBA/TTT | Must | Dado exclusivo desta unidade, sem equivalente a "pular" |
| Correção de `coveiro_id`/`pedreiro_id` para esta unidade | Must (antes de produção) | Hoje aponta para pessoa errada — ver `importacao-csv` T-08 |
| Investigar motivo de OBA/TTT serem exclusivos | Could | Não bloqueia migração técnica, mas explica a assimetria de negócio |

## Rastreabilidade de Código
| Arquivo | Cobertura |
|---|---|
| `Cemiterio Independencia/*.DBF` (16 tabelas) | 🟢 |
| `Cemiterio Independencia/*.NTX` | 🟡 não analisados |
