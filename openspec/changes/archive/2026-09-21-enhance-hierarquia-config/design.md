# Design Técnico: Modernização da Configuração de Hierarquia

## Contexto

A configuração de níveis hierárquicos governa a subida da árvore de avaliação funcional no CAPD quando uma chefia imediata é afastada, licenciada ou impedida (conforme `HierarquiaService.php` no backend). No frontend, a interface em `HierarquiaConfigPanel.tsx` atualmente utiliza tabelas simples sem recursos de pesquisa e paginação, sem validações de integridade estrutural e com chamada insegura a `window.confirm()` nativo.

Para motivação detalhada, consulte `proposal.md`. Para requisitos normativos, consulte `specs/capd/spec.md`.

## Objetivos e Não-Objetivos

**Objetivos:**
- Prover um painel executivo com 4 KPIs de monitoramento da hierarquia no topo do componente.
- Estruturar a listagem de níveis com o componente canônico `DataTable`, permitindo ordenação, busca textual e visualização responsiva.
- Eliminar integralmente o uso de diálogos nativos do navegador (`window.confirm`), substituindo-os pelo `ConfirmDialog` com modal de confirmação explícita.
- Criar um simulador interativo de resolução hierárquica ("Quem avalia quem?"), permitindo testar cenários normais e de afastamento temporário da chefia.
- Fornecer uma visualização esquemática em árvore da pirâmide institucional conectando os níveis hierárquicos.
- Isolar a lógica de simulação e integridade em funções puras testáveis com Vitest (`HierarquiaConfigPanel.simulador.ts`).

**Não-Objetivos:**
- Modificar o schema de banco de dados ou migrações das tabelas `capd_niveis_hierarquia` e `capd_pendencias_hierarquia`.
- Alterar as regras internas do algoritmo de backend `HierarquiaService::resolverAvaliador()`.
- Criar gestão de organograma físico (atribuição que pertence ao módulo de Organização e `api.org`).

## Decisões Técnicas de Arquitetura

### 1. Extração de Funções Puras e Validação de Integridade (`HierarquiaConfigPanel.simulador.ts`)
- **Decisão**: Criar o arquivo utilitário `HierarquiaConfigPanel.simulador.ts` para abrigar a lógica matemática e lógica de:
  - Cálculo de métricas da hierarquia (`calcularKpisHierarquia`);
  - Validação de integridade da árvore (`validarIntegridadeHierarquia`: checar existência de nível topo, duplicidade de níveis, lacunas numéricas);
  - Simulação de cadeia de avaliação (`simularCadeiaAvaliacao`: projeta o encadeamento Nível 0 $\to$ Nível 1 $\to$ Topo com base na regra ativa).
- **Alternativa Considerada**: Deixar toda a lógica dentro do componente React. Rejeitada por dificultar testes automatizados e poluir o ciclo de vida dos hooks.

### 2. Segmented Control de Modos de Exibição
- **Decisão**: Permitir que o gestor alterne no topo do painel entre 3 visões complementares:
  1. **Tabela de Níveis (DataTable)**: Visão detalhada para manutenção cadastral, edição e exclusão.
  2. **Pirâmide Institucional (Árvore Visual)**: Visão esquemática da pirâmide hierárquica com cards interligados.
  3. **Simulador de Resolução ("Quem avalia quem?")**: Ferramenta interativa de validação prática de afastamentos.
- **Alternativa Considerada**: Dividir em múltiplas sub-abas no `PortalRhView.tsx`. Rejeitada porque a barra de navegação já possui muitas abas principais, sendo mais ergonômico ter sub-visões coesas dentro do próprio painel de hierarquia.

### 3. Conformidade Estrita com Diretrizes de UI (Substituição de `window.confirm`)
- **Decisão**: Adotar o componente `ConfirmDialog` de `@/components/ui/ConfirmDialog` com estado declarativo `dialogExclusao: { aberto: boolean, nivelId: number | null, nome: string }`.
- **Alternativa Considerada**: Usar `Modal` genérico. Rejeitada porque o `ConfirmDialog` já padroniza botões de confirmação destrutiva e cancelamento com acessibilidade nativa.

### 4. Tipografia e Design System
- **Decisão**: Utilizar `JetBrains Mono` (`font-mono tabular-nums`) para numeração dos níveis, códigos e badges de substituição.
- **Paleta Semântica**: Dark Navy, Esmeralda para níveis normais, Ouro/Âmbar (`Crown`) para o nível Topo e Rose para advertências de lacuna na cadeia.

## Riscos e Mitigações

- **[Risco]** Ausência de dados de servidores reais para alimentar o simulador em ambientes de teste.
  - **Mitigação**: O simulador aceitará parâmetros abstratos baseados nos níveis cadastrados e utilizará dados de demonstração coerentes caso o endpoint da árvore organizacional esteja inacessível.
- **[Risco]** Múltiplos níveis cadastrados com flag `is_topo = true`.
  - **Mitigação**: A função pura de integridade alertará no KPI a inconsistência de "Múltiplos Níveis Topo", e o formulário de edição/criação validará previamente esse estado.
