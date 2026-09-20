# Tasks

## 1. Eliminação de Cards Duplicados

- [x] 1.1 Atualizar condicional de StatCards em `PortalCadView.tsx` para suprimir cards genéricos do órgão quando `activeTab === 'escalas'` e verificar ausência de duplicação visual.

## 2. Redesign da Régua Contínua de Desempenho

- [x] 2.1 Reestruturar a trilha gráfica da régua contínua em `EscalaGraficaPanel.tsx` com altura proporcional, divisores nítidos e marcas de corte numéricas, eliminando textos colidentes internos.
- [x] 2.2 Adicionar cursor/ponteiro interativo dinâmico (pin) na régua contínua sincronizado em tempo real com o slider do simulador.
- [x] 2.3 Redesenhar a grade de cartões de níveis (G1 a G5) abaixo da régua com alturas equalizadas, badges de grau, rótulos conceituais, intervalos em `font-mono tabular-nums`, nota escalar e status da Trava Antileniência.

## 3. Enriquecimento e Funcionalidades Adicionais da Aba

- [x] 3.1 Adicionar botão de alternância de modo de visualização ("Visão Régua Gráfica" vs "Visão Tabela Regimental") no `EscalaGraficaPanel.tsx`.
- [x] 3.2 Implementar ação "Copiar Resumo para Ata da CAD" com texto formatado formal e feedback visual de cópia.

## 4. Validação e Testes

- [x] 4.1 Executar verificação de tipos TypeScript (`npm run typecheck`) e vitest (`npm test`) em `apps/web-client` garantindo integridade visual e funcional.
