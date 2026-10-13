# Módulo Passeio (`api/passeio`)

Passeios pedagógicos dos alunos do cadastro escolar (`requires: ["Admin", "Escola"]`).
Spec: `openspec/changes/modulos-educacao-backend/specs/passeio/spec.md`.

- **Middlewares:** `auth:sanctum`, `tenant`, `escola:passeio`, `bindings`, `module-access:passeio`.
- **Escola de trabalho:** a prefeitura (tenant) tem várias escolas. Toda rota exige a escola no cabeçalho
  `X-Escola-ID` (middleware `escola:{modulo}`, entre `tenant` e `bindings`); com uma única escola no tenant o
  cabeçalho é opcional. Escola fora do acesso do usuário → 403; escola inativa aceita só consulta (escrita → 422).
  Todo registro pertence a uma escola (`escola_id`); registro de outra escola → 404 / erro de validação.
- **Permissões:** `passeio.view`, `passeio.passeios.manage` (passeios, inscrições, autorizações), `passeio.frota.manage` (veículos, assentos).
- **Perfis:** Coordenação de Passeios (`passeio_coordenacao`, todas) e Apoio (`passeio_apoio`, view).
- **Dinheiro:** `valor_centavos` (inteiro). Indicadores em centavos.
- **Regras:** passeio `concluido`/`cancelado` não aceita inscrição; uma inscrição por aluno e passeio (reinscrever
  restaura); assento só para inscrito com "vai" marcado; um aluno por assento e um assento por aluno no passeio;
  capacidade não pode ficar abaixo da ocupação; quem deixa de ir (ou é desinscrito) perde o assento. Aluno
  **transferido** não se inscreve nem volta a "ir" (422) e fica de fora da inscrição da turma; o **remanejado** entra
  pela turma de destino.
- **Auditoria/outbox:** `passeio.passeio.*`, `passeio.inscricao.*` (inclusive `lote_marcado`/`lote_desmarcado`), `passeio.veiculo.*`, `passeio.assento.ocupado|liberado`.

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/passeio/indicadores` | view | Indicadores de todos os passeios |
| GET | `/api/passeio/passeios` | view | `?status`; com `inscricoes_count` e `veiculos_count` |
| POST | `/api/passeio/passeios` | passeios.manage | `{nome, data_passeio, data_limite_autorizacao? (≤ data do passeio), horario_saida (HH:MM), horario_retorno?, local_saida, destino, cidade, valor_centavos?, responsavel, observacoes?, status?}` |
| GET | `/api/passeio/passeios/{passeio}` | view | Detalhe |
| PUT | `/api/passeio/passeios/{passeio}` | passeios.manage | Mesmos campos (parciais); `status`: agendado \| em_andamento \| concluido \| cancelado |
| DELETE | `/api/passeio/passeios/{passeio}` | passeios.manage | Exclusão lógica |
| GET | `/api/passeio/passeios/{passeio}/indicadores` | view | inscritos, que vão, autorizações (qtd e %), arrecadado/pendente (centavos), veículos, capacidade, ocupados |
| GET | `/api/passeio/passeios/{passeio}/inscricoes` | view | Inscrições com aluno (`situacao` e `telefone` principal do Escola, só leitura) e turma |
| POST | `/api/passeio/passeios/{passeio}/inscricoes` | passeios.manage | `{aluno_id}` ou `{turma_id}` (turma inteira → `{criadas, ja_inscritos}`) |
| PUT | `/api/passeio/passeios/{passeio}/inscricoes/lote` | passeios.manage | `{turma_id, vai}`: marcar inscreve quem falta (sem transferidos) e marca os demais; desmarcar tira o "vai" da turma e libera os assentos → `{afetadas, criadas}` |
| PUT | `/api/passeio/inscricoes/{inscricao}` | passeios.manage | `{vai?, autorizacao_entregue?, pago?, observacao?}` |
| DELETE | `/api/passeio/inscricoes/{inscricao}` | passeios.manage | Exclusão lógica (libera o assento) |
| GET | `/api/passeio/passeios/{passeio}/veiculos` | view | Veículos com `assentos_count` |
| POST | `/api/passeio/passeios/{passeio}/veiculos` | frota.manage | `{identificacao, placa?, motorista?, telefone?, capacidade (1–100), cor?}` — placa e motorista opcionais |
| PUT | `/api/passeio/veiculos/{veiculo}` | frota.manage | Mesmos campos; reduzir capacidade abaixo da ocupação → 422 |
| DELETE | `/api/passeio/veiculos/{veiculo}` | frota.manage | Exclusão lógica (libera os assentos) |
| GET | `/api/passeio/veiculos/{veiculo}/assentos` | view | `{capacidade, ocupados: [{numero, aluno_id, aluno, turma}]}` |
| PUT | `/api/passeio/veiculos/{veiculo}/assentos/{numero}` | frota.manage | `{aluno_id}` — ocupado ou aluno já sentado → 422 |
| DELETE | `/api/passeio/veiculos/{veiculo}/assentos/{numero}` | frota.manage | Libera o assento |

## Telas (`apps/web-client/src/modules/passeio`)

Escritas com `@sysgov/ui`, como a Formatura (change `modulos-educacao-frontend`, D18–D20). O passeio de trabalho e a
aba ficam na URL (`/passeio?aba=onibus&passeio=12`).

- **Painel:** indicadores do passeio (que vão, termos, arrecadado, assentos) e andamento.
- **Passeios:** lista com busca; criar/editar em modal (valor em reais na tela, centavos na API); excluir com confirmação.
- **Inscrições e Termos:** chaves Vai, Termo e Pago por aluno, observação, filtros, inscrição de aluno ou turma e
  exportação CSV. Transferido aparece marcado e não volta a "ir". Com uma turma no filtro, a lista traz a turma
  inteira (sem transferidos) e ligar "Vai" num aluno ainda não inscrito o inscreve. Termo e Pago ficam bloqueados
  para quem não vai — a API recusa marcá-los (422), mas deixa desmarcar.
- **Turmas:** consulta às turmas do ano letivo do passeio (Cadastro Escolar), com marcar/desmarcar a turma inteira
  (`PUT .../inscricoes/lote`) e atalho "Abrir Cadastro Escolar". Turmas e alunos não são editados aqui.
- **Ônibus e Assentos:** veículos em modal (capacidades comuns 40/44/46/50/52), mapa 2 + corredor + 2 clicável
  (livre → escolher aluno sem assento; ocupado → liberar) e distribuição automática nos lugares livres mantendo as
  turmas juntas. Cada ônibus tem "Imprimir lista", que abre Relatórios na lista de embarque daquele ônibus
  (`?aba=relatorios&relatorio=manifesto&onibus={id}`).
- **Relatórios:** termo de autorização (2 por folha, com linha de corte), lista de embarque por ônibus (e quem vai
  sem assento) e demonstrativo de arrecadação por turma — só com dados da API; na impressão sai só o documento.
- Perfil Apoio (`passeio.view`): vê tudo sem os botões e chaves de escrita (a regra é do servidor).
