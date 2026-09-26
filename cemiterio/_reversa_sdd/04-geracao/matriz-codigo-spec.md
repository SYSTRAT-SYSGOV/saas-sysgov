# Matriz de Rastreabilidade: código/spec

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## Matriz: Requisitos × Artefatos de Origem

| Requisito | Artefato de Origem | Trecho | Confidência |
|---|---|---|---|
| RF-01 (Artisan) | Spec `cemiterio/migracao-legado` | Contrato CLI | 🟢 |
| RF-02 (tenant) | `_reversa_sdd/01-reconhecimento/estrutura-pastas.md` | Dois cemitérios em `exported_data/` | 🟢 |
| RF-03 (dry-run) | Spec | `--dry-run` sem persistência | 🟢 |
| RF-04 (LGPD) | `_reversa_sdd/02-escavacao/modulos-detalhados.md#modulo-3` | `CPFAIOQ`, `RGEAIOQ`, `ENDERECOQ`, `FONEEOQ` | 🟢 |
| RF-05 (ordem) | `_reversa_sdd/01-reconhecimento/scripts-analise.md#import_csv_to_db-py` | Ordem: cemitérios → quadras → lotes → falecidos → responsáveis | 🟢 |
| RF-06 (deceased_records/cemetery_burials) | `_reversa_sdd/01-reconhecimento/modelo-dados.md#tabelas-principais` | `DADOS` + `FALECIDO` → `deceased_records` + `cemetery_burials` | 🟡 |
| RF-07 (histórico) | `_reversa_sdd/02-escavacao/modulos-detalhados.md#modulo-2` | `COD_FUNCQ`, `COD_PEDQ`, `CERTIDAOQ`, `CARTORIOQ`, `MEDICOOQ` | 🟢 |
| RF-08 (recalcular) | `_reversa_sdd/03-interpretacao/regras-negocio.md#rn002` | Contagem por lote ≤ gavetas | 🟡 |
| RF-09 (relatório) | `_reversa_sdd/01-reconhecimento/scripts-analise.md` | `extract_data.py` gera estatísticas | 🟢 |
| RF-10 (exceções) | `_reversa_sdd/01-reconhecimento/scripts-analise.md#gaps-e-pendencias` | `import_csv_to_db.py` não trata órfãos | 🟡 |

## Matriz: Artefatos Reversos × Artefatos Gerados

| Artefato Gerado | Artefato Reverso | Status |
|---|---|---|
| `01-reconhecimento/estrutura-pastas.md` | Estrutura de diretórios | ✅ |
| `01-reconhecimento/modelo-dados.md` | `DADOS.DBF`, `LOTES.DBF`, `RESPONSA.DBF`, etc. | ✅ |
| `01-reconhecimento/scripts-analise.md` | `export_all_dbfs.py`, `import_csv_to_db.py`, `extract_data.py` | ✅ |
| `02-escavacao/modulos-detalhados.md` | Módulos do Clipper + fluxos | ✅ |
| `03-interpretacao/regras-negocio.md` | RN001-RN010, RBAC, ERD, C4 | ✅ |
| `04-geracao/requirements-migracao-legado.md` | Spec + findings | ✅ |
| `04-geracao/historias-usuario.md` | Spec + requirements | ✅ |
| `04-geracao/contrato-cli-migracao.md` | Spec + requirements | ✅ |
| `04-geracao/matriz-codigo-spec.md` | Este documento | ✅ |
| `05-revisao/revisao-cruzada.md` | Todos os anteriores | ⬜ |
| `05-revisao/relatorio-confianca.md` | Todos os anteriores | ⬜ |

## Gaps de Cobertura

| Gap | Impacto | Ação |
|---|---|---|
| `deceased_records` e `cemetery_burials` não existem no schema atual | Alto | Documentar como tables alvo do SYSGOV, não do legado. |
| `import_csv_to_db.py` não tem dry-run | Médio | Requisito RF-03 exige novo modo no comando CLI. |
| `import_csv_to_db.py` não aplica LGPD | Alto | Requisito RF-04 exige mascaramento/criptografia. |
| `import_csv_to_db.py` não recalcula ocupação | Médio | Requisito RF-08 exige recalculo pós-carga. |
| `import_csv_to_db.py` não é isolado por tenant | Médio | Requisito RF-02 exige isolamento. |
| Códigos operacionais unknown (0, 7, 8, 9) | Alto | Requisito RF-10 exige tratamento sem abortar. |
| Duplicidades e órfãos nos CSVs | Alto | Requisito RF-09 exige relatório. |
| Capacidade divergente (item. | Alto | Requisito RF-08 exige recalculo. |