# Proposal

## Why

O módulo CAPD já possui a base fundamental de avaliação por escala gráfica e incidentes críticos, mas carece de integrações reais com a infraestrutura de confiança digital e automações de fluxo de trabalho que tornem o sistema "completo" para operação em produção. Atualmente, a assinatura digital é simulada e a ingestão de dados de RH é parcial, gerando gargalos operacionais e riscos de integridade.

## What Changes

- **Integração Real com ICP-Brasil**: Substituição dos mocks de assinatura digital por chamadas reais ao PSC (Prestador de Serviço de Confiança) para garantir a validade jurídica das atas e homologações.
- **Automação de Ciclos e Notificações**: Implementação de gatilhos automáticos para abertura de ciclos e notificações via e-mail/sistema para avaliadores e avaliados, reduzindo a dependência de ações manuais do RH.
- **Refinamento da Ingestão de Dados de RH**: Melhoria no `RhIntegrationService` para suportar a sincronização bidirecional de dados de servidores e organograma, evitando inconsistências entre o módulo CAPD e o núcleo de RH.
- **Dashboard de Auditoria e Amostragem**: Implementação de visões analíticas para a Comissão CAPD permitirem a amostragem estatística de avaliações para auditoria, conforme exigido por normas de governança pública.

## Capabilities

### New Capabilities
- `capd/digital-signature`: Integração real com ICP-Brasil para assinaturas digitais de documentos e atas.
- `capd/automation`: Motor de notificações e gatilhos de ciclo (agendamentos e alertas).
- `capd/auditing`: Ferramentas de amostragem e dashboards de auditoria para a comissão.

### Modified Capabilities
- `capd`: Melhoria nos requisitos de ingestão de dados (`RhIntegrationService`) para garantir a sincronização total com o módulo de RH.

## Impact

- **Backend**: `apps/api/Modules/Capd/Services/Adapters/IcpBrasilAdapter.php` (implementação real), novos Jobs de notificação, ajustes no `RhIntegrationService`.
- **Frontend**: Novos componentes de status de assinatura em `apps/web-client/src/modules/capd` e painéis de auditoria.
- **Segurança**: Implementação de validações rigorosas de certificados digitais.
