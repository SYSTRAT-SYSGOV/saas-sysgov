# Tasks: Modernização da Aba de Pendências de Hierarquia (DRH)

## 1. Utilitários Puros e Testes Automatizados

- [x] 1.1 Criar o módulo utilitário `apps/web-client/src/modules/capd/PendenciasHierarquiaPanel.utils.ts` contendo os tipos `KpisPendencias`, `FiltrosPendencias` e as funções puras de manipulação.
- [x] 1.2 Implementar a função pura `calcularKpisPendencias` que calcula total de abertas, total de resolvidas, taxa de saneamento e distribuição por tipo de pendência.
- [x] 1.3 Implementar a função pura `filtrarPendencias` com suporte a busca textual (nome, matrícula e motivo) e filtros combinados de status, tipo e ciclo.
- [x] 1.4 Implementar a função pura `gerarCsvPendencias` com cabeçalhos padronizados em português e codificação UTF-8 com BOM (`\uFEFF`) para exportação sem distorções no Excel.
- [x] 1.5 Criar a suíte de testes unitários `apps/web-client/src/modules/capd/__tests__/PendenciasHierarquiaPanel.utils.test.ts` cobrindo cenários de cálculo, filtragem e geração de CSV.
- [x] 1.6 Executar os testes unitários via Vitest com `npx vitest run src/modules/capd/__tests__/PendenciasHierarquiaPanel.utils.test.ts` garantindo 100% de sucesso.

## 2. Painel de KPIs e Filtros Avançados

- [x] 2.1 Construir a barra executiva de 4 cartões de indicadores no topo do painel (`StatCard` / `Card` com destaque em âmbar para abertas e esmeralda para resolvidas).
- [x] 2.2 Adicionar indicador de taxa de saneamento com percentual em `JetBrains Mono` (`font-mono tabular-nums`) e badge com resumo dos tipos de inconsistência.
- [x] 2.3 Implementar barra de ferramentas com campo de busca textual rápida (filtro preditivo), seletor de status ("Abertas", "Resolvidas", "Todas") e seletor de tipo de pendência.
- [x] 2.4 Adicionar botão de atualização de dados e botão de ação para exportação em CSV.

## 3. Listagem Analítica com DataTable

- [x] 3.1 Substituir a tabela HTML estática pelo componente canônico `DataTable` de `@sysgov/ui`, provendo paginação com seletor de tamanho de página (`pageSizeSelector`).
- [x] 3.2 Estruturar colunas analíticas: Servidor (Nome + Matrícula em `font-mono tabular-nums`), Ciclo Avaliativo, Categoria com badge semântico colorido, Diagnóstico com tooltip descritivo, Status (`StatusChip`) e Dados de Resolução (Avaliador + Data/Hora em `font-mono tabular-nums`).
- [x] 3.3 Configurar layout fluido garantindo ausência de barras de rolagem horizontais indesejadas e ótima visualização em todas as resoluções.

## 4. Modal de Resolução Assistido e Seguro

- [x] 4.1 Substituir a entrada de texto bruta de ID numérico por um modal humanizado com ficha de identificação do servidor afetado e diagnóstico emitido pelo motor de hierarquia.
- [x] 4.2 Implementar seletor/busca de avaliador com listagem e filtragem de usuários gestores disponíveis.
- [x] 4.3 Inserir caixa informativa de alerta destacando o impacto da designação (transferência automática das avaliações não-homologadas em andamento).
- [x] 4.4 Integrar a confirmação com o endpoint `api.capd.resolverPendenciaHierarquia` exibindo estado de carregamento e mensagens de sucesso/erro claras.

## 5. Verificação Final e Conformidade

- [x] 5.1 Executar a suíte de testes unitários do módulo CAPD com `npx vitest run src/modules/capd` garantindo 100% dos testes verdes.
- [x] 5.2 Executar a checagem estática de tipos com `npx tsc --noEmit` no workspace `apps/web-client` garantindo zero erros.
- [x] 5.3 Validar a aderência aos contratos visuais de `@sysgov/ui`, ausência de diálogos nativos do navegador (`window.confirm`/`alert`) e tipografia em `JetBrains Mono`.
