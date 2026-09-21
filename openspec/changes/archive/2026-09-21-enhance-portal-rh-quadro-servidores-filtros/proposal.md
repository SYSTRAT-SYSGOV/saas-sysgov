# Proposal

## Why

A aba "Quadro de Servidores" do Portal de RH e Secretaria Municipal de Gestão de Pessoas (`PortalRhView.tsx`, `activeTab === 'servidores'`, módulo CAPD) é a central de consulta cadastral e funcional dos servidores municipais para os gestores de Recursos Humanos. Atualmente, a experiência do usuário apresenta três deficiências graves:

1. **Ausência de Filtros Avançados**: A tabela conta apenas com uma barra de busca textual genérica do `DataTable`. Os gestores de RH não conseguem segmentar os servidores por critérios essenciais da administração pública, como Secretaria de lotação, Departamento, Regime Jurídico (Estatutário RPPS vs Comissionado), Situação Probatória (Estágio Probatório vs Estável), Fase do Estágio Probatório (1ª, 2ª ou 3ª Fase), Situação Funcional (Ativo vs Afastado) ou presença de avaliação no ciclo ativo.
2. **Barra de Rolagem Lateral (Scroll Horizontal) Indesejada**: As 9 colunas da listagem somam larguras fixas de 1.455px com travas `min-w-[...]` por célula e `fixedLayout`, forçando uma barra de rolagem horizontal desnecessária na tabela mesmo em monitores comuns de estações de trabalho do serviço público (1024px a 1440px), o que quebra a visualização contínua e a ergonomia de trabalho.
3. **Aba Incompleta em Inteligência Gerencial**: Não há indicadores executivos consolidados (KPIs dedicados ao quadro funcional) no topo da aba, deixando a tela limitada a uma tabela sem síntese panorâmica de servidores efetivos, estagiários, alocações e pendências cadastrais.

## What Changes

- **Painel e Barra de Filtros Avançados Estruturados**:
  - Campo de busca textual por Nome, Matrícula, CPF ou Cargo.
  - Seletores de filtro avançado: Secretaria (carregada do organograma institucional real), Departamento (contextual à secretaria selecionada ou geral), Regime Jurídico (Estatutário vs Comissionado), Condição Probatória (Todos, Em Estágio Probatório, Estáveis), Fase do Estágio (1ª Fase, 2ª Fase, 3ª Fase) e Situação Funcional (Ativo vs Afastado).
  - Quick filters (chips/pills de um clique) para filtros frequentes: "Todos", "Estágio Probatório", "Estáveis", "Sem Lotação Cadastrada".
  - Contador de resultados filtrados em tempo real (ex.: "Exibindo 45 de 120 servidores") e botão "Limpar Filtros".
- **Eliminação da Barra de Rolagem Horizontal (Grid Otimizado e Responsivo)**:
  - Redesenho e fusão harmoniosa de colunas para eliminar a sobrecarga de largura horizontal:
    - Coluna **Servidor Público**: Nome completo em destaque, com matrícula em badge mono (`font-mono tabular-nums`) e CPF/e-mail em linha secundária.
    - Coluna **Cargo & Regime**: Cargo efetivo com badge semântico de regime ou função.
    - Coluna **Lotação Institucional**: Secretaria (com badge de sigla e nome) e Departamento correspondente unificados em uma única coluna verticalmente organizada.
    - Coluna **Chefia Imediata**: Nome do responsável ou titular da pasta.
    - Coluna **Situação & Vínculo**: Badge semântico de Estágio Probatório/Estabilidade e status funcional.
    - Coluna **Ações**: Ações diretas compactas ("Ver Avaliação", "Dossiê").
  - Ajuste de dimensionamento para que a tabela ocupe 100% da largura disponível sem transbordamento lateral em resoluções de desktop comuns (a partir de 1024px).
- **Enriquecimento Executivo da Aba (Quadro Completo com KPIs)**:
  - Inclusão de cards de indicadores (KPIs) no topo da aba:
    - **Total do Quadro**: Quantidade total de servidores cadastrados.
    - **Estágio Probatório**: Total e percentual de servidores em avaliação probatória trienal.
    - **Servidores Estáveis**: Total e percentual de servidores efetivos e estáveis (CF Art. 41).
    - **Lotação Organizacional**: Total de servidores alocados formalmente vs servidores sem unidade identificada.
  - Exportação fiel dos dados filtrados (CSV, Excel e PDF) refletindo a seleção dos filtros avançados.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende a capability `capd` já existente)

### Modified Capabilities

- `capd`: moderniza e aprimora a aba "Quadro de Servidores" do Portal de RH, integrando filtros avançados multivariados, remoção da barra de rolagem lateral com otimização das colunas da tabela e inclusão de KPIs panorâmicos de gestão de pessoas.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` — aprimoramento da sub-aba `servidores`, novos estados de filtros avançados, composição limpa de colunas para `columnsServidoresGeral` e painel de indicadores estatísticos executivos.
- Backend: nenhuma alteração de schema ou endpoint — reutiliza integralmente `api.capd.listServidores`, `api.org.getTree` e `api.capd.listAvaliacoes`.
- Testes: inclusão de testes unitários Vitest para as funções puras de filtragem composta e cálculo dos indicadores do quadro de servidores.
