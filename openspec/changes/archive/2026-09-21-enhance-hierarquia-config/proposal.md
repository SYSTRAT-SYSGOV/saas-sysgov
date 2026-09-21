# Proposta: Modernização e Expansão da Aba de Configuração de Hierarquia

## Motivação (Why)

A sub-aba de **Configuração de Hierarquia** (`HierarquiaConfigPanel.tsx`) do Portal do RH e da Comissão de Avaliação é responsável por parametrizar as camadas de ascendência avaliativa e as regras de substituição legal quando chefias imediatas estão afastadas ou impedidas. 

Atualmente, o painel apresenta uma interface rudimentar contendo apenas uma tabela básica de níveis, desprovida de indicadores executivos, sem validação visual da integridade da cadeia de comando, sem representação estruturada em árvore da pirâmide institucional e sem qualquer ferramenta para o gestor de RH testar a resolução prática ("Quem avalia quem?"). Além disso, o componente possui uma violação direta das diretrizes canônicas do repositório ao invocar `window.confirm()` nativo do navegador para desativações de níveis. 

Modernizar essa aba é indispensável para garantir confiabilidade técnica, aderência ao Design System e clareza na governança dos ciclos avaliativos do CAPD.

## O que Mudará (What Changes)

- **Painel Executivo de Indicadores (KPIs)**: 4 cartões de métricas no topo exibindo Total de Níveis Ativos, Nível Topo Homologado, Cobertura de Regras de Substituição e Status de Integridade da Cadeia.
- **Eliminação de Diálogos Nativos**: Substituição completa do `window.confirm()` pelo componente `ConfirmDialog` de `@/components/ui/ConfirmDialog`.
- **Modernização da Listagem com `DataTable`**:
  - Suporte à ordenação por nível (0 = chefia imediata base, níveis superiores crescentes até o topo);
  - Badges semânticos oficiais para Nível Topo (`Crown`), regras de substituição e status operacional;
  - Tipografia técnica estritamente em `font-mono tabular-nums` para dados numéricos de níveis e identificadores.
- **Simulador Interativo de Resolução de Avaliadores ("Quem avalia quem?")**:
  - Seleção contextual de servidor ou unidade organizacional;
  - Projeção do fluxo de ascendência (Nível 0 $\to$ Nível 1 $\to$ Nível Topo);
  - Simulação de cenário de impedimento/afastamento do chefe imediato, demonstrando na prática o efeito da regra ("Superior Hierárquico" vs "Substituto Legal").
- **Visualizador Esquemático em Árvore/Fluxo**: Cartões organizados visualmente da base ao topo da pirâmide com indicação clara do papel avaliativo de cada escalão.
- **Modal de Cadastro/Edição Enriquecido**: Interface orientada com dicas contextuais, validação de regras de negócio (apenas um nível pode ser topo) e layout consistente com `@sysgov/ui`.

## Capacidades (Capabilities)

### Modified Capabilities

- `capd`: Atualização e extensão dos requisitos de parametrização da hierarquia avaliativa, resolução automatizada de avaliador e governança de cadeia de comando no Portal de RH.

## Impacto

- **Frontend**: Refatoração e enriquecimento de `apps/web-client/src/modules/capd/HierarquiaConfigPanel.tsx` e criação do módulo de funções puras e testes unitários correspondentes.
- **Componentes Compartilhados**: Utilização exclusiva de primitivos `@sysgov/ui` e componentes de `@/components/ui` (`DataTable`, `ConfirmDialog`, `EmptyState`, `SearchInput`).
- **Compatibilidade Backend**: 100% retrocompatível com os endpoints da API de hierarquia (`api.capd.listNiveisHierarquia`, `createNivelHierarquia`, `updateNivelHierarquia`, `deleteNivelHierarquia`) e árvore organizacional (`api.org.getTree`).
