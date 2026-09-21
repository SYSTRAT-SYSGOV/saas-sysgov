# Design

## Context

`PortalRhView.tsx` já tem, da mudança `enhance-portal-rh-distribuicao-departamento`:
- `secretariasOrg` (`useMemo` sobre `orgTree`, extrai secretarias/departamentos reais).
- `dadosDistribuicao` (agrupa `servidores` por secretaria/departamento real, com bucket
  "Servidores Não Classificados").
- `servidorPertenceAoDepartamento(servidor, departamento)` (função exportada e testada).

`columnsServidoresGeral` (linha ~557) ainda usa `getSiglaSecretaria`/`getNomeCurtoSecretaria` —
heurística de texto que não tem relação com o organograma real. Essas duas funções continuam
sendo usadas por `rankingDesempate` (aba "Ranking Desempate Art. 39"), fora do escopo desta
mudança.

SDK já expõe tudo que o painel de detalhe precisa, sem mudança de backend:
- `api.capd.listAvaliacoes({ servidor_id })` — sem `ciclo_id`, retorna todos os ciclos.
- `api.capd.listarQuinquenios(servidorId)`.
- `ApiServidor.afastamentos?: ApiServidorAfastamento[]` — já embutido na resposta de
  `listServidores()`.

## Goals / Non-Goals

**Goals:**
- A coluna de secretaria/departamento do Quadro de Servidores usa a mesma fonte de verdade da aba
  de Distribuição, sem duplicar a lógica de classificação.
- O painel de detalhe do servidor não faz nenhuma chamada de rede nova além das 3 já listadas
  acima (2 delas só disparadas ao abrir o painel, não no carregamento da aba inteira).

**Non-Goals:**
- Não adicionar filtros dedicados por secretaria/departamento/situação/estágio nesta mudança — o
  usuário optou por não incluir isso agora.
- Não migrar `getSiglaSecretaria`/`getNomeCurtoSecretaria` na aba "Ranking Desempate" — fora de
  escopo.
- Não adicionar edição de dados cadastrais no painel de detalhe — é somente leitura.

## Decisions

**1. Reaproveitar `dadosDistribuicao` para a coluna de secretaria/departamento, via um mapa
`servidorId → {secretaria, departamento}`.**
Em vez de rechamar `servidorPertenceAoDepartamento` por linha renderizada (custo O(servidores ×
departamentos) a cada render), constrói-se um `Map<number, {secretaria: string, departamento:
string}>` uma vez via `useMemo` a partir de `dadosDistribuicao` (que já fez essa classificação),
e a coluna faz uma leitura O(1) desse mapa. Servidor ausente do mapa exibe "Não Classificado".

**2. Painel de detalhe: `Modal` do `@sysgov/ui`, dados buscados sob demanda ao abrir.**
Estado `servidorDetalheId: number | null`; ao definir, dispara `Promise.all([listAvaliacoes,
listarQuinquenios])` para aquele servidor (afastamentos já vêm embutidos em `ApiServidor`, sem
chamada extra). Alternativa descartada: pré-carregar detalhe de todos os servidores no
`carregarDadosRh` inicial — rejeitada por custo (N chamadas para uma lista que pode ter centenas
de servidores, quando só uma fração será efetivamente aberta).

**3. `DataTable.onRowClick` abre o painel; a coluna "Ação" (Ver Avaliação) continua existindo
separadamente.**
Clicar em qualquer parte da linha abre o detalhe completo; o botão "Ver Avaliação" continua sendo
o atalho direto para o espelho da avaliação mais recente, sem precisar passar pelo painel de
detalhe primeiro. `stopPropagation` no clique do botão evita abrir os dois ao mesmo tempo.

## Risks / Trade-offs

- [Servidor com muitas avaliações históricas pode deixar o painel de detalhe longo] → Mitigação:
  lista paginada/rolável dentro do `Modal`, mesma convenção de `DataTable` usada no resto do
  módulo se a lista crescer; para o volume esperado (3 avaliações/ano por servidor), não é um
  problema imediato.
- [Duplicar visualmente informação que já existe na aba de Estágio Probatório] → Mitigação:
  aceitável — o painel de detalhe é uma visão consolidada sob demanda, não substitui as abas
  dedicadas.

## Migration Plan

Nenhuma migração de schema, dado ou API. Deploy é o release normal do frontend.
