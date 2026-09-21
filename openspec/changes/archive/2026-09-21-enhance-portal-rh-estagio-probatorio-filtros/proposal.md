# Proposal

## Why

A aba "Acompanhamento do Estágio Probatório" (`activeTab === 'estagio'`) do Portal de RH e Secretaria Municipal de Gestão de Pessoas (`PortalRhView.tsx`, módulo CAPD) é o instrumento central de controle da cadência avaliativa trienal (CF/88 Art. 41 e Lei nº 1.704/2006) que rege a aquisição da estabilidade funcional dos servidores públicos concursados.

Atualmente, essa aba apresenta as mesmas fragilidades de ergonomia e limitações funcionais que existiam anteriormente no quadro geral:
1. **Ausência de Filtros Especializados de Estágio**: Não há como filtrar os servidores em estágio probatório por Fase Avaliativa (1ª Fase / 12 meses, 2ª Fase / 24 meses, 3ª Fase / 36 meses), por Secretaria de Lotação, Departamento, Status do Estágio (`em_andamento`, `aprovado`, `suspenso`) ou por presença de avaliação realizada no ciclo ativo.
2. **Barra de Rolagem Lateral (Scroll Horizontal) Indesejada**: A listagem reutiliza uma tabela genérica com larguras fixas rígidas e `fixedLayout`, forçando uma barra de rolagem horizontal desnecessária na maioria das resoluções desktop (1024px a 1440px).
3. **Ausência de Indicadores Executivos (KPIs) de Estágio**: A tela exibe apenas um contador textual simples ("Em estágio: X"), desprovida de métricas de distribuição por fase avaliativa, servidores próximos da homologação de estabilidade e pendências avaliativas das chefias.
4. **Colunas Não Especializadas**: A tabela não dá ênfase visual à trajetória do estágio (fase atual, interstício temporal e status da avaliação periódica).

## What Changes

- **Painel Executivo de KPIs do Estágio Probatório**:
  - Cards de indicadores no topo da aba:
    - **Total em Estágio**: Efetivo total em período probatório.
    - **1ª Fase (12 meses)**: Quantidade e percentual de servidores no primeiro ano.
    - **2ª Fase (24 meses)**: Quantidade e percentual no segundo ano probatório.
    - **3ª Fase (36 meses)**: Quantidade na fase final / iminência de aquisição de estabilidade.
    - **Avaliados no Ciclo**: Cobertura avaliativa do ciclo vigente.
- **Barra de Ferramentas, Quick Filters e Painel de Filtros Avançados**:
  - Busca ágil multifacetada (Nome, Matrícula, CPF, Cargo, Secretaria).
  - Pílulas rápidas (*Quick Filters*): "Todos em Estágio", "1ª Fase", "2ª Fase", "3ª Fase" e "Avaliação Pendente".
  - Painel colapsável de Filtros Avançados: Secretaria (organograma real), Departamento contextual, Fase do Estágio, Status Probatório, Situação Funcional e Avaliação no Ciclo.
  - Contador em tempo real ("Exibindo X de Y servidores em estágio") e botão de limpeza rápida.
- **Redesenho das Colunas com Foco no Estágio Probatório e Sem Rolagem Lateral**:
  - Colunas ergonomicamente diagramadas:
    - **Servidor Público**: Matrícula mono em destaque + Nome completo + CPF.
    - **Cargo & Regime**: Cargo efetivo + Regime Estatutário (RPPS).
    - **Lotação Institucional**: Secretaria (badge de sigla e nome) + Departamento.
    - **Fase do Estágio & Interstício**: Badge de fase (1ª, 2ª ou 3ª Fase) com status probatório e prazo/admissão.
    - **Chefia Imediata**: Responsável pela avaliação periódica.
    - **Ações**: Botão de visualização do espelho avaliativo no ciclo e acesso ao dossiê funcional.
  - Eliminação da rolagem horizontal em resoluções desktop ($\ge 1024$px).
  - Exportação atômica em CSV, Excel e PDF via `meta.exportOnly`.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende a capability `capd` já existente)

### Modified Capabilities

- `capd`: moderniza a aba "Acompanhamento do Estágio Probatório" do Portal de RH, integrando filtros avançados por fase e órgão, layout responsivo sem scroll lateral, colunas especializadas de acompanhamento e indicadores executivos de cadência trienal.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` e utilitários puros em `PortalRhView.quadro.ts`.
- Backend: nenhuma alteração em APIs ou banco de dados — dados já providos por `api.capd.listServidores`, `api.org.getTree` e `api.capd.listAvaliacoes`.
- Testes: ampliação dos testes unitários no Vitest para cobrir os cálculos e filtros específicos do estágio probatório.
