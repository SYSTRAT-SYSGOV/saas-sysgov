# Módulo Portfólio Digital (`api/portfolio`)

Portfólio dos alunos do cadastro escolar — trabalhos avaliados com evidências em imagem, linha do tempo,
desempenho por matéria e trimestre e relatório PDF (`requires: ["Admin", "Escola"]`).
Spec: `openspec/changes/criar-modulo-portfolio/specs/portfolio/spec.md`. Tela: `apps/web-client/src/modules/portfolio`.

- **Middlewares:** `auth:sanctum`, `tenant`, `escola:portfolio`, `bindings`, `module-access:portfolio`.
- **Escola de trabalho:** como nos demais módulos de educação (cabeçalho `X-Escola-ID`; opcional com uma única
  escola). Registro de outro tenant ou de outra escola → 404.
- **Alunos, turmas e matérias:** sempre do cadastro escolar — o módulo não cadastra alunos nem disciplinas.

## Permissões e perfis

| Permissão | Uso |
|---|---|
| `portfolio.view` | Acessar o módulo. Sozinha: consulta a escola toda, sem gravar. |
| `portfolio.professor` | Registrar, alterar e excluir trabalhos só nas turmas × matérias em que é o professor vinculado (`escola_turma_materias.professor_user_id`); vê só os alunos dessas turmas e os trabalhos dessas matérias. |
| `portfolio.manage` | Gestão: tudo, em todas as turmas da escola. |

Perfis-modelo (seeder `PortfolioRbacSeeder`, clonados pelo `ModuleRoleProvisioner`): **Professor (Portfólio)**
(`portfolio_professor`: view + professor) e **Gestão do Portfólio** (`portfolio_gestor`: view + manage). Ambos
incluem `escola.view`. O usuário também precisa do acesso ao módulo concedido no cadastro de usuários.

Fora do escopo → **404**; visível mas sem permissão de escrita → **403**.

## Regras

- **Avaliação** de 0 a 10 com no máximo uma casa decimal (7,25 é recusado). Guardada em décimos inteiros
  (`avaliacao_decimos`: 8,5 → 85); a API recebe e devolve número (`8.5`). Médias calculadas em décimos, meio para
  cima, devolvidas com uma casa.
- **Independente das notas trimestrais** do Pedagógico — não altera o boletim.
- **Turma congelada:** o trabalho guarda a turma do aluno no momento do registro; remanejamento não reescreve o
  histórico. A matéria precisa estar vinculada a essa turma.
- **Período:** `ano_letivo` = ano da turma; a data precisa estar nesse ano. `trimestre` é deduzido pela data a partir
  dos trimestres cadastrados da escola (vazio se a data não cai em nenhum) e recalculado quando a data muda.
- **Aluno transferido** não recebe trabalho novo (422); aluno sem turma também não (422). Os trabalhos antigos continuam visíveis.
- **Auditoria/outbox:** `portfolio.trabalho.criado|atualizado|excluido`, `portfolio.imagem.adicionada|removida`,
  `portfolio.relatorio.gerado`.

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/portfolio/turmas?ano=` | Turmas visíveis do ano → `{turmas: [{id, nome, ano_letivo, alunos}]}` |
| GET | `/api/portfolio/turmas/{turma}/alunos?ano=&trimestre=` | `{alunos: [{id, nome, numero, situacao, total_trabalhos, media}]}` no período |
| GET | `/api/portfolio/turmas/{turma}/materias` | Matérias em que o usuário pode lançar na turma |
| GET | `/api/portfolio/alunos/{aluno}/trabalhos?ano=&trimestre=` | Linha do tempo `{data: [...]}` (data desc, registro desc) |
| GET | `/api/portfolio/alunos/{aluno}/desempenho?ano=&trimestre=` | `{total, media, por_materia[], por_trimestre[] \| null}` (por trimestre só no ano todo) |
| GET | `/api/portfolio/alunos/{aluno}/relatorio?ano=&trimestre=` | PDF do portfólio (`Portfolio_{aluno}_{ano}[_T{n}].pdf`) |
| POST | `/api/portfolio/alunos/{aluno}/trabalhos` | `{titulo (≤160), materia_id, data (Y-m-d), avaliacao, descricao?, observacoes?}` → 201 `{data}` |
| PUT | `/api/portfolio/trabalhos/{trabalho}` | Mesmos campos, parciais |
| DELETE | `/api/portfolio/trabalhos/{trabalho}` | Exclusão lógica; as imagens são apagadas de imediato |
| POST | `/api/portfolio/trabalhos/{trabalho}/imagens` | Multipart, campo `imagem` (uma por requisição) |
| GET | `/api/portfolio/trabalhos/{trabalho}/imagens/{imagem}` | Arquivo (JPEG), só para quem vê o trabalho |
| DELETE | `/api/portfolio/trabalhos/{trabalho}/imagens/{imagem}` | Remove a imagem e o arquivo |

## Imagens

- Até **6** por trabalho. A tela aceita JPG, PNG ou WebP de até 5 MB e envia um JPEG de no máximo 1600 px
  (`reduzirImagem.ts`, com a orientação da câmera aplicada pelo navegador).
- O servidor aceita JPG/PNG até 5 MB, reduz de novo (GD) e guarda sempre JPEG em
  `storage/app/portfolio/{tenant}/trabalhos/{trabalho}/{uuid}.jpg` (disco `local`, privado).
- O container da API carrega `docker/php/uploads.ini` (limite de upload de 25 MB) — vale após reconstruir a imagem.

## Relatório PDF

Blade `portfolio::relatorio` + dompdf (A4). Cabeçalho com escola, aluno, turma e período; resumo por matéria;
cada trabalho com dados e miniaturas JPEG de até 480 px. Acima de 60 imagens no período, entram as 2 primeiras de
cada trabalho e o PDF informa quantas ficaram de fora. Respeita o mesmo escopo da linha do tempo.

## Testes

```bash
docker exec -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: -e APP_ENV=testing -e CACHE_STORE=array \
  -e SESSION_DRIVER=array -e QUEUE_CONNECTION=sync sysgov-api php vendor/bin/phpunit Modules/Portfolio
cd apps/web-client && npx vitest run src/modules/portfolio
```
