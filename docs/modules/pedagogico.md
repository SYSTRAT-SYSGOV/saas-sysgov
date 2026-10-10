# Módulo Pedagógico (`api/pedagogico`)

Vida pedagógica dos alunos do cadastro escolar (módulo Escola, `requires: ["Admin", "Escola"]`).
Spec: `openspec/changes/modulos-educacao-backend/specs/pedagogico/spec.md`.

- **Middlewares:** `auth:sanctum`, `tenant`, `escola:pedagogico`, `bindings`, `module-access:pedagogico`.
- **Escola de trabalho:** a prefeitura (tenant) tem várias escolas. Toda rota exige a escola no cabeçalho
  `X-Escola-ID` (middleware `escola:{modulo}`, entre `tenant` e `bindings`); com uma única escola no tenant o
  cabeçalho é opcional. Escola fora do acesso do usuário → 403; escola inativa aceita só consulta (escrita → 422).
  Todo registro pertence a uma escola (`escola_id`); registro de outra escola → 404 / erro de validação.
- **Permissões:** `pedagogico.view`, `pedagogico.notas.manage`, `pedagogico.ocorrencias.manage`,
  `pedagogico.conselho.manage` (pré-conselho, cronograma, atas), `pedagogico.frequencia.manage`, `pedagogico.professor`.
- **Perfis:** Direção (`pedagogico_direcao`, todas exceto professor), Pedagogia (`pedagogico_pedagogia`: view,
  ocorrências, conselho, frequência) e Professor (`pedagogico_professor`: view + professor).
- **Escopo do professor:** quem tem só `pedagogico.professor` (nenhuma permissão `*.manage`) vê e opera apenas as
  turmas × matérias em que é o professor vinculado (`PUT /api/escola/turmas/{turma}/materias`). Fora disso: 403.
- **Erros:** validação 422 `{"message","errors"}`; regra de negócio 422 `{"error"}`; registro de outro tenant 404.
- **Auditoria/outbox:** toda escrita grava `audit_logs` e publica `pedagogico.<recurso>.<acao>`
  (ex.: `pedagogico.nota.lancada`, `pedagogico.pre_conselho.salvo`, `pedagogico.ata.finalizada`).

## Turmas (com escopo do professor)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/minhas-turmas` | view | Vínculos turma × matéria em que o usuário é professor |
| GET | `/api/pedagogico/turmas` | view | Turmas visíveis (todas para a gestão; só as vinculadas para o professor) |
| GET | `/api/pedagogico/turmas/{turma}/alunos` | view + turma visível | Alunos da turma |

## Notas

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/notas` | turma visível | `?turma_id&materia_id&ano_letivo[&trimestre]` |
| PUT | `/api/pedagogico/notas` | notas.manage ou professor vinculado | `{turma_id, materia_id, ano_letivo, trimestre (1–3), notas: [{aluno_id, nota, nota_recuperacao?}]}` — 0 a 10 com uma casa; relançar substitui |
| POST | `/api/pedagogico/notas/importar` | notas.manage | multipart `arquivo` + `ano_letivo`; CSV `TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA` (vírgula ou ponto na nota; linha com NOTA em branco é ignorada; a matéria precisa estar vinculada à turma). Resposta `{importadas, rejeitadas: [{linha, motivo}]}` |
| GET | `/api/pedagogico/notas/medias` | pedagogico.view (professor: só as próprias turmas) | `?ano_letivo` obrigatório. Resposta `[{aluno_id, media}]`: média de todas as matérias e trimestres, cada nota valendo o maior entre `nota` e `nota_recuperacao`, truncada em uma casa. Usada no painel |
| GET | `/api/pedagogico/alunos/{aluno}/notas` | turma visível | Boletim do aluno no `?ano_letivo` (padrão: ano atual) |

## Ocorrências

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/ocorrencias` | view | `?aluno_id&categoria_id&turma_id&per_page`; paginado; professor vê só as das suas turmas |
| GET | `/api/pedagogico/ocorrencias/totais` | view | Total por aluno (`?turma_id`) |
| POST | `/api/pedagogico/ocorrencias` | ocorrencias.manage | `{aluno_id, categoria_id, data (≤ hoje), descricao, severidade: baixa\|media\|alta\|critica, anexo?}` — anexo PDF/PNG/JPEG/WEBP pelo conteúdo real, até 5 MB |
| GET | `/api/pedagogico/ocorrencias/{ocorrencia}` | view | Detalhe (categoria excluída continua aparecendo) |
| PUT | `/api/pedagogico/ocorrencias/{ocorrencia}` | ocorrencias.manage | Mesmos campos (parciais) |
| DELETE | `/api/pedagogico/ocorrencias/{ocorrencia}` | ocorrencias.manage | Exclusão lógica |
| GET | `/api/pedagogico/ocorrencias/{ocorrencia}/anexo` | view | Download do anexo (disco privado) |

