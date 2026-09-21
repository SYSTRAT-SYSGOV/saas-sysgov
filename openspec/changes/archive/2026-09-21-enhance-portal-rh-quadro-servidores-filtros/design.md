# Design

## Context

A aba "Quadro de Servidores" (`activeTab === 'servidores'`) do Portal de RH (`apps/web-client/src/modules/capd/views/PortalRhView.tsx`) consome a lista de servidores via `api.capd.listServidores({ per_page: 100 })`, combinada com a árvore do organograma (`api.org.getTree()`) que gera o mapa `classificacaoPorServidor: Map<number, { secretaria: string; departamento: string }>` e com o mapa de avaliações `ultimaAvaliacaoPorServidor`.

A tabela atual usa o componente `DataTable` (`apps/web-client/src/components/ui/DataTable.tsx`). No entanto, ela define 9 colunas com `size` total de 1.455px e classes rígidas `min-w-[...]` em cada célula. Isso aciona o `minWidth` da tabela e o container com `overflow-x-auto`, criando uma barra de rolagem lateral contínua em monitores de resolução padrão (1024px a 1440px).

Ademais, a aba possui apenas a busca textual simples do `DataTable`, sem filtros estruturados por secretaria, departamento, regime ou condição probatória, e carece de KPIs panorâmicos.

## Goals / Non-Goals

**Goals:**
- Prover um painel completo de filtros avançados estruturados (Secretaria, Departamento, Regime Jurídico, Condição Probatória, Fase de Estágio, Situação Funcional e Status de Avaliação no Ciclo) combinados com busca textual.
- Eliminar completamente a barra de rolagem horizontal da listagem em resoluções de desktop (a partir de 1024px), redesenhando a composição das colunas de forma ergonomicamente agrupada.
- Adicionar cabeçalho executivo de KPIs específicos para o Quadro de Servidores (Total do Quadro, Estagiários com %, Estáveis com %, Servidores Alocados vs Sem Lotação).
- Adicionar pílulas de acesso rápido (Quick Filters) para navegação instantânea em 1 clique.
- Garantir que a exportação (CSV, Excel, PDF) respeite os filtros ativos e exporte colunas atômicas via `meta.exportValue`.

**Non-Goals:**
- Não criar novos endpoints backend (todos os dados já são providos pelos módulos CAPD e OrgChart existentes).
- Não alterar as regras de negócio das demais abas do Portal de RH (Distribuição, Ranking Desempate, Estágio Probatório, PMD).
- Não alterar o schema de banco de dados.

## Decisions

### 1. Modelo de Estado e Lógica Pura de Filtragem

Para assegurar testabilidade unitária e performance sem engasgos de renderização, criamos a interface `FiltrosQuadroServidores` e a função pura `filtrarServidoresQuadro`:

```typescript
export interface FiltrosQuadroServidores {
  termoBusca: string;
  secretaria: string;
  departamento: string;
  regime: 'todos' | 'estatutario' | 'comissionado';
  condicaoEstagio: 'todos' | 'estagio' | 'estavel';
  faseEstagio: 'todas' | '1' | '2' | '3';
  situacao: 'todos' | 'ativo' | 'afastado';
  avaliacaoCiclo: 'todos' | 'com_avaliacao' | 'sem_avaliacao';
}
```

A função pura recebe a lista de servidores, o objeto de filtros e os mapas relacionais (`classificacaoPorServidor` e `ultimaAvaliacaoPorServidor`). Todos os predicados são aplicados com conjunção lógica `AND`. Em arrays de 1.000 servidores, o tempo de execução é inferior a 3ms, permitindo feedback imediato na digitação e seleção.

### 2. Redesenho e Agrupamento das Colunas para Eliminar Scroll Horizontal

Para eliminar a barra de rolagem lateral sem suprimir nenhuma informação, unificamos dados afins verticalmente dentro de cada célula:

