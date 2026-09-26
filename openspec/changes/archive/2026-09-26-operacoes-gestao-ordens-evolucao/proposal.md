# Proposta: Evolução da Aba de Operações com DataTables, Filtros Avançados e Métricas Operacionais

## Motivação

A aba de Operações do módulo de Cemitérios (`OperacoesView.tsx`) atualmente disponibiliza apenas visualizações simplificadas em cartões básicos para Ordens de Serviço e tabelas elementares para Inumações e Exumações, sem suporte a paginação robusta, métricas consolidadas (KPIs), alternância de layout (tabela versus cartões de campo), filtros avançados por múltiplos critérios (tipo de operação, situação da OS, período agendado/executado, equipe responsável e busca global) ou modal de detalhes aprofundados da OS.

Com o crescimento das demandas de gestão cemiterial nos municípios, a equipe de administração e os fiscais de campo necessitam de uma central de controle operacional completa e moderna. Essa evolução tornará a aba de Operações tão rica, produtiva e integrada quanto a aba de Inventário, permitindo que operadores gerenciem todo o fluxo de sepultamentos, exumações, trasladações e ordens de serviço com máxima rastreabilidade, ordenação, busca instantânea e exportação.

## O Que Muda

- **Painel Superior de Métricas Operacionais (KPIs)**:
  - Total de Ordens de Serviço em aberto (emitidas e em execução).
  - Operações agendadas para execução no dia de hoje.
  - Total de inumações/sepultamentos confirmados no mês vigente.
  - Total de exumações e trasladações em andamento ou sob carência legal.
- **Evolução da Visão de Ordens de Serviço (OS)**:
  - Implementação de alternância dinâmica entre visualização em **Tabela Estruturada (`DataTable`)** e visualização em **Cartões de Campo (`Cards`)** otimizada para dispositivos móveis e tablets da equipe de campo.
  - Adição de colunas completas: Número/Ano, Tipo de Operação, Jazigo/Sepultura vinculada, Falecido, Data Agendada, Equipe/Responsável, Situação e Ações rápidas.
  - Painel de **Filtros Avançados**:
    - Busca textual unificada (nº OS, nome do falecido, código do túmulo).
    - Filtro por Situação (Emitida, Em Execução, Concluída, Suspensa, Cancelada, ou Todas).
    - Filtro por Tipo de Operação (Inumação, Exumação Ordinária, Exumação Judicial, Trasladação, Manutenção).
    - Filtro por Período de Agendamento/Execução (Data Inicial e Data Final).
    - Filtro por Equipe/Encarregado.
  - Modal de **Detalhes Completos da Ordem de Serviço**:
    - Exibição de dados operacionais, informações do falecido, vínculo com o jazigo, histórico de transições de status com justificativas de suspensão/cancelamento e atalho para download da guia em PDF.
- **Evolução da Visão de Inumações**:
  - `DataTable` expandida com ordenação, busca inteligente, seleção de paginação (10, 25, 50, 100 itens) e exportação para CSV.
  - Colunas enriquecidas: Falecido, Idade/Nascimento, Data/Hora do Sepultamento, Cemitério, Jazigo, Gaveta/Nicho, Coveiro/Pedreiro, Cartório/Certidão, Situação e Ações rápidas.
  - Filtros avançados para inumações: busca por falecido ou certidão, filtro por cemitério ativo, filtro de pendência de revisão histórica e filtro por período de sepultamento.
  - Botão de ação rápida para abrir a ficha completa do túmulo diretamente da listagem de inumações.
- **Evolução da Visão de Exumações e Trasladações**:
  - Tabela avançada de exumações com prazo legal de carência, status sanitário, juízo/processo (no caso judicial) e motivo de eventuais suspensões.
  - Sub-aba ou visão dedicada para histórico de **Trasladações** (origem, jazigo de destino ou destino externo intermunicipal e documentação comprobatória).

## Capacidades

### Novas Capacidades
- `cemiterio/operacoes-ordens-servico`: Gestão completa do ciclo de vida das ordens de serviço (OS), inumações, exumações e trasladações, com métricas operacionais (KPIs), alternância de visualização em DataTable/Cards, filtros avançados e rastreabilidade total de campo.

### Capacidades Modificadas
<!-- Nenhuma especificação anterior teve seus requisitos alterados; trata-se de evolução funcional da central de operações -->

## Impacto

- **Frontend (`apps/web-client`)**:
  - Atualização de `OperacoesView.tsx` no módulo de Cemitérios.
  - Criação de novos subcomponentes modulares: `OperacoesKpis.tsx`, `OrdensServicoDataTable.tsx`, `ModalDetalheOrdemServico.tsx` e `FiltrosAvancadosOperacoes.tsx`.
  - Reutilização estrita dos componentes do `@sysgov/ui` (`DataTable`, `KpiCard`, `Modal`, `Button`, `Select`, `Input`, `StatusChip`, `Tabs`).
- **Backend (`apps/api`)**:
  - Verificação e garantia de filtros abrangentes no `OrdemServicoController.php` e `OperacaoController.php` (filtros por período de data `agendada_de` / `agendada_ate`, `equipe`, `busca` de falecido/jazigo).
- **Testes**:
  - Criação de testes unitários para os novos componentes da aba de Operações garantindo 100% de cobertura das transições de status e filtros.
