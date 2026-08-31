# ADR-0005 — Trilha de Auditoria Imutável com Encadeamento Criptográfico (HMAC)

- **Status:** Aceito (implementado)
- **Data:** 22/08/2026
- **Decisores:** Arquitetura de Software SYSTRAT

## Contexto

Normas de conformidade para o setor público (Lei de Acesso à Informação, LGPD e
resoluções dos Tribunais de Contas) exigem que qualquer alteração de estado em dados
orçamentários, cadastrais ou de privilégios de acesso possua rastreabilidade absoluta,
impedindo fraudes ou manipulações retroativas na base de dados.

## Decisão

Estruturar o serviço `AuditLogger` com registro obrigatório na tabela `audit_logs`
utilizando **encadeamento criptográfico via HMAC-SHA256**. Cada registro calcula seu
hash combinando os dados do evento corrente com o hash do registro anterior do
respectivo tenant. Qualquer alteração direta na tabela invalida a cadeia de verificação.

Operações críticas (concessão/revogação de acesso, liberação de módulo) registram
`granted_by`/`set_by`.

## Consequências

- ✅ Validade jurídica dos registros auditados.
- ✅ Identificação imediata de anomalias em rotinas de integridade automatizadas.
- ⚠️ Custo marginal de processamento na escrita (aceitável diante dos benefícios).

## Alternativas consideradas

- **Logs em arquivos de texto sem encadeamento** — rejeitado pela facilidade de
  adulteração e dificuldade de busca estruturada.
- **Blockchain público** — rejeitado por custo e complexidade operacional desnecessária.