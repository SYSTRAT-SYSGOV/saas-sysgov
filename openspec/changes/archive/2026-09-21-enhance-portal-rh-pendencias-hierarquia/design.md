# Design Técnico: Modernização da Aba de Pendências de Hierarquia (DRH)

## Contexto

No módulo CAPD do SYSGOV, a resolução automatizada do avaliador responsável pela avaliação de desempenho depende de uma cadeia hierárquica íntegra (`HierarquiaService.php`). Quando um servidor não possui superior cadastrado, ou quando a chefia imediata está em licença/afastamento sem substituto legal, o motor gera registros na tabela `capd_pendencias_hierarquia` para intervenção do Departamento de Recursos Humanos.

No frontend, a interface em `PendenciasHierarquiaPanel.tsx` é atualmente uma tabela simples sem recursos de pesquisa, paginação ou ordenação, sem KPIs no topo e com um modal precário onde o usuário precisa digitar manualmente o ID numérico do avaliador.

Para motivação detalhada, consulte [`proposal.md`](./proposal.md). Para requisitos normativos, consulte [`specs/capd/spec.md`](./specs/capd/spec.md).

---

## Objetivos e Não-Objetivos

**Objetivos:**
- Prover um painel executivo de 4 cartões de indicadores (KPIs) no topo com total de pendências abertas, resolvidas, taxa de saneamento e divisão por categoria de inconsistência.
- Estruturar a listagem de pendências utilizando o componente `DataTable` de `@sysgov/ui`, provendo ordenação, paginação, filtros multifacetados e busca textual rápida.
- Modernizar o modal de resolução para uma experiência assistida e segura, com ficha de diagnóstico do servidor, busca/seleção de avaliadores e transparência quanto ao impacto nas avaliações em andamento.
- Disponibilizar exportação em planilha CSV com cabeçalhos claros em português e codificação UTF-8 BOM (`\uFEFF`) para apoio aos processos de auditoria do DRH.
- Isolar toda a lógica de cálculos, filtragem, agrupamento e exportação em módulo puro desacoplado (`PendenciasHierarquiaPanel.utils.ts`) com 100% de cobertura de testes unitários no Vitest.
- Assegurar conformidade absoluta com o Design System oficial do SYSGOV, sem diálogos nativos e com dados técnicos em `JetBrains Mono`.

**Não-Objetivos:**
- Alterar as migrações ou tabelas existentes do banco de dados (`capd_pendencias_hierarquia`).
- Modificar o fluxo de resolução transacional do backend em `PendenciaHierarquiaController@resolver`, preservando 100% da compatibilidade do endpoint da API.
- Criar rotinas automáticas de resolução sem intervenção humana (as pendências existem justamente para casos em que o algoritmo não pôde decidir com segurança).

---

## Decisões Técnicas de Arquitetura

### 1. Extração de Utilitários Puros (`PendenciasHierarquiaPanel.utils.ts`)
- **Decisão**: Toda a lógica de negócio de frontend será isolada em funções puras:
  - `calcularKpisPendencias(pendencias: ApiPendenciaHierarquia[])`: Retorna total abertas, resolvidas, taxa de saneamento formatada e distribuição por tipo.
  - `filtrarPendencias(pendencias, { busca, status, tipo, cicloId })`: Realiza filtragem multifacetada e busca textual insensível a maiúsculas/minúsculas e acentos em nome, matrícula e motivo.
  - `gerarCsvPendencias(pendencias: ApiPendenciaHierarquia[])`: Gera string CSV formatada com codificação UTF-8 BOM (`\uFEFF`) e delimitadores padronizados para Excel.
  - `obterRotuloETipoBadge(tipo: string)`: Mapeia as chaves de pendência para rótulos legíveis em português e estilos semânticos do Design System.
- **Justificativa**: Permite testabilidade direta via Vitest, desacopla o estado do React da lógica computacional e previne renderizações desnecessárias.

### 2. Tabela Moderna com `DataTable` de `@sysgov/ui`
- **Decisão**: Utilizar o `DataTable` canônico com colunas configuradas:
  - Servidor (Nome em destaque + matrícula funcional em `font-mono tabular-nums`);
  - Ciclo Avaliativo;
  - Categoria da Inconsistência (com badges semânticos e ícones ilustrativos: `AlertTriangle` para sem superior, `Clock` para afastamento, `HelpCircle` para topo);
  - Diagnóstico/Motivo (com visualização expandida ou tooltip);
  - Status (`StatusChip`);
  - Auditoria/Resolução (exibindo avaliador designado e data/hora formatada para as resolvidas);
  - Ações com botão "Resolver" para pendências abertas.
- **Justificativa**: Padronização estética rigorosa com as outras abas do Portal do RH (Quadro de Servidores, Ranking, Folha de Pagamento) e eliminação de barras de rolagem desnecessárias.

### 3. Modal de Resolução Assistido e Humanizado
- **Decisão**: Reformular o modal de resolução:
  - Cabeçalho contextual com ficha do servidor avaliado e motivo do bloqueio gerado pelo motor;
  - Campo de seleção/busca do avaliador com listagem dos gestores/chefias disponíveis ou busca preditiva por nome/matrícula;
  - Painel de aviso em destaque: *"Ao confirmar, todas as avaliações abertas não-homologadas deste servidor neste ciclo serão atribuídas ao avaliador designado."*
  - Tratamento de erro detalhado com feedback inline.
- **Justificativa**: Elimina a necessidade de o operador do DRH memorizar ou adivinhar o ID numérico de banco de dados do avaliador, prevenindo erros humanos graves na designação de chefias avaliadoras.

### 4. Tipografia Técnica e Cores Semânticas
- **Decisão**: Aplicar rigorosamente a paleta do Design System SYSGOV:
  - Âmbar (`#f59e0b` / `amber-500`) para pendências abertas e advertências de hierarquia incompleta;
  - Esmeralda (`#10b981` / `emerald-500`) para pendências resolvidas e taxa de saneamento;
  - Azul/Ciano (`#06b6d4` / `cyan-500`) para regras de afastamento;
  - `JetBrains Mono` (`font-mono tabular-nums`) para matrículas, datas, horários e percentuais.

---

## Riscos e Mitigações

- **[Risco]** Volume elevado de servidores ou usuários na listagem do seletor de avaliadores do modal.
  - **Mitigação**: Campo com busca preditiva/filtragem local rápida que aceita tanto a digitação do nome quanto a digitação da matrícula funcional ou ID.
- **[Risco]** Carregamento de lista de pendências paginada pelo backend.
  - **Mitigação**: O painel suportará tanto a paginação no cliente para conjuntos médios de dados quanto requisição direta com filtros de status através do SDK `api.capd.listPendenciasHierarquia`.
