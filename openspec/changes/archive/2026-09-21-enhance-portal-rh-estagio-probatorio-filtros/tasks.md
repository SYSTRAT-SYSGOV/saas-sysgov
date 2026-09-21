# Tasks

## 1. Funções Puras e Testes Unitários de Estágio Probatório

- [x] 1.1 Criar a interface `FiltrosEstagioProbatorio` e a função pura `filtrarServidoresEstagio` em `apps/web-client/src/modules/capd/views/PortalRhView.quadro.ts`, cobrindo busca textual, fase do estágio (1ª, 2ª e 3ª fase), secretaria, departamento, status do estágio e avaliação no ciclo atual. Verificar com testes unitários no Vitest em `PortalRhView.quadro.test.ts`.
- [x] 1.2 Implementar a função pura `calcularKpisEstagioProbatorio` calculando o total em estágio, contagens e percentuais das 3 fases (12m, 24m e 36m) e índice de avaliações realizadas no ciclo. Verificar com testes unitários no Vitest.

## 2. Redesenho de Colunas e Otimização do Grid (Sem Scroll Horizontal)

- [x] 2.1 Criar a definição de colunas `columnsEstagioProbatorio` em `PortalRhView.tsx` especializada na trajetória probatória: Servidor Público (Matrícula mono + Nome + CPF), Cargo & Admissão, Lotação Institucional (Secretaria + Departamento), Fase do Estágio & Interstício (badge de fase com status e prazo final), Chefia Imediata e Ações (Avaliação / Dossiê).
- [x] 2.2 Configurar `meta.exportHeader` e `meta.exportValue` em cada coluna para garantir que exportações em CSV, Excel e PDF contenham todas as informações cadastrais e de fase de forma atômica e estruturada.
- [x] 2.3 Ajustar larguras e eliminar travas rígidas de largura mínima (`min-w-[...]`), assegurando que a tabela caiba fluidamente em 100% do container sem gerar barra de rolagem lateral (scroll horizontal) no desktop (>= 1024px). Verificar com `npm run typecheck`.

## 3. Barra de Ferramentas, Quick Filters e Filtros Avançados

- [x] 3.1 Implementar barra de busca rápida combinada com pílulas de acesso rápido (*Quick Filters*: "Todos em Estágio", "1ª Fase", "2ª Fase", "3ª Fase" e "Avaliação Pendente") na aba de Estágio Probatório com alternância instantânea.
- [x] 3.2 Construir o painel colapsável de Filtros Avançados com os seletores: Secretaria (organograma real), Departamento (contextual à secretaria), Fase do Estágio, Status Probatório, Situação Funcional e Avaliação no Ciclo Atual, acompanhado de botão "Limpar Filtros".
- [x] 3.3 Integrar o contador dinâmico de registros em tempo real ("Exibindo X de Y servidores em estágio") e tratamento de estado vazio.

## 4. Cabeçalho Executivo de KPIs e Verificação Final

- [x] 4.1 Inserir no topo da aba "Acompanhamento do Estágio Probatório" o painel com 4 cartões de KPIs dinâmicos (Total em Estágio, 1ª Fase / 12 meses, 2ª Fase / 24 meses e 3ª Fase / 36 meses), com tipografia técnica obrigatória `font-mono tabular-nums` e paleta oficial do Design System SYSGOV.
- [x] 4.2 Executar a validação automatizada de tipagem (`npm run typecheck`) e a suíte completa de testes no Vitest (`npx vitest run`), garantindo ausência de regressões.
- [x] 4.3 Realizar a validação manual dos fluxos de interação na aba Estágio Probatório: aplicar filtros por fase, checar ausência de rolagem horizontal no desktop, acionar modal de detalhes e testar exportação.
