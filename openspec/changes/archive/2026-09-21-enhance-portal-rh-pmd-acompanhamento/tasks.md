# Tasks: Modernização da Aba de Acompanhamento de PMD (DRH)

## 1. Backend e Suporte a Servidor em PMD

- [x] 1.1 Adicionar o relacionamento Eloquent `servidor(): BelongsTo` no model `apps/api/Modules/Capd/Models/PlanoMelhoria.php`.
- [x] 1.2 Atualizar o método `listar()` em `apps/api/Modules/Capd/Services/PmdService.php` para incluir `servidor:id,nome_completo,matricula,cargo_efetivo,orgao_lotacao` no eager loading.
- [x] 1.3 Atualizar o método `show()` em `apps/api/Modules/Capd/Http/Controllers/PmdController.php` para carregar o relacionamento `servidor`.

## 2. Utilitários Puros e Testes Automatizados

- [x] 2.1 Criar o módulo utilitário `apps/web-client/src/modules/capd/PmdPanel.utils.ts` contendo as interfaces `KpisPmd`, `FiltrosPmd` e `UrgenciaPrazo`.
- [x] 2.2 Implementar a função pura `calcularKpisPmd` para apuração de totais de planos ativos, superados, taxa de recuperação funcional (%) e alertas de prazos.
- [x] 2.3 Implementar a função pura `calcularUrgenciaPrazo` para classificação temporal (vencido, vence em breve ou regular).
- [x] 2.4 Implementar a função pura `calcularDeltaEvolucao` para cálculo da variação de pontuação e validação da nota de corte (≥ 70,00 pts).
- [x] 2.5 Implementar a função pura `filtrarPmds` com suporte a busca textual multivariada e filtros combinados de status e urgência.
- [x] 2.6 Implementar a função pura `gerarCsvPmd` com codificação UTF-8 com BOM (`\uFEFF`) e cabeçalhos oficiais em português.
- [x] 2.7 Criar a suíte de testes unitários `apps/web-client/src/modules/capd/__tests__/PmdPanel.utils.test.ts` cobrindo 100% das funções puras.
- [x] 2.8 Validar os testes no Vitest com `npx vitest run src/modules/capd/__tests__/PmdPanel.utils.test.ts`.

## 3. Painel de KPIs Executivos e Filtros Avançados

- [x] 3.1 Construir a barra de 4 cartões `StatCard` no topo do componente com destaques semânticos em âmbar (ativos) e esmeralda (superados).
- [x] 3.2 Implementar barra de ferramentas com campo de busca preditiva (`SearchInput` / `Input`), seletor de status e seletor de urgência temporal.
- [x] 3.3 Adicionar botões de ação para recarregar dados e efetuar download da planilha CSV com dados formatados.

## 4. Listagem Analítica com DataTable

- [x] 4.1 Estruturar a listagem de planos com o componente `DataTable` oficial de `@sysgov/ui`, provendo paginação configurável (`pageSizeSelector`).
- [x] 4.2 Configurar colunas analíticas: Servidor (Nome + Matrícula em `font-mono tabular-nums`), Ciclo / NFC Gatilho, Progresso de Ações, Prazo com badges semânticos de urgência, Status (`StatusChip`) e Ações.
- [x] 4.3 Assegurar layout responsivo sem barras de rolagem horizontais supérfluas.

## 5. Modais de Evolução e Detalhes

- [x] 5.1 Modernizar o modal de registro de evolução com painel comparativo Antes vs Depois, cálculo de delta e indicador de superação da nota de corte.
- [x] 5.2 Aprimorar o modal de detalhes com ficha do servidor, histórico de auditoria e checklist visual de ações acordadas.

## 6. Verificação Final e Conformidade

- [x] 6.1 Executar a suíte completa de testes unitários do módulo CAPD com `npx vitest run src/modules/capd` garantindo 100% de aprovação.
- [x] 6.2 Executar a checagem estática de tipos com `npx tsc --noEmit` garantindo zero erros no workspace `web-client`.
- [x] 6.3 Validar a conformidade com o Design System oficial do SYSGOV, ausência de diálogos nativos e tipografia em `JetBrains Mono`.
