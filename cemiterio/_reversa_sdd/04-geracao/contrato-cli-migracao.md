# Contrato CLI: cemiterios:migrar-clipper

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## Comando

```
cemiterios:migrar-clipper
```

## Opções

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `--tenant=<id>` | string | obrigatório | Identificador do tenant/necrópole de destino (ex: `central`, `independencia`). |
| `--source=<path>` | string | obrigatório | Caminho da pasta `exported_data/<tenant>` contendo os CSVs. |
| `--dry-run` | flag | falso | Analisa integridade e emite relatório sem persistir. |
| `--batch-size=<n>` | int | 1000 | Tamanho do lote transacional. |
| `--lgpd=<policy>` | string | `mask` | `mask` (mascaramento) ou `encrypt` (criptografia). |
| `--report=<path>` | string | stdout | Caminho opcional para relatório JSON/Markdown. |
| `--continue` | flag | falso | Retoma execução interrompida. |

## Fluxo de Execução

```
1. Validar tenant, source e existência dos CSVs esperados.
2. Ler arquivos em ordem de dependência:
   a. cemiterio (referência)
   b. quadras (distinct de LOTES)
   c. tipos de lote
   d. funcionarios (coveiros)
   e. pedreiros
   f. lote/jazigo
   g. concessionarios (responsaveis)
   h. sepultamentos (falecidos)
   i. inumacoes (DADOS + FUNCIONA + PEDREIRO)
   j. indices de ocupacao (FALECIDO)
   k. historicos (TTT/OBA, quando aplicaveis)
3. Em dry-run: contabilizar, validar FKs, relatar sem escrever.
4. Em modo definitivo: processar em lotes transacionais, upsert idempotente.
5. Recalcular ocupacao e estado fisico dos jazigos.
6. Aplicar LGPD aos campos sensíveis.
7. Emitir relatorio final com contagens, erros, orfaos e duplicidades.
```

## Contrato de Saída (Relatório)

```json
{
  "tenant": "central",
  "dry_run": false,
  "started_at": "2026-09-24T19:40:00Z",
  "finished_at": "2026-09-24T19:45:00Z",
  "entities": {
    "cemiterios": 1,
    "quadras": 120,
    "lotes": 2398,
    "falecidos": 6951,
    "responsaveis": 4332,
    "funcionarios": 12,
    "pedreiros": 4
  },
  "anomalies": {
    "orphans": 363,
    "duplicates": 1,
    "over_capacity": 1470,
    "unknown_codes": 627
  },
  "errors": [],
  "status": "success"
}
```

## Critérios de Aceitação

- `--dry-run` não abre transações de escrita.
- Reexecução para o mesmo tenant não duplica registros.
- Sepultamentos com códigos válidos de coveiro e pedreiro persistem sem erro de FK.
- Dados sensíveis em claro não são persistidos.
- Falhas em lote são registradas e o lote é revertido.