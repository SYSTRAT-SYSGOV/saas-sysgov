# Design Técnico: Listagem DataTable na Tela Principal e Isolamento Estrito de Contexto da Necrópole

## Contexto

Consulte o documento `proposal.md` para a motivação e os arquivos em `specs/` para os requisitos normativos.

Atualmente, o módulo de cemitérios conta com a seleção de necrópoles e navegação por abas. Entretanto, a tela de seleção exibia apenas grade de cards sem filtros avançados e, ao entrar em uma necrópole específica, a aba de Inventário e as demais abas operacionais realizavam consultas globais sem fixar o `park_id` da necrópole ativa, misturando dados municipais com a rotina operacional local.

Este design estabelece:
1. Nova visualização padrão em DataTable com filtros avançados na tela principal (`SelecaoNecropoleView.tsx`), mantendo o modo Cards como opção secundária.
2. Isolamento de dados na aba de Inventário (`InventarioView.tsx` e `InventarioFiltros.tsx`), travando o escopo estritamente no `cemiterioAtivoId`.
3. Isolamento e injeção do `cemiterioAtivoId` nas demais abas operacionais do cemitério (`MapaView`, `OperacoesView`, `ConcessoesView`, `FinanceiroView`, `EmpreiteirosView`, `VistoriaView`).

---

## Objetivos / Não-Objetivos

**Objetivos:**
- Apresentar na tela principal uma DataTable completa de cemitérios, com filtros por status, busca em tempo real, capacidade/ocupação e paginação fixa em 10 itens.
- Deixar a DataTable ativa por padrão, fornecendo um botão de alternância (toggle) para visualização em grade de cards.
- Garantir que a aba de Inventário mostre apenas jazigos, setores e KPIs da necrópole em operação, ajustando textos e suprimindo o botão indevido "+ Novo Cemitério".
- Garantir que todas as demais abas operacionais (Mapa, Operações, Concessões, Financeiro, Empreiteiros, Vistorias) filtrem estritamente por `park_id: cemiterioAtivoId`.
- Preservar conformidade estrita com `@sysgov/ui` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).

**Não-Objetivos:**
- Não inclui alteração de esquemas de banco de dados ou migrações SQL (o backend já suporta filtro por `park_id` nos endpoints de inventário, jazigos, concessões, etc.).

---

## Decisões Técnicas de Arquitetura

### D1: DataTable e Toggle de Visualização em `SelecaoNecropoleView.tsx`
A tela de seleção de necrópoles passará a gerenciar o estado local:
```typescript
const [modoExibicao, setModoExibicao] = useState<'tabela' | 'cards'>('tabela');
```
- **Padrão Ativo**: `'tabela'` (DataTable).
- **Controle de Alternância**: Dois botões no canto superior direito (`List` e `LayoutGrid` do `lucide-react`) permitindo ao usuário alternar a seu critério.
- **Filtros Avançados**:
  - `busca`: texto livre (nome, código, endereço).
  - `filtroStatus`: `'todos' | 'ativo' | 'inativo' | 'manutencao'`.
  - `filtroOcupacao`: `'todas' | 'baixa' (<50%) | 'media' (50-80%) | 'alta' (>80%)`.
- **Colunas da DataTable**:
  1. Código (`font-mono tabular-nums`)
  2. Nome da Necrópole
  3. Endereço / Bairro
  4. Responsável
  5. Setores / Quadras (`font-mono tabular-nums`)
  6. Jazigos Totais (`font-mono tabular-nums`)
  7. Taxa de Ocupação (`font-mono tabular-nums` com barra de progresso)
  8. Status Operacional (Badge de status)
  9. Ação: Botão "Acessar Gestão"

---

### D2: Isolamento Estrito do Inventário (`InventarioView` e `InventarioFiltros`)
Quando o usuário estiver gerenciando um cemitério ativo (`cemiterioAtivoId !== null`):
1. **Filtro de Necrópole**: O `cemiterio_id` da consulta de jazigos é forçado e travado em `cemiterioAtivoId`.
2. **Componente de Filtros (`InventarioFiltros.tsx`)**:
   - O campo dropdown "CEMITÉRIO / NECRÓPOLE" é ocultado da barra de filtros local (já que o cemitério ativo já está em destaque na `NecropoleHeaderBar`).
   - O dropdown "SETOR / QUADRA" passa a exibir exclusivamente os setores vinculados a `cemiterioAtivoId`.
3. **Barra de Ações Rápidas**:
   - O botão `+ Novo Cemitério` é suprimido da visualização de inventário da necrópole, exibindo apenas as ações cabíveis no parque: `+ Novo Setor/Quadra`, `+ Novo Jazigo`, `Importar Planilha (CSV)`.
4. **Subtítulo e KPIs**:
   - O subtítulo passa de "Visão integrada de todos os cemitérios do município" para "Inventário operacional exclusivo: {cemiterioAtivo.nome}".
   - Os KPIs calculam métricas exclusivamente com base nas unidades retornadas para a necrópole selecionada.

---

### D3: Isolamento Contextual em Todas as Abas do Módulo
As views correspondentes a cada aba do módulo de cemitérios consumirão `useCemiteriosContext()` e repassarão o parâmetro `park_id: cemiterioAtivoId`:
- **Mapa GIS (`MapaView.tsx`)**: Renderiza os polígonos, setores e jazigos apenas do `cemiterioAtivoId`.
- **Operações (`OperacoesView.tsx`)**: Filtra sepultamentos, exumações e ordens de serviço por `park_id: cemiterioAtivoId`.
- **Concessões (`ConcessoesView.tsx`)**: Filtra contratos e termos vinculados a jazigos do parque ativo.
- **Financeiro (`FinanceiroView.tsx`)**: Filtra guias de arrecadação do parque ativo.
- **Empreiteiros (`EmpreiteirosView.tsx`)**: Filtra empreiteiros e ordens de obras tumulares autorizadas para a necrópole ativa.
- **Vistoria e Abandono (`VistoriaView.tsx`)**: Filtra laudos de vistoria e processos de abandono de jazigos da necrópole ativa.

---

## Riscos / Trade-offs

| Risco | Mitigação |
|---|---|
| Inconsistência de filtro ao trocar de necrópole pelo cabeçalho | O contêiner de abas em `CemiteriosModule.tsx` já possui `key={cemiterioAtivoId}`, forçando remontagem limpa e imediata das views filhas com os novos dados. |
| Perda de compatibilidade caso o inventário seja aberto sem cemitério selecionado | Implementar fallback gracioso: se `cemiterioAtivoId === null`, a tela de seleção é renderizada em primeiro lugar. |
| Densidade de colunas na DataTable em telas menores | Colunas secundárias (ex: Responsável, Dimensões) tornam-se responsivas (`hidden lg:table-cell`). |
