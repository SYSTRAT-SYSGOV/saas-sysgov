# Spec Delta: capd

## ADDED Requirements

### Requirement: Capd.HomologacaoFinal.GestaoKpiExclusiva
A aba de Homologação Final no Portal da CAD SHALL gerenciar seus próprios indicadores estatísticos especializados (Situação Regimental do Ciclo, Conclusão de Avaliações pelas Chefias, Deliberação Total da Fila Recursal e Atas Seladas com SHA-256) e SHALL suprimir a exibição dos cards gerais de governança do órgão no nível do portal para eliminar poluição visual e duplicidade de informações.

#### Scenario: Visualização da aba de homologação sem cards gerais do órgão
- **WHEN** o usuário seleciona a aba "Homologação Final" no Portal da CAD
- **THEN** o container pai (`PortalCadView`) omite os cards gerais de governança (Recursos, Sessões, Portarias e Ciclo Vigente), exibindo unicamente os StatCards dedicados da homologação final

#### Scenario: Atualização dos indicadores ao alternar o ciclo
- **WHEN** o usuário seleciona um ciclo diferente no seletor de homologação
- **THEN** os StatCards atualizam instantaneamente a situação do ciclo, as avaliações concluídas, os recursos associados e as atas vinculadas

### Requirement: Capd.HomologacaoFinal.PortoesValidacao
A aba de Homologação Final SHALL exibir painel dinâmico de Portões de Validação Regimental (Audit Gates RN-C07 a RN-C09) inspecionando em tempo real: (1) Conclusão de 100% das avaliações, (2) Inexistência de recursos pendentes de julgamento, (3) Selamento de atas colegiadas com hash SHA-256 e (4) Regularidade do quórum de membros da CAD.

#### Scenario: Bloqueio da ação com portão pendente
- **WHEN** o ciclo selecionado possuir avaliações incompletas ou recursos pendentes de julgamento
- **THEN** o respectivo portão de validação exibe estado de bloqueio em cor semântica de alerta com o quantitativo pendente, e o botão de homologação permanece bloqueado

#### Scenario: Liberação da ação com conformidade integral
- **WHEN** todos os portões de validação estiverem 100% satisfeitos
- **THEN** os portões exibem indicadores verdes de conformidade e o botão de homologação final é habilitado

### Requirement: Capd.HomologacaoFinal.DespachoOutboxImutabilidade
O painel de Homologação Final SHALL fornecer detalhamento sobre o despacho assíncrono do evento `capd.ciclo_homologado` via tabela `outbox_events` e sobre a imutabilidade definitiva das notas atribuídas, exigindo confirmação através de `Modal` institucional do `@sysgov/ui` sem o uso de `window.confirm` ou `alert`.

#### Scenario: Confirmação segura de homologação definitiva
- **WHEN** o usuário clica para homologar um ciclo apto
- **THEN** o sistema exibe `Modal` institucional com aviso de irretratabilidade jurídica das notas e, após confirmação, dispara a transação de homologação, registrando auditoria e publicando o evento no Outbox
