# Tasks

## 1. Painel Superior de Indicadores (KPIs no Padrão CAPD)

- [x] 1.1 Criar o componente `InventarioKpis.tsx` utilizando os componentes `StatCard` de `@sysgov/ui` com acentuações semânticas nas bordas (`border-l-4`), tipografia técnica em JetBrains Mono e verificar visualmente a renderização das 6 métricas essenciais (Total, Disponíveis, Concedidos, Ocupados, Capacidade Máxima, Em Manutenção).
- [x] 1.2 Implementar a agregação dinâmica e reativa de métricas por cemitério/setor e verificar via teste unitário que os totais e percentuais de ocupação recalculam de forma correta.

## 2. Painel de Filtros Avançados e Integração de Estado

- [x] 2.1 Criar o componente `InventarioFiltros.tsx` com seletores de Cemitério, Setor/Quadra em cascata, Tipo de Unidade, Estado Operacional, Faixa de Ocupação e Busca Textual, verificando que trocar de cemitério redefine o setor selecionado quando incompatível.
- [x] 2.2 Adicionar botões de ação rápida para "Limpar Filtros", chip de contagem de registros filtrados e verificar que o estado da tabela é atualizado instantaneamente ao alterar os filtros.

## 3. DataTable Avançada de Unidades de Sepultamento

- [x] 3.1 Refatorar a listagem de jazigos em `InventarioView.tsx` para utilizar o componente padrão `DataTable` com colunas completas (Código formatado em Mono, Cemitério, Setor, Tipo, Barra visual de Ocupação/Capacidade, Dimensões, Estado em `EstadoChip` e Ações).
- [x] 3.2 Configurar os metadados de ordenação (`meta.sortValue`) e exportação (`meta.exportValue`) para CSV, XLSX e PDF e verificar via teste automatizado de renderização que a exportação e ordenação funcionam perfeitamente.
- [x] 3.3 Configurar opções de paginação (10, 25, 50, 100 itens) e empty state padronizado do Design System.

## 4. Drawer de Detalhes Aprofundado e Ações Rápidas

- [x] 4.1 Enriquecer o componente `DetalheJazigo` com seções organizadas para Dados Físicos, Concessão Ativa (titular, tipo e vigência), Lista de Ocupantes inumados e Linha do Tempo histórica de eventos.
- [x] 4.2 Integrar a ação de transição assistida para "Em Ruína/Manutenção" com modal de confirmação, justificativa obrigatória e tratamento de concorrência otimista (`lock_version`).

## 5. Verificação, Testes e Conformidade com Design System

- [x] 5.1 Desenvolver suíte de testes em Vitest para os novos componentes de inventário (`InventarioKpis.test.tsx` e `InventarioFiltros.test.tsx`), garantindo 100% dos testes verdes.
- [x] 5.2 Executar `npm test --workspace apps/web-client` e validar conformidade estrita com `DESIGN_SYSTEM.md` (Dark Navy / Gov.br, sem CSS ad-hoc, dados técnicos sempre em JetBrains Mono).
