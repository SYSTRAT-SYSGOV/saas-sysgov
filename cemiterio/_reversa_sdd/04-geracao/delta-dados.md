# Delta de Dados: legado → SYSGOV

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## Resumo das mudanças

A migração move dados do modelo Clipper/DBF para o modelo relacional multi-tenant do SYSGOV, com normalização de codigos, mascaramento LGPD e recalculo de ocupacao. O detalhe de campos, indices e migracoes vive em `data-delta.md`.

## Mapeamento por entidade

| Legado | SYSGOV | Tipo de mudança | Resumo |
|---|---|---|---|
| CEMITÉRIO (fixo) | tenant | contrato-novo | 2 tenants, isolamento lógico |
| QUADRA | cemetery_sector | regra-alterada | Codigo alfanumerico preservado |
| LOTES | cemetery_plot | componente-novo | Tipo, gavetas, validade, processo |
| DADOS + FALECIDO | deceased_records | componente-novo | Merge de falecido e indice de ocupacao |
| DADOS (COD_FUNC/PED) + FUNCIONA + PEDREIRO | cemetery_burials | componente-novo | Join para enriquecer inumacao com coveiro e pedreiro |
| RESPONSA | concession_holders | componente-novo | LGPD em dados sensíveis |
| ERROS | audit_log | componente-novo | Auditoria histórica |
| PW* | users/roles/permissions | componente-novo | Senha hasheada, matriz de permissoes |
| TTT | concession_history | componente-novo | Apenas Independência |
| OBA | plot_alias_mapping | componente-novo | Apenas Independência |

## Campos sensíveis e tratamento LGPD

| Campo | Acao | Observacao |
|---|---|---|
| CPFAIOQ | Mascaramento/criptografia | 11 digitos |
| RGEAIOQ | Mascaramento parcial | Mantem ultimos 4 |
| ENDERECOQ | Pseudonimizacao | Mantem apenas cidade e uf |
| FONEEOQ, CELULARQ | Mascaramento | Mantem ultimos 4 digitos |
| NOMEAIOQ | Mantido | Nome publico do falecido ou responsavel |

## Recalculo de ocupacao

- Contagem de sepultamentos ativos por lote (DADOS sem FLAG_EXCL).
- Estado fisico: `disponivel`, `parcialmente_ocupado`, `totalmente_ocupado`, `exumado`.
- Validacao: contagem <= gavetas do lote; divergencias sao registradas como anomalias.

## Historicos (apenas Independencia)

- TTT: historia de validades, tipos, gavetas e processos.
- OBA: mapeamento alternativo de numeracao de quadras e lotes.

## Detalhe completo

O detalhe de campos, migracoes, indices e politicas de LGPD esta em `data-delta.md`.