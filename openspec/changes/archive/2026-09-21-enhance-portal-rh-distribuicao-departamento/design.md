# Design

## Context

`PortalRhView.tsx` já importa `ESTRUTURA_ORGANIZACIONAL_CANONICA` (array fixo de 5 secretarias
fictícias) e o `useMemo dadosDistribuicao` que encaixa `servidores` (reais, já carregados) dentro
dela por correspondência de texto. Ver proposal.md - Why para o problema completo.

O módulo OrgChart já expõe tudo que esta mudança precisa, sem alteração de backend:
- `GET /api/org-units` (`ClientOrgChartController::index`), com `?flat=false` (padrão) retornando
  a árvore completa via `OrgTreeService`, cada nó com `responsibles` (relação `OrgUnit::responsibles()`,
  já filtrada por `pivot.role = 'responsavel'` no model).
- SDK: `api.org.getTree(): Promise<{ data: OrgUnitTreeNode[] }>` (`packages/sdk/src/modules/org/client.ts`).
- `OrgUnit.type` inclui `'secretaria'` e `'departamento'` como valores usados pela árvore canônica
  (`OrgUnit::TYPES` no backend).
- `ApiServidor.org_unit_id?: number | null` já existe como vínculo direto servidor → unidade.

## Goals / Non-Goals

**Goals:**
- A estrutura de secretarias/departamentos exibida vem do organograma real do tenant, não de um
  array fixo.
- Os indicadores agregados e badges são sempre consistentes com os cards renderizados.
- Nenhum servidor real é descartado silenciosamente da contagem.

**Non-Goals:**
- Não exibir níveis organizacionais além de secretaria → departamento (divisão/setor ficam fora
  do escopo desta aba, como já era antes).
- Não alterar o endpoint `GET /api/org-units` nem qualquer parte do módulo OrgChart — é consumo
  read-only do que já existe.
- Não resolver a concessão de permissão `org.view` para papéis do Portal de RH que hoje não a
  têm — apenas tratar a ausência dela sem quebrar a tela (ver Risco abaixo).

## Decisions

**1. Fonte da estrutura: `api.org.getTree()`, filtrando por `type` no cliente.**
Ao carregar a aba, buscar a árvore completa uma vez e filtrar nós com `type === 'secretaria'` como
nível 1; para cada secretaria, seus `children` com `type === 'departamento'` como nível 2.
Responsável de cada unidade = `unidade.responsibles?.[0]` (já vem filtrado por
`role: 'responsavel'` no backend; quando `is_primary` existir em mais de um, prioriza-lo).
Alternativa descartada: `api.org.listUnits({ type: 'secretaria' })` e uma segunda chamada para
departamentos — rejeitada porque `getTree()` já traz tudo em uma única chamada e preserva o
relacionamento pai/filho sem precisar recompor manualmente.

**2. Vínculo servidor → unidade: `org_unit_id` primeiro, fallback textual depois.**
Reaproveita o padrão já estabelecido no backend (`PerguntaService.identificarGrupoFuncional`):
tenta `servidor.org_unit_id === departamento.id` primeiro; se o servidor não tiver `org_unit_id`,
cai para a heurística de texto já existente (`lotacao_fisica`/`cargo_efetivo` contra nome/código
do departamento). Servidores que não batem em nenhum dos dois critérios entram no novo bucket
"Não Classificados" (Decisão 3), em vez de serem descartados.

**3. Bucket "Não Classificados": um card adicional, não uma secretaria fictícia.**
Servidores sem unidade correspondente aparecem num card à parte no fim da lista de secretarias,
com o mesmo layout de departamento mas sem responsável nomeado. Isso torna visível qualquer lacuna
de cadastro (servidor sem `org_unit_id` e sem lotação textual reconhecível) em vez de escondê-la.

**4. Indicadores agregados: sempre derivados da árvore + servidores carregados, nunca literais.**
`Secretarias` = nós `type==='secretaria'` retornados; `Departamentos` = soma de filhos
`type==='departamento'`; `Servidores Lotados` = soma de servidores classificados (incluindo o
bucket "Não Classificados"); `Chefias Nomeadas` = soma de `responsibles.length` de todas as
unidades; `Vínculos no Órgão` = `servidores classificados / total de servidores carregados`.

## Risks / Trade-offs

- [Usuário do Portal de RH sem permissão `org.view`/papel elegível recebe 403 de
  `GET /api/org-units`] → Mitigação: tratar o erro da chamada como "estrutura organizacional
  indisponível" com um `EmptyState` explicando que falta permissão, em vez de quebrar a aba
  inteira; documentar como nota operacional (fora do código) que esses papéis podem precisar de
  `org.view`.
- [Tenant sem nenhuma secretaria cadastrada no OrgChart ainda] → Mitigação: `EmptyState` orientando
  a cadastrar a estrutura organizacional no módulo OrgChart antes de usar esta aba.
- [Fallback textual pode classificar um servidor no departamento errado, como já podia acontecer
  antes] → Mitigação: comportamento idêntico ao já aceito no backend para o mesmo tipo de
  heurística; não piora o que já existia, só deixa de aplicá-lo sobre uma estrutura fictícia.

## Migration Plan

Sem migração de dados nem de API. Deploy é o release normal do frontend; rollback é reverter o
commit, já que nenhuma rota ou schema muda.
