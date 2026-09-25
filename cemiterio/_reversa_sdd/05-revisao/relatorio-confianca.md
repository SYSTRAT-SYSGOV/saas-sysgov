# Relatório de Confiança: migração legada de necrópoles

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## Resumo

| Métrica | Valor |
|---|---|
| Artefatos gerados | 10 |
| Lacunas registradas | 3 |
| Itens de revisão reprovados | 3 |
| Veredito | Aprovado com ressalvas |

## Fontes e confidência

| Artefato | Confidência | Observação |
|---|---|---|
| `01-reconhecimento/estrutura-pastas.md` | 🟢 | Estrutura de diretórios verificada diretamente. |
| `01-reconhecimento/modelo-dados.md` | 🟢 | Campos e tipos extraídos dos DBFs e CSVs. |
| `01-reconhecimento/scripts-analise.md` | 🟢 | Código dos scripts lido e analisado. |
| `02-escavacao/modulos-detalhados.md` | 🟢 | Fluxos e regras inferidos do código e dados. |
| `03-interpretacao/regras-negocio.md` | 🟡 | RNs inferidas; algumas dependem de validação de domínio. |
| `04-geracao/requirements-migracao-legado.md` | 🟢 | Baseado no spec e nos artefatos reversos. |
| `04-geracao/historias-usuario.md` | 🟢 | Baseado no spec e nos requirements. |
| `04-geracao/contrato-cli-migracao.md` | 🟢 | Contrato CLI documentado. |
| `04-geracao/matriz-codigo-spec.md` | 🟢 | Rastreabilidade verificada. |
| `05-revisao/revisao-cruzada.md` | 🟢 | Revisão cruzada executada. |

## Lacunas

1. 🔴 [DÚVIDA] O destino SYSGOV já possui as tabelas `deceased_records` e `cemetery_burials`, ou elas precisam ser criadas por migração de schema?
2. 🔴 [DÚVIDA] Qual algoritmo de criptografia/mascaramento e política de retenção devem ser usados para CPF, RG, endereço e contatos?
3. 🔴 [DÚVIDA] Como devem ser tratadas as inconsistências de capacidade encontradas nos dados legados (por exemplo, lotes e item.

## Recomendações

- Rodar `/reversa-clarify` para as três lacunas antes de `/reversa-forward`.
- Validar as contagens de anomalias contra o banco de destino antes da carga definitiva.
- Documentar a política de LGPD em um documento separado do requirements.

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-09-24 | Relatório de confiança gerado por `/reversa-reviewer` | reversa |