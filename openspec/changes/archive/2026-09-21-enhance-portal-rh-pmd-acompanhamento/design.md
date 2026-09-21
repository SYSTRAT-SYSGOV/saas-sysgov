# Design Técnico: Modernização do Acompanhamento de PMD (DRH)

## Contexto

O Plano de Melhoria de Desempenho (PMD) é acionado pelo motor de avaliação do CAPD quando um servidor obtém Nota Final Consolidada (NFC) inferior a 70,00 pontos (escala 0–100) ou conceito Insuficiente/Regular. Enquanto pendente de verificação no ciclo subsequente, o plano retém legalmente a progressão por mérito do servidor na folha de pagamento (`PmdService::possuiPmdPendenteNoCiclo`).

No frontend, a tela `PmdPanel.tsx` apresenta severas carências ergonômicas: a tabela não traz o nome nem a matrícula do servidor avaliado, não há KPIs consolidados de recuperação e prazos, o modal de evolução não apresenta comparativo de notas e inexiste exportação de dados para auditoria.

Para motivação detalhada, consulte [`proposal.md`](./proposal.md). Para requisitos normativos, consulte [`specs/capd/spec.md`](./specs/capd/spec.md).

---

## Objetivos e Não-Objetivos

**Objetivos:**
- Prover um painel executivo com 4 cartões de métricas (`StatCard`) no topo: PMDs Ativos/Em Risco, Planos Superados, Taxa de Recuperação Funcional (%) e Alertas de Prazos Vencidos / A Vencer.
- Estruturar a listagem de planos com o componente oficial `DataTable` de `@sysgov/ui`, exibindo dados completos do servidor avaliado (nome, matrícula, cargo e lotação em `JetBrains Mono`).
- Implementar controle semântico de urgência temporal (destaques em vermelho para prazos vencidos e âmbar para planos que expiram nos próximos 30 dias).
- Enriquecer o modal de registro de evolução com comparativo interativo em tempo real (NFC Gatilho vs Nova NFC Apurada, cálculo automático de delta e verificação do corte ≥ 70,00 pts).
- Implementar ferramenta de exportação em planilha CSV com codificação UTF-8 BOM (`\uFEFF`).
- Enriquecer o backend com o relacionamento `servidor(): BelongsTo` em `PlanoMelhoria.php` e eager loading em `PmdService::listar()`.
- Isolar a lógica de cálculo, filtragem e verificação de prazos em funções puras testáveis (`PmdPanel.utils.ts`) com 100% de cobertura de testes no Vitest.

**Não-Objetivos:**
- Alterar o fluxo de cálculo ou travamento de progressão em `PmdService::possuiPmdPendenteNoCiclo()`.
- Modificar o schema físico das tabelas `capd_planos_melhoria` no banco de dados MySQL.

---

## Decisões Técnicas de Arquitetura

### 1. Enriquecimento da Modelagem no Backend
- **Decisão**: Adicionar o relacionamento Eloquent `servidor(): BelongsTo` na classe `Modules\Capd\Models\PlanoMelhoria` vinculando a chave estrangeira `servidor_id` ao modelo `Modules\Capd\Models\Servidor`.
- **Eager Loading**: Alterar `PmdService::listar()` para carregar `servidor:id,nome_completo,matricula,cargo_efetivo,orgao_lotacao` junto com os ciclos.
- **Justificativa**: Evita consultas N+1 no banco e fornece imediatamente ao frontend todos os metadados necessários para identificar o servidor sem necessidade de requisições secundárias.

### 2. Utilitários Puros Desacoplados (`PmdPanel.utils.ts`)
- **Decisão**: Isolar a inteligência matemática e temporal em funções puras:
  - `calcularKpisPmd(pmds: PlanoMelhoria[])`: Retorna contadores de ativos, verificados, taxa de recuperação (%) e planos com prazos expirados/a vencer.
  - `calcularUrgenciaPrazo(prazoIso: string, status: string, dataReferencia?: Date)`: Compara a data limite com a data atual e classifica a urgência em: `vencido` (vermelho), `vence_em_breve` (≤ 30 dias, âmbar) ou `regular` (cinza/verde).
  - `calcularDeltaEvolucao(nfcGatilho: string | number, nfcNova: string | number)`: Calcula a diferença matemática exata com duas casas decimais e apura se a nota atinge o critério de superação regulamentar (≥ 70,00 pts).
  - `filtrarPmds(pmds, filtros)`: Realiza busca textual combinada com filtros de status e urgência de prazo.
  - `gerarCsvPmd(pmds)`: Formata a saída CSV com delimitador `;` e escape seguro.
- **Justificativa**: Garante testes unitários de alta velocidade no Vitest e desacopla a regra de negócio do ciclo de vida dos componentes React.

### 3. Tabela Analítica com `DataTable` oficial (`@sysgov/ui`)
- **Decisão**: Configurar colunas ricas com paginação nativa (`pageSizeSelector`):
  - **Servidor**: Nome completo em negrito, matrícula funcional e cargo em `font-mono tabular-nums`.
  - **Ciclo e NFC Gatilho**: Nota de entrada em destaque (`text-destructive font-mono tabular-nums`).
  - **Metas e Ações**: Resumo das metas pactuadas e contagem de ações cumpridas (`X de Y ações`).
  - **Prazo e Urgência**: Data formatada em `font-mono tabular-nums` acompanhada de badge semântico de urgência.
  - **Status**: `StatusChip` com cores padronizadas (Aberto, Em Andamento, Concluído, Verificado, Cancelado).
  - **Ações**: Botões de ação contextual para cada situação do plano.

### 4. Modal de Verificação com Comparador Interativo
- **Decisão**: Fornecer feedback visual imediato ao digitar a nova nota:
  - Exibe caixa com grid duplo: Nota Anterior vs Nova Nota;
  - Linha do Delta em destaque com cor verde para evolução positiva e vermelha para regressão;
  - Badge de elegibilidade confirmando em tempo real se o servidor se torna apto à progressão.

---

## Riscos e Mitigações

- **[Risco]** Servidores com planos antigos sem vínculo cadastral direto no modelo de Servidores.
  - **Mitigação**: O código no frontend tratará fallbacks seguros exibindo `#ID` ou `Servidor não localizado` caso o objeto `servidor` venha nulo.
- **[Risco]** Diferença de fuso horário na apuração de prazos vencidos.
  - **Mitigação**: A função `calcularUrgenciaPrazo` normalizará as datas considerando o início do dia (00:00:00) para evitar falsos alertas de vencimento no próprio dia da data limite.
