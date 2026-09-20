# Design

## Context

A gestão de Escalas Gráficas da Avaliação de Desempenho (CAPD/SAPDS) é regida pelos princípios de Chiavenato (graus 1 a 5, pontuação contínua de 0 a 100 pontos, RF-03). O backend em Laravel (`Modules/Capd`) e o `@sysgov/sdk` já fornecem os contratos de API completos (`listEscalasGraficas`, `createEscalaGrafica`, `updateEscalaGrafica`, `deleteEscalaGrafica`).

O componente `EscalaGraficaPanel.tsx` em `apps/web-client` atua como a interface dessa parametrização dentro do `PortalCadView.tsx`. O presente design estabelece a arquitetura da interface enriquecida, com foco em usabilidade, segurança deliberativa e conformidade estrita com o Design System `@sysgov/ui`.

## Goals / Non-Goals

**Goals:**
- Prover visualização executiva no topo com 4 StatCards (`Escala Vigente`, `Total de Escalas`, `Graus Configurados`, `Cobertura 0–100`).
- Implementar componente de Régua Contínua Colorida com graduação cromática harmônica (`graduTone.ts`: danger para G1/G2, warning para G3, success para G4/G5).
- Disponibilizar um Simulador Interativo de Enquadramento em tempo real com slider (0 a 100 pontos e nota 0 a 10), cálculo do grau resultante, descrição do comportamento e disparo visual preventivo da Trava Antileniência (CIT obrigatório em G1, G2 ou G5).
- Suportar CRUD administrativo integral: Criação com presets rápidos (5, 4 e 3 Graus Chiavenato), Edição (`updateEscalaGrafica`), Exclusão Segura com Modal confirmatório (`deleteEscalaGrafica`) e Ativação direta de escala.
- Validação matemática de integridade no frontend antes do envio: primeiro grau iniciando em `0.0`, último em `100.0`, sem sobreposições e sem descontinuidades entre faixas.
- Conformidade 100% com `@sysgov/ui`, dados numéricos em `JetBrains Mono` (`font-mono tabular-nums`), e zero chamadas a `alert()` ou `confirm()`.

**Non-Goals:**
- Não altera migrações ou tabelas no banco de dados (o modelo relacional existente `capd_escalas_graficas` e `capd_escala_niveis` atende integralmente ao escopo).
- Não altera as demais abas do `PortalCadView.tsx` (como julgamento de recursos, pauta de sessões ou consolidação trienal).

## Decisions

### 1. Componentização e Estrutura de Estado
- **Decisão**: Manter a lógica no `EscalaGraficaPanel.tsx`, estruturando o painel em seções coesas:
  - Header com seletor de Modelo de Formulário e ações globais.
  - Grade de KPIs (StatCards).
  - Régua Contínua Visual e Simulador Interativo de Enquadramento.
  - Listagem de Escalas com status (Ativa/Inativa), régua resumida e ações individuais (Ativar, Editar, Excluir).
  - Modal Unificado de Parametrização (Criar / Editar) com gerador de presets Chiavenato.
  - Modal Institucional de Confirmação de Exclusão.
- **Alternativas consideradas**: Criar múltiplos arquivos e subpastas para cada modal. Optou-se por concentrar em `EscalaGraficaPanel.tsx` e helpers focados para preservar compatibilidade de importação com `PortalCadView.tsx` sem dispersão excessiva.

### 2. Validação Rigorosa de Continuidade Numérica
- **Decisão**: Executar validação client-side imediata ao editar qualquer valor de faixa:
  - `grau[0].valor_min === 0`
  - `grau[n-1].valor_max === 100`
  - Para cada nível $i$: `grau[i].valor_max` deve conectar-se ao `grau[i+1].valor_min` sem lacunas (ex: 39.99 → 40.00 ou 40 → 40).
- **Alternativas consideradas**: Permitir faixas livres com validação apenas no backend. Descartada para evitar erro 422 tardio e proporcionar feedback visual imediato ao gestor da CAD.

### 3. Simulador com Consciência Metodológica da Trava Antileniência
- **Decisão**: O simulador calcula a conversão linear $Nf = (grau - 1) \times 2,5$ e correlaciona a pontuação com as faixas da escala ativa. Se o resultado for Grau 1, 2 ou 5, renderiza uma caixa de alerta estilizada com Badge de advertência informando: *"Grau Extremo — Requer Incidente Crítico (CIT) registrado pela chefia no Diário de Bordo para validação pela Trava Antileniência (Art. 24)"*.
- **Alternativas consideradas**: Simulador genérico apenas de números. A inclusão da trava reforça a inteligência de governança e orienta os membros da comissão.

### 4. Gestão Segura da Escala Vigente
- **Decisão**: Impedir a exclusão direta da escala que estiver marcada como `ativa = true`. O botão de exclusão da escala ativa fica desabilitado com tooltip orientativo (*"Desative a escala ou ative outra antes de excluir"*). A exclusão de escalas inativas requer confirmação explícita em `Modal` do `@sysgov/ui`.
- **Alternativas consideradas**: Permitir exclusão em cascata. Descartada por violar a integridade das avaliações do modelo ativo.

## Risks / Trade-offs

- **[Risco] Modelo sem nenhuma escala ativa cadastrada** → **Mitigação**: EmptyState intuitivo convidando a criar a primeira escala com preset automático de 5 graus de Chiavenato.
- **[Risco] Membro da CAD alterar faixas de uma escala já utilizada em ciclos fechados** → **Mitigação**: Alerta visual no modal de edição informando que a régua altera a interpretação de novas pontuações do modelo; opção de criar nova versão/escala em vez de sobrescrever.