## Pré-conselho

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/pre-conselhos` | view | `?turma_id&materia_id&ano_letivo&periodo`; professor vê só as suas |
| GET | `/api/pedagogico/pre-conselhos/progresso` | view | `?ano_letivo&periodo` → `[{turma_id, entregues, total}]` (matérias vinculadas com ficha / vinculadas) |
| PUT | `/api/pedagogico/pre-conselhos` | conselho.manage ou professor vinculado | Cria ou atualiza a ficha da turma × matéria × período × ano. Campos: `data_registro`, `desempenho_geral` (excelente\|bom\|regular\|insatisfatorio), `objetivos_atingidos`, `metodologias[]`, `instrumentos_avaliativos[]`, `instrumentos_adequados`, `engajamento_nivel`, `socioemocional_status`, textos livres e `alunos: [{aluno_id, nivel_atencao: baixo\|medio\|alto, dificuldade?, encaminhamentos?, destaque?}]` (identificados pelo id) |
| GET | `/api/pedagogico/pre-conselhos/{preConselho}` | view | Ficha com os alunos avaliados |
| DELETE | `/api/pedagogico/pre-conselhos/{preConselho}` | conselho.manage ou professor vinculado | Exclusão lógica |

## Cronograma do pré-conselho (informativo, não bloqueia as fichas)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/cronogramas` | view | Com `situacao`: agendado \| ativo \| encerrado \| arquivo |
| GET | `/api/pedagogico/cronogramas/vigente` | view | Ativo hoje; senão o mais próximo no ano corrente; senão o mais próximo em qualquer ano |
| POST | `/api/pedagogico/cronogramas` | conselho.manage | `{ano_letivo, periodo, data_inicio, data_fim}` — datas dentro do ano letivo |
| PUT | `/api/pedagogico/cronogramas/{cronograma}` | conselho.manage | Mesmos campos |
| DELETE | `/api/pedagogico/cronogramas/{cronograma}` | conselho.manage | Exclusão lógica |

## Atas do conselho de classe

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/atas` | view | `?turma_id&ano_letivo&status` |
| POST | `/api/pedagogico/atas` | conselho.manage | `{turma_id, ano_letivo, periodo, data_reuniao, direcao?, pedagogia?, secretaria?, deliberacoes?, aprovados?, recuperacao?, retidos?}` — nasce `rascunho` |
| GET | `/api/pedagogico/atas/{ata}` | view | Detalhe |
| PUT | `/api/pedagogico/atas/{ata}` | conselho.manage | Só em `rascunho` (finalizada/arquivada → 422) |
| POST | `/api/pedagogico/atas/{ata}/finalizar` | conselho.manage | rascunho → finalizada |
| POST | `/api/pedagogico/atas/{ata}/arquivar` | conselho.manage | rascunho/finalizada → arquivada |
| DELETE | `/api/pedagogico/atas/{ata}` | conselho.manage | Só rascunho; exclusão lógica |

## Frequência diária

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/pedagogico/frequencias` | turma visível | `?turma_id&data` ou `?turma_id&data_inicio&data_fim` (período de até um ano), ordenado por data |
| GET | `/api/pedagogico/frequencias/totais` | pedagogico.view (professor: só as próprias turmas) | `?data_inicio&data_fim[&turma_id]`. Resposta `[{aluno_id, faltas, justificadas}]`: `faltas` soma as `aulas` dos dias com falta; `justificadas` conta os dias com falta justificada (não entram em `faltas`) |
| PUT | `/api/pedagogico/frequencias` | frequencia.manage ou professor da turma | `{turma_id, data (≤ hoje), aulas? (1–10, padrão 1: quantas aulas o dia representa), registros: [{aluno_id, presenca: presente\|falta\|falta_justificada, observacao?}]}` — substitui o registro da mesma data |
