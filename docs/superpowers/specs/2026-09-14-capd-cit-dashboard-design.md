# CAPD — Vínculo CIT com evidência + Dashboard do Avaliador

**Data:** 2026-09-14
**Módulo:** `apps/api/Modules/Capd`, `apps/web-client/src/modules/capd`, `packages/sdk`

## Contexto

Uma análise do repositório externo `new-avaliacao` (sistema misto BARS+CIT, fora deste
projeto) trouxe duas ideias que não dependem de metodologia BARS e por isso são seguras
de adotar sem violar a regra do `CLAUDE.md` que proíbe BARS no CAPD:

1. Vincular explicitamente uma nota extrema (grau 1, 2 ou 5) a um incidente específico do
   Diário de Bordo (CIT), com upload de evidência feito sem sair da tela de preenchimento.
2. Um dashboard de KPIs (estilo *bento grid*) no topo do Portal do Avaliador, hoje apenas
   uma tabela.

Investigação do código existente revelou que:

- Upload de evidência documental **já existe** no backend
  (`POST /api/capd/diario-bordo/{id}/evidencias`, modelo `Evidencia`, hash SHA-256,
  dedupe) — falta só expor no modal de avaliação.
- A Trava Anti-Leniência (`TravaElectronicaService::validar`) **já exige** um CIT
  **com evidência** (`comEvidencia()`), não apenas um CIT qualquer. O aviso atual no
  `AvaliacaoFormModal.tsx` (implementado numa sessão anterior) verifica só a existência de
  qualquer CIT para o fator — impreciso, será corrigido aqui.
- `PainelGerencialService::visaoGestor()` já calcula KPIs básicos de equipe, mas fica
  atrás da permissão `capd.dashboard.view` (voltada a comissão/DRH/gestor). O avaliador
  comum (chefia imediata) usa hoje `AvaliacaoController::index()`, que **não** exige essa
  permissão — só escopa por `avaliador_id`. O novo endpoint de KPIs segue esse mesmo
  padrão de escopo, sem gate novo de permissão.

## Feature A — Vínculo com Incidente CIT + evidência inline

### Modelo de dados

Sem migration nova. `RespostaFator` (JSON, coluna `avaliacoes.respostas_fatores`) ganha
um campo opcional:

```ts
export type RespostaFator = {
  grau: number;
  automatizado?: boolean;
  justificativa?: string;
  diario_bordo_id?: number; // NOVO — incidente CIT vinculado como justificativa oficial
};
```

### Backend

- `AvaliacaoController::salvarRascunho` (validação): adicionar regra opcional
  `respostas_fatores.*.diario_bordo_id => ['nullable','integer','exists:capd_diario_bordo,id']`
  para integridade — não bloqueia se ausente.
- Nenhuma mudança nas rotas: `POST /diario-bordo/{id}/evidencias` já existe e já é
  suficiente para o upload inline.

### Frontend (`AvaliacaoFormModal.tsx`)

- Cada incidente CIT listado (dentro do card expansível já existente por fator) ganha:
  - Botão **"Vincular como justificativa desta nota"** quando ainda não vinculado a essa
    resposta; ao clicar, grava `diario_bordo_id` na resposta do fator e **preenche
    automaticamente** (editável) o textarea de justificativa com o `descricao_fato` do
    incidente — satisfaz o mínimo de 20 caracteres na prática, sem regra especial de
    bypass.
  - Estado **"Vinculado ✓"** (chip) quando `respostas[codigo].diario_bordo_id === a.id`,
    com opção de desvincular.
  - Botão **"Anexar evidência"** quando `a.evidencias.length === 0` — abre um
    `<input type="file" accept=".pdf,.png,.jpg,.jpeg">`, chama o novo método do SDK
    `uploadEvidenciaDiarioBordo(id, file)` e re-busca a lista de CIT do fator ao concluir.
- Correção do aviso amarelo: trocar `anotacoesFator.length === 0` por
  `!anotacoesFator.some(a => (a.evidencias?.length ?? 0) > 0)` — reflete a regra real da
  Trava (exige evidência, não só o registro).

### SDK (`packages/sdk/src/modules/capd/client.ts`)

Novo método:

```ts
async uploadEvidenciaDiarioBordo(id: number, arquivo: File): Promise<ApiEvidencia> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  return this.api.request(`/capd/diario-bordo/${id}/evidencias`, { method: 'POST', body: form });
}
```

## Feature B — Dashboard de KPIs no Portal do Avaliador

### Backend

Novo endpoint `GET /api/capd/avaliacoes/kpis-equipe?ciclo_id=` →
`AvaliacaoController::kpisEquipe()` (mesmo controller do `index()`, reaproveitando o
padrão de escopo: admin/gestor vê tudo, avaliador comum vê só a própria equipe via
`avaliador_id`).

Resposta:

```json
{
  "total_equipe": 12,
  "pendentes": 3,
  "concluidas": 9,
  "nota_media": "8.42",
  "distribuicao_graus": { "1": 0, "2": 1, "3": 4, "4": 20, "5": 11 }
}
```

`distribuicao_graus` é calculado iterando `respostas_fatores` (JSON) das avaliações
concluídas do escopo — aceitável em volume (equipes de dezenas, não milhares).

**Fora do escopo desta v1** (para manter o corte pequeno): métrica de "fatores aguardando
CIT" por exigir cruzar cada resposta extrema em rascunho com a Trava por fator — fica como
melhoria futura, não bloqueia a entrega dos KPIs básicos.

### SDK

```ts
async getKpisEquipe(params?: { ciclo_id?: number }): Promise<ApiKpisEquipe> { ... }
```

### Frontend (`apps/web-client/src/modules/capd/views/PortalAvaliadorView.tsx`)

- Nova seção no topo (acima das abas "Avaliações de Subordinados"/"Diário de Bordo"):
  4 `KpiCard` (`@sysgov/ui`) — Total da Equipe, Pendentes, Concluídas, Nota Média — mais
  uma barra horizontal compacta de distribuição de graus (5 segmentos coloridos, sem lib
  de gráfico — reaproveita a paleta de tons já criada em `AvaliacaoFormModal.tsx`).
- Para evitar duplicação, os tons por grau (`success`/`warning`/`danger` por grau 1-5)
  são extraídos para um util compartilhado
  `apps/web-client/src/modules/capd/graduTone.ts` e importados nos dois lugares
  (melhoria pontual, justificada por já estarmos tocando código adjacente — sem mexer em
  mais nada fora disso).
- Busca ao montar a view e ao trocar de ciclo (mesmo padrão de fetch já usado na view).

## Testes

- Backend: teste de feature para `kpisEquipe` confirmando escopo (avaliador comum só vê a
  própria equipe; admin/gestor vê tudo), seguindo o padrão de
  `Modules/Capd/Tests/Feature/*`.
- Frontend: `npm run typecheck` no workspace `apps/web-client`; verificação manual no
  browser (fluxo de vincular CIT, upload de evidência, KPIs carregando).
- Não é necessário teste novo para o upload de evidência em si (endpoint já testado
  previamente) — só a integração de UI.

## Fora de escopo

- Qualquer coisa BARS-específica do repositório de referência (âncoras comportamentais,
  nota mista BARS+OKR, perguntas por categoria de cargo) — permanece proibido pelo
  `CLAUDE.md`.
- "Fatores aguardando CIT" como KPI (mencionado acima).
- Trava de PAD (processo disciplinar ativo) mencionada no relatório — não fazia parte do
  pedido desta sessão.
