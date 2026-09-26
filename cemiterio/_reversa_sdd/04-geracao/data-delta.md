# Data Delta: detalhe de campos, migrações e índices

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/delta-dados.md`

## Campos sensíveis e tratamento LGPD

| Campo | Ação | Observação |
|---|---|---|
| CPFAIOQ | Mascaramento/criptografia | 11 dígitos |
| RGEAIOQ | Mascaramento parcial | Mantém últimos 4 |
| ENDERECOQ | Pseudonimização | Mantém apenas cidade e uf |
| FONEEOQ, CELULARQ | Mascaramento | Mantém últimos 4 dígitos |
| NOMEAIOQ | Mantido | Nome público do falecido ou responsável |

## Recalculo de ocupação

- Contagem de sepultamentos ativos por lote (DADOS sem FLAG_EXCL).
- Estado físico: `disponivel`, `parcialmente_ocupado`, `totalmente_ocupado`, `exumado`.
- Validação: contagem <= gavetas do lote; divergências registradas como anomalias.

## Históricos (apenas Independência)

- TTT: história de validades, tipos, gavetas e processos.
- OBA: mapeamento alternativo de numeração de quadras e lotes.

## Detalhe completo

O detalhe de campos, migracoes, indices e politicas de LGPD esta em `data-delta.md`.