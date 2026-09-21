# Proposal: Modernização da Aba de Exportação para Folha de Pagamento

## Why

A sub-aba "Exportação Folha de Pagamento" (`activeTab === 'folha-export'`) do Portal de RH e Secretaria Municipal de Gestão de Pessoas (`PortalRhView.tsx`) constitui o elo operacional indispensável entre a homologação das avaliações de desempenho funcional (CAPD) e a efetiva concessão da evolução remuneratória no sistema de folha de pagamento municipal (Lei nº 1.704/2006, Art. 17 — concessão do acréscimo funcional de 10% aos servidores com NFC ≥ 70,00 pts).

No formato atual, a interface restringe-se a um card básico e um botão único de download de CSV genérico, exibindo uma tabela TanStack com dimensionamento fixo rígido (`fixedLayout={true}`) que introduz barra de rolagem lateral horizontal no desktop. Além disso, faltam recursos indispensáveis para a gestão orçamentária: painel executivo com o impacto financeiro mensal e anual projetado (com 13º salário e terço constitucional), filtros analíticos por órgão/cargo/elegibilidade/faixa de impacto, pílulas de acesso rápido e suporte a múltiplos formatos de arquivos aceitos pelos principais ERPs públicos municipais (Betha Sistemas, IPM Atende.Net, Governa e CECAM).

## What Changes

- **Módulo Utilitário de Inteligência Financeira (`PortalRhView.folha.ts`)**: Estruturar interfaces tipadas (`ItemFolhaExport`, `FiltrosFolhaExport`, `KpisFolhaExport`), regras de cálculo do impacto em centavos inteiros (`cents`), lógica de filtragem multi-critério e geradores de leiaute CSV específicos para conectores ERP (Padrão, Betha, IPM e Governa).
- **Painel Executivo de KPIs Orçamentários**: Barra superior com 4 cartões de indicadores consolidados (Folha Base Atual, Impacto Mensal do Reajuste, Impacto Anual Projetado com 13º e 1/3 Férias, e Servidores Homologados vs Retidos em PMD), formatados estritamente na tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`).
- **Barra de Busca Rápida & Quick Filters**: Campo de pesquisa instantânea por texto (nome, matrícula, CPF, cargo, órgão) e pílulas de navegação rápida em 1 clique ("Todos", "Aptos ao Reajuste (+10%)", "Retidos (PMD)", "Impacto Alto (> R$ 600/mês)", "Estatutários").
- **Painel Colapsável de Filtros Avançados**: Seletores dinâmicos de Secretaria, Departamento contextualizado, Cargo Efetivo, Faixa Salarial Atual, Faixa de Impacto da Evolução e Situação de Homologação, com contador de filtros ativos e botão de redefinição.
- **Exportação Multi-Formato para ERPs Municipais**: Modal ou menu de ação rápida permitindo ao operador de RH baixar o arquivo específico para o conector de destino (Betha Sistemas, IPM Atende.Net, Governa/CECAM ou CSV Universal Delimitado).
- **Grid DataTable Fluido e Otimizado**: Reconfiguração do `DataTable` com dimensionamento responsivo sem `fixedLayout` rígido, eliminando a barra de rolagem horizontal no desktop, com badges de status de concessão e colunas atômicas com `exportOnly: true` para exportação limpa.

## Capabilities

### New Capabilities
<!-- Nenhuma nova capability de alto nível; estende a capacidade existente do módulo CAPD -->

### Modified Capabilities
- `capd`: Incorporar requisitos normativos para exportação especializada para ERPs de folha de pagamento, consolidação do impacto orçamentário mensal e anualizado, filtros financeiros avançados e visualização fluida no Portal de RH.

## Impact

- **Código Frontend**:
  - Criação de `apps/web-client/src/modules/capd/views/PortalRhView.folha.ts` para isolamento de cálculos e geradores de arquivos.
  - Criação da suíte de testes unitários `apps/web-client/src/modules/capd/views/__tests__/PortalRhView.folha.test.ts`.
  - Refatoração de `PortalRhView.tsx` na sub-aba `folha-export` para incorporação dos novos KPIs, filtros e tabela fluida.
- **Compatibilidade e Auditoria**: Manutenção da integridade com as demais abas e preservação dos cálculos em centavos inteiros (`int cents`), em estrita conformidade com a convenção de segurança monetária do SYSGOV.
