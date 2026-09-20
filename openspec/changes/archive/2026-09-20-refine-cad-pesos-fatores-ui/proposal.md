# Proposal: Aprimoramento da Aba Pesos dos Fatores e Eliminação de Cards Duplicados no Portal da CAD

## Why

No Portal da CAD (`PortalCadView.tsx`), ao acessar a aba "Pesos dos Fatores (100%)", a visualização apresentava cards gerais de governança (Recursos na CAD, Sessões Seladas, Portarias e Ciclo Vigente) no topo da página que nada tinham a ver com a parametrização de pesos dos fatores, poluindo visualmente a interface e duplicando informações conceituais. Além disso, o painel de pesos (`FatoresPesosPanel.tsx`) possuía recursos visuais limitados, sem KPIs dedicados à ponderação, sem barra visual de distribuição e sem presets rápidos de configuração ou ferramentas de balanceamento automático de percentuais para conformidade com o teto de 100% (RF-02 e RF-06 da Lei nº 1.704/2006).

Esta proposta moderniza integralmente a aba de Pesos dos Fatores, suprime os cards genéricos do órgão para a aba `pesos` no `PortalCadView`, e entrega em `FatoresPesosPanel` um ambiente completo, visual e interativo com KPIs dedicados, régua de distribuição fatiada dos 100%, botões de presets ponderados e balanceamento automático em 1 clique.

## What Changes

- **Eliminação de Cards Conflitantes/Duplicados no Portal da CAD**: Ajustar `PortalCadView.tsx` para que a aba `pesos` gerencie seus próprios cards estatísticos de forma autônoma (assim como já ocorre em `perguntas` e `escalas`), suprimindo os cards gerais de governança do órgão que poluiam a tela.
- **KPI Cards Dedicados em `FatoresPesosPanel`**:
  - *Soma Total dos Pesos*: Indicador de conformidade com os 100,00% obrigatórios, exibindo badge semântica (Regular / Pendente de Ajuste) e valor em `JetBrains Mono` (`font-mono tabular-nums`).
  - *Total de Fatores Ativos*: Quantidade de critérios ponderados associados ao modelo de formulário.
  - *Fator H (Atendimento ao Público)*: Status do fator redistribuível (ativo/inativo, percentual alocado e regra de redistribuição proporcional do Art. 18 / RF-06).
  - *Média Ponderada por Fator*: Média percentual distribuída entre os fatores cadastrados.
- **Régua Visual de Fatiamento dos Pesos (Visual Stacked Bar)**: Exibição visual contínua de 0 a 100% mostrando graficamente como os fatores preenchem o total, com cores harmoniosas e tooltips/labels informativos.
- **Ações de Produtividade e Presets de Balanceamento**:
  - *Presets Canônicos*: Botões para aplicar em 1 clique distribuições canônicas (ex: Distribuição Equitativa entre Fatores, Distribuição Foco Técnico/Desempenho).
  - *Balancear Automaticamente*: Ação inteligente para equalizar a soma dos fatores selecionados em exatamente 100,00% em caso de diferenças residuais.
  - *Resetar para Padrão*: Reverter aos pesos originais do modelo sem salvar no banco.
- **Refinamento da Tabela de Fatores e Pesos**:
  - Componentes canônicos do `@sysgov/ui` (`Table`, `Card`, `Badge`, `Switch`, `Input`, `Button`).
  - Todos os dados numéricos, percentuais e códigos em tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
  - Indicador visual claro sobre a redistribuição automática do Fator H para servidores sem atendimento ao público.

## Capabilities

### Modified Capabilities
- `capd`: Adicionar requisitos de integridade visual e gestão autônoma de KPIs da aba de Pesos dos Fatores no Portal da CAD, assegurando a supressão de cards duplicados e a presença de ferramentas de visualização fatiada e balanceamento dos 100%.

## Impact

- `apps/web-client/src/modules/capd/views/PortalCadView.tsx`: Ajustar condicional de exibição de StatCards no topo do portal para a aba `pesos`.
- `apps/web-client/src/modules/capd/FatoresPesosPanel.tsx`: Redesenho visual completo do painel com KPIs dedicados, barra de distribuição acumulada e utilitários de balanceamento rápido.
- Nenhuma alteração de schema de banco de dados ou contratos de API backend (utiliza os endpoints existentes `listFatoresPesos` e `syncFatoresPesos`).
