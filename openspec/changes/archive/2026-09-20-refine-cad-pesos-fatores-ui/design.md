# Design: Refinamento da Interface de Pesos dos Fatores e Supressão de Cards Conflitantes

## Context

Atualmente, `PortalCadView.tsx` renderiza um bloco ternário para os cards de KPIs no topo da tela. Quando `activeTab` não coincide com `julgamento`, `sessoes`, `comissao`, `ciclos`, `perguntas` ou `escalas`, a condição recai no bloco genérico `"CARDS GERAIS DE GOVERNANÇA DO ÓRGÃO"`. Isso fazia com que a aba `pesos` exibisse cards de Recursos, Sessões, Portarias e Ciclos.

Além disso, `FatoresPesosPanel.tsx` continha apenas um banner simples de soma de percentuais e a tabela básica de fatores, sem visão estatística própria, sem barra de distribuição e sem facilidades para balanceamento de pesos.

Ver motivação detalhada em `proposal.md` e requisitos em `specs/capd/spec.md`.

## Goals / Non-Goals

**Goals:**
- Ajustar a condicional de exibição de StatCards em `PortalCadView.tsx` para tratar `activeTab === 'pesos'` de modo que não exiba os cards de governança geral.
- Construir em `FatoresPesosPanel.tsx` 4 cards de KPIs dedicados com componentes canônicos `@sysgov/ui` (`StatCard` ou `Card`), integrados diretamente ao estado dos fatores do modelo selecionado.
- Implementar uma barra visual empilhada (Stacked Bar) de 0% a 100% que mostre a proporção de cada fator de avaliação com paleta cromática semântica do SYSGOV.
- Implementar botões de utilitários rápidos de ponderação: "Balancear em 100%", "Distribuição Equitativa" e "Restaurar Original".
- Manter estrita conformidade com `AGENTS.md` e `DESIGN_SYSTEM.md` (tipografia `JetBrains Mono` / `font-mono tabular-nums` para percentuais e valores numéricos).

**Non-Goals:**
- Modificar tabelas de banco de dados ou endpoints da API REST no backend (o payload de sincronização `api.capd.syncFatoresPesos` permanece inalterado).
- Permitir soma diferente de 100,00% na persistência (a trava de integridade da Lei nº 1.704/2006 continua bloqueando gravações inconsistentes).

## Decisions

### Decisão 1: Autonomia de Cards no Painel da Aba vs Topo do Portal
- **Decisão**: A aba `pesos` em `PortalCadView.tsx` será adicionada à verificação que suprime os cards gerais do órgão (`activeTab === 'perguntas' || activeTab === 'escalas' || activeTab === 'pesos' ? null : ...`). Os cards estatísticos pertinentes à ponderação residirão dentro de `FatoresPesosPanel.tsx`.
- **Racional**: Garante coesão visual e funcionalidade contextualizada. Quando o usuário troca o modelo de formulário no seletor de `FatoresPesosPanel`, os cards estatísticos e a régua de distribuição atualizam instantaneamente, sem necessidade de prop-drilling ou replicação de estado no `PortalCadView`.
- **Alternativas consideradas**:
  - *Elevar o estado do modelo para `PortalCadView`*: Criaria acoplamento desnecessário e tornaria o arquivo `PortalCadView.tsx` ainda mais inflado.

### Decisão 2: Barra Visual Empilhada Ponderada (0% a 100%)
- **Decisão**: Criar componente interno ou visualizador que renderiza uma barra flex com largura percentual proporcional ao `fator.peso`. Segmentos com menos de 3% exibirão o rótulo reduzido ou via tooltip para evitar quebra de layout.
- **Racional**: Proporciona entendimento imediato de qual competência tem maior impacto na pontuação final do servidor no estágio probatório.

### Decisão 3: Algoritmo de Auto-Balanceamento
- **Decisão**: O auto-balanceamento distribuirá o resíduo $(100 - \sum P_i)$ proporcionalmente aos pesos atuais dos fatores ativos. Se a soma for zero, distribui igualmente entre os $N$ fatores ativos com arredondamento em 2 casas decimais, atribuindo eventuais centésimos de ajuste no último fator para garantir rigorosamente 100,00%.
- **Racional**: Evita que o gestor da CAD precise calcular manualmente frações de porcentagem para atingir a conformidade exigida pelo sistema.

## Risks / Trade-offs

- **[Risco]** Erros de arredondamento em dízimas periódicas (ex: 3 fatores com 33,33% somam 99,99%).
  - *Mitigação*: O cálculo do auto-balanceamento compensa a diferença de $\pm 0,01\%$ no último item para fechar exatamente $100,00\%$.
- **[Risco]** Redefinição acidental dos pesos por clique em preset.
  - *Mitigação*: Os botões de preset e auto-balanceamento alteram apenas o estado em memória local (`editados`), exigindo clique explícito em "Salvar Pesos" para gravar no backend. Além disso, haverá botão "Restaurar Original" para descartar alterações não salvas.
