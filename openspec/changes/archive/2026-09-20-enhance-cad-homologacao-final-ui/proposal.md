# Proposal: Aprimoramento da Aba Homologação Final e Eliminação de Cards Duplicados no Portal da CAD

## Why

No Portal da CAD (`PortalCadView.tsx`), ao acessar a aba "Homologação Final" (`activeTab === 'homologacao'`), o container continuava renderizando os cards gerais de governança do órgão (Recursos na CAD, Sessões Seladas, Portarias e Ciclo Vigente) no topo da tela, gerando duplicidade e distração visual. Além disso, a sub-aba de homologação possuía recursos visuais elementares (um card simples com checklist resumido), sem exibir indicadores específicos do ciclo selecionado, sem inspeção dinâmica dos portões obrigatórios de validação (RN-C07 a RN-C09: conclusão de 100% das avaliações, encerramento da fila recursal e atas seladas) e sem visibilidade sobre os eventos de integração do Outbox (`capd.ciclo_homologado`) e a imutabilidade jurídica das notas após o selamento definitivo.

Esta proposta elimina a duplicidade de cards para a aba de Homologação Final em `PortalCadView.tsx` e reestrutura a aba com StatCards analíticos do ciclo selecionado, checklist dinâmico de portões de homologação (audit gates), painel do despacho Outbox com rastreabilidade criptográfica e modal confirmatório institucional de fé pública.

## What Changes

- **Eliminação de Cards Conflitantes no Portal da CAD**: Atualizar `PortalCadView.tsx` para suprimir os StatCards gerais quando `activeTab === 'homologacao'`, garantindo que a aba de homologação gerencie seus próprios indicadores específicos.
- **StatCards Dedicados da Homologação**:
  - *Situação Regimental do Ciclo*: Status do ciclo selecionado (Aberto, Em Deliberação ou Homologado) com badge de conformidade e etapa do triênio (12 meses).
  - *Avaliações Concluídas*: Quantitativo e percentual de avaliações finalizadas pelas chefias imediatas (exigência de 100% conforme RN-C08).
  - *Deliberação Recursal*: Quantitativo de recursos julgados e confirmação de zero pendências (bloqueio por RN-C07 se houver recursos pendentes).
  - *Atas Colegiadas Seladas*: Quantidade de atas da CAD assinadas digitalmente com selo SHA-256 e fé pública oficial.
- **Portões de Homologação Dinâmicos (Audit Gates)**:
  - Cartões interativos verificando em tempo real: Gate 1 (100% Chefias), Gate 2 (Zero Recursos Pendentes), Gate 3 (Atas Seladas) e Gate 4 (Quórum Regimental da CAD).
  - Indicação clara de liberação ou bloqueio com justificativa do impedimento caso algum gate não esteja atendido.
- **Dossiê de Despacho Outbox e Imutabilidade Jurídica**:
  - Painel detalhando o despacho assíncrono do evento `capd.ciclo_homologado` para a Folha de Pagamento e sistema de Recursos Humanos.
  - Alerta explícito sobre a imutabilidade definitiva das notas após homologação (RN-C07 e Invariant: Avaliação homologada é imutável).
- **Ação de Homologação Segura e Confirmada**:
  - Botão de homologação com validação dos gates e acionamento do `Modal` institucional do `@sysgov/ui` sem uso de `alert()` ou `confirm()`.

## Capabilities

### Modified Capabilities
- `capd`: Requisitos de apresentação dedicada e autônoma da aba de Homologação Final no Portal da CAD, com validação de portões regimentais e gestão visual do despacho Outbox.

## Impact

- `apps/web-client/src/modules/capd/views/PortalCadView.tsx`: Ajuste da condicional de supressão dos StatCards gerais e redesign completo da sub-aba 9 de Homologação Final.
- Nenhuma alteração nos endpoints backend (utiliza `api.capd.homologarCiclo(cicloId)` e consultas de ciclo).
