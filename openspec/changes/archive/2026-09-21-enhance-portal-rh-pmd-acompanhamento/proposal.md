# Proposta: Modernização e Expansão da Aba de Acompanhamento de PMD (DRH)

## Motivação (Why)

O **Plano de Melhoria de Desempenho (PMD)** é o instrumento legal e pedagógico estabelecido pelo requisito **RF-09** do módulo CAPD (Avaliação de Desempenho dos Servidores Públicos). Ele é acionado compulsoriamente pelo motor de consolidação para qualquer servidor cuja Nota Final Consolidada (NFC) resulte abaixo da nota de corte regulamentar (< 70,00 pontos na escala 0–100 ou conceito Regular/Insuficiente). Enquanto o plano estiver ativo ou pendente de verificação, a progressão por mérito funcional do servidor permanece retida na folha de pagamento.

Apesar de sua relevância jurídica e correcional, a interface atual do painel de acompanhamento (`PmdPanel.tsx`) no Portal do RH apresenta deficiências estruturais críticas:
1. **Ausência de Identificação Direta do Servidor na Listagem**: A tabela exibe apenas o ID técnico do registro, o ciclo de origem e o texto de objetivos, omitindo o nome e a matrícula do servidor avaliado na visão tabular primária.
2. **Inexistência de Indicadores Executivos (KPIs)**: O gestor de RH e a Comissão CAD não contam com métricas panorâmicas do volume de servidores em risco, planos com ações executadas, taxa de recuperação funcional acumulada ou planos com prazos vencidos.
3. **Falta de Gestão Visual de Prazos e Metas**: Não há destaque visual para planos com prazos expirados ou próximos do vencimento, tampouco acompanhamento quantitativo do progresso das ações acordadas (ex.: 2 de 3 ações concluídas).
4. **Modal de Evolução Rústico e Sem Validação Comparativa**: O lançamento da verificação de evolução solicita uma nova nota em campo numérico isolado, sem calcular a variação (delta de pontuação) em relação à nota gatilho e sem indicar se a nova pontuação atinge a linha de corte para desobstrução da progressão.
5. **Inexistência de Relatório de Auditoria e Exportação**: O DRH não possui funcionalidade para exportar a listagem dos planos em andamento para conferência pela Comissão Permanente de Avaliação de Desempenho.

Modernizar o painel de PMD dotará a administração pública de controle tempestivo sobre os planos de recuperação, garantindo justiça processual aos servidores e segurança jurídica à gestão de carreiras.

---

## O que Mudará (What Changes)

- **Painel Executivo de Indicadores (KPIs)**:
  - 4 cartões `StatCard` no topo: Total de PMDs Ativos/Em Risco (com destaque visual em âmbar), Total de Planos Verificados/Superados (destaque esmeralda), Taxa de Recuperação Funcional (%) e Alertas de Prazos (vencidos e a vencer em até 30 dias).
- **Backend Enriquecido com Dados Cadastrais**:
  - Implementação do relacionamento `servidor(): BelongsTo` no model `PlanoMelhoria.php`.
  - Inclusão do carregamento adiantado (`eager loading`) dos dados do servidor (`nome_completo`, `matricula`, `cargo_efetivo` e `orgao_lotacao`) no serviço `PmdService::listar()` e no controller `PmdController`.
- **Listagem Analítica com `DataTable` (`@sysgov/ui`)**:
  - Coluna destacada do **Servidor** (Nome completo, Matrícula funcional e Cargo/Lotação em `font-mono tabular-nums`);
  - **Ciclo e NFC Gatilho** com formatação de alerta e tipografia `JetBrains Mono`;
  - **Progresso de Ações**: Exibição da quantidade e percentual de ações cumpridas em relação ao total pactuado;
  - **Gestão de Prazos**: Data limite em `font-mono tabular-nums` com badges semânticos de urgência (Vencido em vermelho, Próximo do vencimento em âmbar, Regular em cinza);
  - **Status**: `StatusChip` padronizado para cada etapa do ciclo de vida do PMD;
  - **Ações**: Botões ergonômicos para "Ver Detalhes", "Evolução" e "Concluir Ações".
- **Filtros Multifacetados e Busca Preditiva**:
  - Busca textual rápida por nome do servidor, matrícula, objetivos pactuados ou ciclo;
  - Filtro por Status (Aberto, Em Andamento, Concluído, Verificado, Cancelado ou Todos);
  - Filtro por Situação do Prazo (Todos, Vencidos, A Vencer em 30 dias, No Prazo).
- **Modal de Verificação de Evolução Assistido**:
  - Painel comparativo em tempo real: Nota Gatilho Anterior vs Nova Nota Apurada;
  - Cálculo instantâneo do delta de evolução (ex.: `+8,50 pts`);
  - Selo visual de elegibilidade (indica se a nova nota supera a nota de corte ≥ 70,00 pts);
  - Campo estruturado para parecer circunstanciado da chefia/comissão.
- **Exportação Tabular em CSV com UTF-8 BOM**:
  - Geração de planilha CSV com todos os dados dos servidores e metas pactuadas, pronta para auditoria externa ou reuniões deliberativas da CAD.
- **Utilitários Puros e Testes Automatizados**:
  - Criação de `PmdPanel.utils.ts` contendo regras de cálculo de KPIs, apuração de urgência de prazos, filtragem multifacetada e gerador de CSV, com 100% de cobertura de testes no Vitest.

---

## Capacidades (Capabilities)

### Modified Capabilities

- `capd`: Atualização e modernização dos requisitos de acompanhamento do Plano de Melhoria de Desempenho (PMD) funcional, apuração de metas e controle de prazos pelo DRH.

---

## Impacto

- **Backend**:
  - Adição do relacionamento `servidor(): BelongsTo` no modelo `Modules/Capd/Models/PlanoMelhoria.php`.
  - Atualização do método `listar()` em `Modules/Capd/Services/PmdService.php` para incluir `servidor:id,nome_completo,matricula,cargo_efetivo,orgao_lotacao`.
- **Frontend**:
  - Refatoração de `apps/web-client/src/modules/capd/PmdPanel.tsx`.
  - Criação de `apps/web-client/src/modules/capd/PmdPanel.utils.ts`.
  - Criação da suíte de testes unitários `apps/web-client/src/modules/capd/__tests__/PmdPanel.utils.test.ts`.
- **Design System & Acessibilidade**:
  - Uso estrito dos componentes de `@sysgov/ui` e `@/components/ui`.
  - Tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`) em todas as notas, matrículas e datas.