| Coluna | Conteúdo Visual | Exportação Atômica (`meta.exportValue`) | Largura Otimizada |
| :--- | :--- | :--- | :--- |
| **Servidor Público** | Matrícula em badge mono + Nome completo em destaque + CPF e e-mail secundários | Nome, Matrícula, CPF | ~250px |
| **Cargo & Regime** | Cargo efetivo + Tag/badge sutil de regime (RPPS / Comissionado / FG) | Cargo Efetivo, Regime Jurídico | ~180px |
| **Lotação Institucional** | Badge de sigla da Secretaria com nome + Departamento na linha inferior | Secretaria, Departamento | ~220px |
| **Chefia Imediata** | Nome do superior hierárquico com truncamento inteligente e tooltip | Nome da Chefia | ~150px |
| **Estágio & Situação** | Badge semântica (Estágio com fase vs Estável) + Status funcional (Ativo/Afastado) | Condição Probatória, Situação | ~140px |
| **Ações** | Botão compacto "Ver Avaliação" (quando existente) + Ação para Detalhes/Dossiê | (omitido) | ~110px |

Com a soma das larguras reduzida para ~1.050px e removendo as travas rígidas `min-w-[...]` internas, a tabela se ajusta com perfeição à largura da tela sem provocar overflow horizontal.

### 3. Painel de Indicadores Executivos (KPIs)

No topo da aba "Quadro de Servidores", inserimos 4 cartões de KPI construídos a partir de `calcularKpisQuadroServidores(servidores, classificacaoPorServidor)`:
1. **Total de Servidores**: Número total cadastrado.
2. **Em Estágio Probatório**: Quantidade e % sobre o total (badge Âmbar `#f59e0b`).
3. **Servidores Estáveis**: Quantidade e % sobre o total (badge Esmeralda `#10b981`).
4. **Alocação Institucional**: Servidores com lotação reconhecida vs Não Classificados (badge Primária/Ciano `#06b6d4`).

Todos os números e percentuais seguem a regra inegociável do Design System: `font-mono tabular-nums`.

### 4. Pílulas de Acesso Rápido (Quick Filters) e Painel Colapsável

Acima da tabela, implementamos:
- Barra superior com campo de busca ágil, pílulas rápidas (`Todos`, `Estágio Probatório`, `Estáveis`, `Sem Lotação`) e botão de alternância `Filtros Avançados` (com indicador visual de quantos filtros estão ativos).
- Painel expansível/colapsável com os seletores granulares:
  - Select Secretaria (populado com as secretarias reais do organograma).
  - Select Departamento (dinamicamente filtrado pela secretaria selecionada).
  - Select Regime Jurídico.
  - Select Condição Probatória.
  - Select Situação Funcional.
  - Botão "Limpar Filtros" (ativo somente quando houver filtros aplicados).

## Risks / Trade-offs

- **[Risco] Inconsistência de Departamento ao alternar Secretaria** → Se o usuário seleciona um departamento da Secretaria A e depois altera o seletor para a Secretaria B, o departamento anterior ficaria inválido.
  - *Mitigação*: Ao trocar a secretaria, o estado de `departamento` é resetado para vazio caso não pertença à nova secretaria.
- **[Risco] Exportação CSV/Excel gerar células com textos compostos** → Ao agrupar Secretaria e Departamento na mesma célula visual da tabela, a exportação poderia sair amalgamada.
  - *Mitigação*: Uso obrigatório de `meta.exportValue` e colunas virtuais ou tratadas com `exportHeader`, garantindo que no CSV e XLSX cada dado saia em sua coluna própria e limpa.
- **[Risco] Quebra de layout em telas menores que 1024px** → Monitores muito estreitos (ex. tablets ou celulares) podem precisar de rolagem.
  - *Mitigação*: A tabela mantém comportamento responsivo gracioso com rolagem permitida apenas em resoluções estritamente inferiores a 1024px, garantindo experiência 100% livre de rolagem horizontal em todas as estações desktop normais.
