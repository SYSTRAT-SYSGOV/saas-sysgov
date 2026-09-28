# Tarefas de Implementação: Seleção de Necrópole e Administração Geral

## 1. Contexto e Gerenciador de Estado de Necrópole

- [x] 1.1 Atualizar `CemiteriosContext.tsx` para gerenciar lista de cemitérios disponíveis, cemitério ativo (`cemiterioAtivoId`), modo de visualização (`'selecao' | 'administracao_geral' | 'gestao_necropole'`) e perfil de gestor municipal (`isGestorMunicipal`). Verificar via tipagem TypeScript `tsc --noEmit`.
- [x] 1.2 Implementar lógica de triagem inicial (gatekeeper) no `CemiteriosContext.tsx`: se houver apenas 1 cemitério autorizado, auto-selecioná-lo e abrir direto em `gestao_necropole`; se houver múltiplos, iniciar em `selecao`. Verificar comportamento com mock de dados no teste de unidade.
- [x] 1.3 Adicionar métodos de controle no contexto: `selecionarCemiterio(id)`, `abrirAdministracaoGeral()`, `voltarParaSelecao()`. Verificar exportação e cobertura de chamadas no contexto.

## 2. Componente de Seleção Inicial de Necrópole (`SelecaoNecropoleView`)

- [x] 2.1 Criar o componente `SelecaoNecropoleView.tsx` utilizando componentes `@sysgov/ui` (`Card`, `Badge`, `Button`, `Input`).
- [x] 2.2 Implementar barra de busca para filtrar cemitérios por nome, código ou bairro em tempo real. Verificar filtro interativo.
- [x] 2.3 Renderizar grid de cards de cemitérios exibindo nome, endereço, badge de status e barra de capacidade (jazigos ocupados vs disponíveis) com tipografia `JetBrains Mono` (`font-mono tabular-nums`).
- [x] 2.4 Renderizar banner de destaque com atalho para o painel de "Administração Geral Municipal" quando o usuário for gestor municipal.
- [x] 2.5 Vincular o clique no card do cemitério à ação `selecionarCemiterio(id)` com transição suave para a gestão da necrópole.

## 3. Painel de Administração Geral Municipal (`AdministracaoGeralView`)

- [x] 3.1 Criar o componente `AdministracaoGeralView.tsx` com cabeçalho executivo e botão de retorno/navegação rápida para necrópoles individuais.
- [x] 3.2 Implementar seção de KPIs consolidados no topo (total de cemitérios municipais, jazigos totais, taxa média de ocupação global, sepultamentos no mês e exumações previstas) usando `StatCard` / `Card` do `@sysgov/ui` e `font-mono tabular-nums`.
- [x] 3.3 Implementar aba/seção de **Comparativo de Necrópoles** com tabela detalhada contendo capacidade, ocupação percentual e botão de atalho "Acessar Gestão" para cada cemitério.
- [x] 3.4 Implementar aba/seção de **Financeiro Consolidado** exibindo arrecadação municipal de taxas de concessão, renovações e manutenções anuais agregadas com formatação em R$ (`JetBrains Mono`).
- [x] 3.5 Implementar aba/seção de **Manutenções e Ocorrências Municipais** listando ordens de serviço e intervenções pendentes em todas as necrópoles do município.

## 4. Cabeçalho Contextual com Switcher de Necrópole (`NecropoleHeaderBar`)

- [x] 4.1 Criar o componente `NecropoleHeaderBar.tsx` para ser renderizado no topo quando um cemitério estiver selecionado.
- [x] 4.2 Exibir nome da necrópole ativa, badge de status operacional e indicador resumido de ocupação.
- [x] 4.3 Implementar dropdown interativo com lista das outras necrópoles para troca instantânea de contexto (habilitado para usuários com múltiplos cemitérios ou gestores).
- [x] 4.4 Incluir no dropdown ou na barra um botão de atalho para "Administração Geral" (quando autorizado) ou "Trocar Cemitério" (para retornar à tela inicial de seleção).

## 5. Orquestração no Módulo Principal (`CemiteriosModule`)

- [x] 5.1 Refatorar `CemiteriosModule.tsx` para envolver as views com o `CemiteriosProvider` atualizado.
- [x] 5.2 Renderizar condicionalmente a view com base no `modoVisao`:
  - `modoVisao === 'selecao'`: renderiza `SelecaoNecropoleView`.
  - `modoVisao === 'administracao_geral'`: renderiza `AdministracaoGeralView`.
  - `modoVisao === 'gestao_necropole'`: renderiza `NecropoleHeaderBar` + abas funcionais do cemitério ativo (`visao_geral`, `inventario`, `concessoes`, `operacoes`, `vistorias`, `mapa`, `financeiro`, `empreiteiros`).
- [x] 5.3 Garantir que a troca de cemitério atualize o filtro de dados e o estado dos componentes filhos sem quebras de renderização.

## 6. Testes Automatizados e Validação de Conformidade

- [x] 6.1 Criar testes unitários para `CemiteriosContext.test.tsx` cobrindo o fluxo de necrópole única (auto-seleção) e múltiplos cemitérios (abertura na seleção).
- [x] 6.2 Criar testes unitários para `SelecaoNecropoleView.test.tsx` validando busca, renderização de cards e disparo de seleção.
- [x] 6.3 Criar testes unitários para `AdministracaoGeralView.test.tsx` validando renderização de métricas municipais consolidadas e atalhos de necrópole.
- [x] 6.4 Criar testes unitários para `NecropoleHeaderBar.test.tsx` validando o alternador (switcher) de cemitérios.
- [x] 6.5 Executar suite de testes do módulo `npm test -- --run src/modules/cemiterios` e checagem de tipos `npx tsc --noEmit` garantindo 100% de sucesso.
