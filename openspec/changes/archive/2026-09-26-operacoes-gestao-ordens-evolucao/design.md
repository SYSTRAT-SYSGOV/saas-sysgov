# Design Técnico: Evolução da Aba de Operações com DataTables e Filtros Avançados

## Contexto

A aba de Operações (`OperacoesView.tsx`) do módulo de Cemitérios centraliza a execução e o acompanhamento de Ordens de Serviço (OS), sepultamentos (inumações), exumações e trasladações. Atualmente, o componente apresenta limitações de usabilidade para grandes volumes de dados operacionais devido à ausência de paginação estruturada em tabela, métricas agregadas (KPIs), filtros multicritério e visualizações especializadas tanto para a equipe administrativa quanto para a equipe de campo.

Ver [proposal.md](file:///c:/laragon/www/saas-sysgov/openspec/changes/operacoes-gestao-ordens-evolucao/proposal.md) para a motivação detalhada e necessidades de negócio.

## Objetivos e Não-Objetivos

**Objetivos:**
- Desenvolver um painel superior de **KPIs operacionais** (`OperacoesKpis.tsx`) exibindo o volume de ordens abertas, em execução hoje, sepultamentos no mês e exumações/trasladações sob carência sanitária.
- Implementar **alternância de modo de visualização** para Ordens de Serviço (`modoVisao: 'tabela' | 'cards'`), permitindo uso eficiente tanto em computadores de mesa quanto em celulares/tablets da equipe de campo.
- Criar a listagem em **`DataTable` rica** para Ordens de Serviço, com ordenação por colunas, paginação configurável (10, 25, 50, 100), busca instantânea, badges de situação semânticos e ações contextuais.
- Criar o painel retrátil de **Filtros Avançados** (`FiltrosAvancadosOperacoes.tsx`) com critérios combinados: busca unificada (OS, falecido, jazigo), situação da OS, tipo de serviço, intervalo de datas (agendada/executada) e equipe responsável.
- Criar o **Modal de Detalhe da Ordem de Serviço** (`ModalDetalheOrdemServico.tsx`), com informações do falecido, sepultura/gaveta, equipe, histórico e atalho para download da guia PDF.
- Aprimorar as tabelas de **Inumações** e **Exumações**, incluindo atalhos para abrir a ficha do túmulo correspondente sem perder a navegação.
- Garantir total aderência às diretrizes do `DESIGN_SYSTEM.md`, com componentes `@sysgov/ui` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).

**Não-Objetivos:**
- Não serão alteradas as entidades de banco de dados ou regras de negócio sanitárias/jurídicas do `OperacaoService` (a modelagem atual já suporta todos os campos e transições).
- Não haverá substituição do fluxo de emissão de PDFs ou dos fluxos de transição de status existentes (`iniciar`, `concluir`, `suspender`, `cancelar`).

## Decisões Técnicas de Arquitetura

### 1. Componentização Modular e Desacoplamento
Em vez de concentrar toda a lógica dentro de um único arquivo de 600 linhas, a arquitetura será dividida em submódulos reutilizáveis:
- `apps/web-client/src/modules/cemiterios/views/operacoes/OperacoesKpis.tsx`: Apresentação das métricas consolidadas através de `KpiCard` do `@sysgov/ui`.
- `apps/web-client/src/modules/cemiterios/views/operacoes/OrdensServicoDataTable.tsx`: Tabela de OS com TanStack Table, ordenação, seleção de página e suporte a ações rápidas.
- `apps/web-client/src/modules/cemiterios/views/operacoes/OrdensServicoCards.tsx`: Grade de cartões de OS otimizada para equipe de campo.
- `apps/web-client/src/modules/cemiterios/views/operacoes/FiltrosAvancadosOperacoes.tsx`: Componente de controle com inputs, selects e tags de filtros ativos.
- `apps/web-client/src/modules/cemiterios/views/operacoes/ModalDetalheOrdemServico.tsx`: Visualizador minucioso da ordem de serviço com `size="2xl"`.
- `apps/web-client/src/modules/cemiterios/views/OperacoesView.tsx`: Orquestrador principal da aba com controle de abas, estado compartilhado e modais.

*Alternativa considerada:* Manter tudo no mesmo arquivo `OperacoesView.tsx`. Rejeitada para preservar legibilidade, facilidade de manutenção e testes unitários isolados.

### 2. Alternância de Visão (Tabela vs. Cards)
- O estado `modoVisao` (`'tabela' | 'cards'`) será controlado pelo usuário através de um botão segmentado com ícones (`LayoutList` e `LayoutGrid`).
- O estado padrão no desktop será `'tabela'` e a alternância será reativa, preservando instantaneamente todos os filtros aplicados e a página atual.

*Alternativa considerada:* Forçar somente tabela. Rejeitada porque coveiros e fiscais utilizam celulares no campo onde a tabela exige rolagem horizontal indesejada.

### 3. Backend e Compatibilidade de Filtros
- O `OrdemServicoController.php` no backend já oferece filtragem por `situacao`, `tipo` e `park_id`.
- Iremos garantir que o endpoint suporte filtros complementares de intervalo de datas (`data_inicio`, `data_fim`), `equipe` e busca textual ampla (`busca`), realizando as consultas com índices compostos e eager loading otimizado (`with(['jazigo:id,codigo,park_id', 'jazigo.cemiterio:id,nome'])`).

### 4. Integração Contínua com o Túmulo
- Ao visualizar qualquer inumação ou ordem de serviço vinculada a um jazigo, haverá um botão que aciona o `ModalDetalheJazigo.tsx` passando o jazigo correspondente, proporcionando uma experiência de navegação integrada e sem atrito.

## Riscos e Mitigações

- **[Risco] Sobrecarga de chamadas de API ao digitar na busca**:
  - *Mitigação*: Implementar debounce de 300ms nos inputs de busca textual ou realizar o filtro de busca local na página quando aplicável.
- **[Risco] Diversidade de situações e transições de OS**:
  - *Mitigação*: Centralizar a máquina de estados das transições e as permissões RBAC no utilitário de operações, com diálogos de confirmação protegidos (`ConfirmDialog`) para cancelamentos e suspensões.
- **[Risco] Quebra de layout em telas menores**:
  - *Mitigação*: O modo de cartões (`Cards`) e a responsividade da `DataTable` garantem adaptação visual em resoluções de 320px até 4K.
