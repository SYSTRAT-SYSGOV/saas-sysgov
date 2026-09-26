# Proposta: Seleção de Necrópole e Painel de Administração Geral de Cemitérios

## Por que (Why)

Atualmente, ao acessar o módulo de Gestão de Cemitérios na plataforma `web-client`, o sistema abre diretamente em uma visão geral sem considerar a abrangência de acesso do usuário nem a existência de múltiplos cemitérios no município. 

Em administrações municipais, existem diferentes perfis operacionais e executivos:
1. **Operadores de Necrópole Local**: servidores designados para atuar exclusivamente em um cemitério específico (ex: Cemitério Municipal Central).
2. **Operadores Regionais/Multiparque**: servidores que atendem a um conjunto específico de cemitérios distritais.
3. **Gestores Municipais / Secretários**: responsáveis pela coordenação geral de todos os cemitérios da municipalidade, necessitando de uma visão macro consolidada (estatísticas, financeiro, manutenções preventivas/corretivas e capacidade dos jazigos em nível municipal) e da flexibilidade de alternar para qualquer necrópole individual.

Sem um fluxo estruturado de seleção inicial e uma visão de Administração Geral, o usuário fica sem contexto claro sobre qual necrópole está gerenciando e a gestão municipal carece de um centro de comando unificado.

## O Que Muda (What Changes)

- **Fluxo de Acesso Inicial Inteligente (Gatekeeper)**:
  - Se o usuário tiver permissão a **apenas 1 cemitério**, o sistema pula a tela de escolha e vai diretamente para o painel de gestão daquele cemitério.
  - Se o usuário tiver permissão a **mais de 1 cemitério**, a primeira tela exibida é a **Seleção de Necrópole**, apresentando cards informativos de cada cemitério disponível (com nome, localização, capacidade/ocupação e status).
- **Perfil de Gestão Municipal (Acesso Global)**:
  - Usuários com perfil de gestão global/municipal (`cemiterios.admin` ou gestor municipal) visualizam todos os cemitérios do município e dispõem de acesso a uma tela/aba dedicada de **Administração Geral**.
- **Painel de Administração Geral Consolidado**:
  - Nova área executiva com indicadores agregados de todo o município:
    - Dashboards consolidados (taxa de ocupação global, sepultamentos no mês, exumações previstas).
    - Painel Financeiro Macro (arrecadação de taxas de concessão, inadimplência e manutenções).
    - Gestão Consolidada de Manutenções e Ocorrências em todas as necrópoles.
    - Atalho rápido para selecionar qualquer cemitério individual.
- **Alternador de Necrópole (Necrópole Switcher) no Cabeçalho**:
  - Quando um cemitério estiver selecionado, um componente de cabeçalho permite visualizar o cemitério ativo e alternar facilmente para outro (ou retornar à Administração Geral, se o perfil permitir), sem necessidade de recarregar a aplicação.
- **Exibição Contextual das Abas da Necrópole**:
  - Ao selecionar um cemitério, o sistema carrega o escopo operacional exclusivo daquela necrópole, exibindo todas as abas funcionais (Visão Geral da Necrópole, Inventário de Jazigos, Concessões, Operações, Vistorias, Mapa GIS, Financeiro Local e Empreiteiros).

## Capacidades (Capabilities)

### Novas Capacidades
- `cemiterio/selecao-necropole`: Define os requisitos de controle de acesso multi-cemitério, tela inicial de seleção de necrópole, roteamento automático single-cemetery, painel consolidado de administração geral municipal e alternância de contexto de necrópole ativa.

### Capacidades Modificadas
<!-- Nenhuma especificação anterior teve seus requisitos alterados. A especificação de inventário existente permanece válida dentro do contexto da necrópole selecionada. -->

## Impacto (Impact)

- **Frontend (`apps/web-client`)**:
  - `apps/web-client/src/modules/cemiterios/CemiteriosModule.tsx`: Refatoração do fluxo principal para suportar o estado de seleção inicial e o modo "Administração Geral".
  - `apps/web-client/src/modules/cemiterios/context/CemiteriosContext.tsx`: Expansão do contexto para armazenar o cemitério ativo (`cemiterioAtivoId`), lista de cemitérios acessíveis e modo de visualização.
  - Novos componentes de visualização:
    - `SelecaoNecropoleView.tsx`: Grid de cards para escolha do cemitério com busca e métricas rápidas.
    - `AdministracaoGeralView.tsx`: Dashboard executivo consolidado com kpis, financeiro global e manutenções municipais.
    - `NecropoleHeaderBar.tsx`: Barra contextual com identificação da necrópole atual, status e botão de troca de contexto.
  - Componentes do Design System (`@sysgov/ui`): uso obrigatório de `Card`, `Badge`, `Button`, `StatCard`/`KpiCard` e tipografia `JetBrains Mono` (`font-mono tabular-nums`).
- **Segurança e RBAC**:
  - Integração com `useCan` e permissões de perfil para diferenciar gestores municipais (`cemiterios.admin`) de operadores de cemitério local.
- **Backend / APIs (`apps/api`)**:
  - O endpoint de listagem de parques (`cemiteriosApi.parques()`) já retorna os cemitérios do tenant municipal. Adição de endpoint ou agregação analítica consolidada para estatísticas municipais.
