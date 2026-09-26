# Tarefas de Implementação: DataTable Principal e Isolamento Estrito de Necrópole

## 1. DataTable com Filtros Avançados na Tela Principal (`SelecaoNecropoleView`)

- [x] 1.1 Adicionar controle de alternância de modo de visualização (`modoExibicao: 'tabela' | 'cards'`) em `SelecaoNecropoleView.tsx` com botões de alternância e `'tabela'` como padrão ativo. Verificar renderização padrão em tabela.
- [x] 1.2 Implementar painel de filtros avançados na tela de seleção: busca textual rápida (código, nome, endereço), filtro por status operacional (Ativo, Em Manutenção, Saturado) e filtro por faixa de ocupação. Verificar funcionamento reativo dos filtros.
- [x] 1.3 Construir a visualização em DataTable utilizando componentes `@sysgov/ui` (`Table`, `TableHeader`, `TableHead`, `TableRow`, `TableCell`, `Badge`, `Button`) exibindo colunas: Código, Nome, Endereço/Bairro, Responsável, Setores, Jazigos Totais, Ocupação (com barra visual), Status e Botão "Acessar Gestão".
- [x] 1.4 Adicionar paginação fixa de 10 registros por página na DataTable de seleção.
- [x] 1.5 Manter a visualização em Grade de Cards funcional quando o usuário alternar para o modo cards.

## 2. Isolamento Estrito da Aba de Inventário (`InventarioView` e `InventarioFiltros`)

- [x] 2.1 Em `InventarioView.tsx`, consumir `cemiterioAtivoId` e `cemiterioAtivo` do `useCemiteriosContext()` e travar o parâmetro `park_id: cemiterioAtivoId` em todas as chamadas à API de jazigos (`cemiteriosApi.jazigos`).
- [x] 2.2 Atualizar `InventarioKpis.tsx` para garantir que o total de unidades, disponíveis, ocupadas e em ruína reflitam única e exclusivamente a necrópole ativa selecionada.
- [x] 2.3 Em `InventarioFiltros.tsx`, ocultar o seletor dropdown "CEMITÉRIO / NECRÓPOLE" quando houver uma necrópole ativa selecionada, mantendo o filtro fixo no parque ativo.
- [x] 2.4 Restringir o seletor "SETOR / QUADRA" exclusivamente aos setores pertencentes à necrópole ativa.
- [x] 2.5 Remover o botão "+ Novo Cemitério" da barra de ações do inventário local, mantendo apenas "+ Novo Setor/Quadra", "+ Novo Jazigo" e "Importar Planilha (CSV)".
- [x] 2.6 Atualizar o subtítulo do inventário local, substituindo a mensagem global por identificação do inventário exclusivo da necrópole ativa.

## 3. Isolamento Contextual nas Demais Abas do Módulo

- [x] 3.1 Em `OperacoesView.tsx`, vincular as consultas de sepultamentos, exumações e ordens de serviço estritamente ao `cemiterioAtivoId`.
- [x] 3.2 Em `ConcessoesView.tsx`, filtrar a listagem de concessões e contratos ativos exclusivamente para jazigos pertencentes ao `cemiterioAtivoId`.
- [x] 3.3 Em `MapaView.tsx`, restringir o carregamento dos setores, quadras e jazigos georreferenciados apenas ao `cemiterioAtivoId`.
- [x] 3.4 Em `FinanceiroView.tsx`, restringir as guias e valores arrecadados ao escopo do `cemiterioAtivoId`.
- [x] 3.5 Em `VistoriaView.tsx` e `EmpreiteirosView.tsx`, isolar laudos de vistoria e ordens de obras tumulares para a necrópole ativa.

## 4. Testes Automatizados Unitários e de Integração

- [x] 4.1 Atualizar `SelecaoNecropoleView.test.tsx` para validar a renderização padrão em DataTable, alternância para cards e aplicação dos filtros avançados.
- [x] 4.2 Atualizar `InventarioView.test.tsx` para verificar o isolamento de dados por necrópole ativa, ocultação do botão "+ Novo Cemitério" e ausência do seletor global de cemitérios.
- [x] 4.3 Criar testes validando o isolamento contextual do `cemiterioAtivoId` nas abas de Operações, Concessões e Mapa.

## 5. Verificação de Regressão e Validação Estática

- [x] 5.1 Executar a suíte completa de testes do módulo `npm test -- --run src/modules/cemiterios` garantindo 100% de aprovação.
- [x] 5.2 Executar checagem estática de tipos `npx tsc --noEmit` garantindo zero erros de compilação TypeScript.
