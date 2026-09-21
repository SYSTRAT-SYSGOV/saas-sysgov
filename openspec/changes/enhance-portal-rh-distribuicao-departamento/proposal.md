# Proposal

## Why

A aba "Distribuição por Pasta & Departamento" do Portal de RH e Secretaria Municipal de Gestão de
Pessoas (`PortalRhView.tsx`, módulo CAPD) exibe uma estrutura organizacional **fictícia e fixa**
(`ESTRUTURA_ORGANIZACIONAL_CANONICA`: 5 secretarias de "Araucária" com secretário/diretor
nomeados por nome próprio, ex. "Dr. Paulo Roberto Guimarães"), idêntica para qualquer tenant que
acesse o sistema — não vem do organograma real cadastrado pelo módulo OrgChart. Os KPIs do topo
(Secretarias, Departamentos, Chefias Nomeadas, Servidores Lotados, Vínculos no Órgão) também são
números estáticos hardcoded, que não refletem nem a estrutura fictícia nem os servidores reais já
carregados pela própria aba. O encaixe de servidores reais dentro dessa estrutura fictícia é feito
por correspondência de texto aproximada (`lotacao_fisica`/`cargo_efetivo` contra o nome do
departamento fictício), descartando silenciosamente quem não corresponde a nenhum departamento da
lista fixa.

## What Changes

- Substituir `ESTRUTURA_ORGANIZACIONAL_CANONICA` pela árvore organizacional real do tenant, já
  disponível via `api.org.getTree()` (módulo OrgChart, unidades do tipo `secretaria` e
  `departamento`, com responsáveis reais em `responsibles`).
- Substituir o encaixe de servidores por texto aproximado por vínculo direto via
  `servidor.org_unit_id`, com fallback textual (mesmo padrão já usado em
  `PerguntaService.identificarGrupoFuncional` no backend) apenas para servidores sem
  `org_unit_id` preenchido.
- Corrigir os 5 KPIs do topo e os badges por secretaria/departamento ("N Departamentos", "Total: N
  Servidores + N Chefias") para serem calculados a partir dos dados reais carregados, não valores
  fixos.
- Adicionar bucket explícito de "Servidores não classificados" para quem não corresponde a
  nenhuma unidade organizacional (em vez de descarte silencioso).
- Manter o layout visual atual (cards por secretaria, grid de departamentos, tabela matriz
  consolidada) — a mudança é de fonte de dados, não de desenho de tela.

## Capabilities

### New Capabilities

(nenhuma — esta mudança estende uma capability já existente)

### Modified Capabilities

- `capd`: substitui a estrutura organizacional fictícia da aba "Distribuição por Pasta &
  Departamento" pelo organograma real do tenant (módulo OrgChart) e corrige os indicadores
  agregados para refletirem dados reais.

## Impact

- Frontend: `apps/web-client/src/modules/capd/views/PortalRhView.tsx` — remove
  `ESTRUTURA_ORGANIZACIONAL_CANONICA` e reescreve `dadosDistribuicao` para consumir
  `api.org.getTree()` (já existente no SDK, `packages/sdk/src/modules/org/client.ts`) em vez do
  array fixo; KPIs e badges passam a ser derivados.
- Backend: nenhuma mudança — `GET /api/org-units` (`ClientOrgChartController::index`) já existe e
  já retorna a árvore com responsáveis, escopada por tenant.
- Permissão: o endpoint de organograma exige `org.view` ou um dos papéis
  `super_admin/admin_tenant/auditor/responsavel/membro` (`OrgUnitPolicy::viewAny`) — usuários do
  Portal de RH que hoje só têm permissões `capd.*` podem não ter acesso; a ser tratado em
  design.md (degradação graciosa e/ou nota operacional sobre concessão de permissão).
- Sem migração de schema; sem impacto em outros módulos ou tenants além de tornar esta aba correta
  para qualquer tenant (hoje só "funciona" visualmente para o tenant de demonstração).
