# Design

## Context

- Motivação e escopo: ver `proposal.md`. Requisitos: `specs/portfolio/spec.md`.
- Origem funcional: `Portfolio Digital/` (fora do monorepo) — protótipo React com `localStorage`, alunos digitados
  à mão, lista fixa de disciplinas, imagem única em base64 e relatório HTML baixado no navegador.
- O módulo `Escola` já oferece, por tenant e por escola (`EscolaAware` + `EscolaContext`): `Aluno` (com
  `turma_id` atual, `situacao` em `SituacaoAluno`, `foto_path`, `pessoa_id`), `Turma` (`ano_letivo`), `Materia`,
  `TurmaMateria` (`professor_user_id`) e `Trimestre` (`ano_letivo`, `numero`, `data_inicio`, `data_fim`).
- O middleware `escola:<modulo>` (`ResolveEscola`) define a escola de trabalho pelo cabeçalho `X-Escola-ID` e
  confere o escopo do usuário no módulo da rota. Escola inativa só aceita leitura.
- O Pedagógico tem `EscopoProfessor` (turmas × matérias do professor), atrelado às permissões `pedagogico.*`.
- Referências de implementação: `Passeio`/`Formatura` (módulos de educação sobre o Escola, RBAC, web-client com
  `api.ts` próprio e `@sysgov/ui`) e `Cursos` (PDF com Blade + `barryvdh/laravel-dompdf`, arquivos servidos com
  autenticação). A extensão `gd` está disponível no container.

## Goals / Non-Goals

**Goals:**
- Módulo completo (backend + tela) no padrão do Coding Standard: tenant + escola em toda consulta, policies por
  registro, auditoria de toda mutação, teste de isolamento.
- Cálculos de desempenho no servidor, para a tela e o PDF mostrarem os mesmos números.
- PDF com imagens sem estourar a memória do PHP.

**Non-Goals:**
- Migrar dados do protótipo (`localStorage`) — não há dados reais a preservar.
- Portal de responsáveis, BNCC, integrações externas, relatório consolidado por turma, CSV.
- Edição de imagem (recorte, rotação) ou captura pela câmera além do seletor de arquivo do navegador.

## Decisions

### D1 — Módulo próprio gerado pelo `make:module`
`apps/api/Modules/Portfolio` criado com `php artisan make:module Portfolio`, `requires: ["Admin", "Escola"]`,
menu em **GESTÃO SETORIAL** com ícone `FolderOpen`. Os artefatos de exemplo do scaffold são substituídos pelas
entidades reais. *Alternativa:* aba no Pedagógico — rejeitada pelo usuário (o módulo precisa ser liberado à parte).

### D2 — Modelo de dados

| Tabela | Colunas principais |
|---|---|
| `portfolio_trabalhos` | `tenant_id`, `escola_id`, `aluno_id` → `escola_alunos`, `turma_id` → `escola_turmas`, `materia_id` → `escola_materias`, `ano_letivo` (smallint), `trimestre` (tinyint, nulo), `titulo` (160), `descricao` (text, nulo), `observacoes` (text, nulo), `data` (date), `avaliacao_decimos` (tinyint 0–100), `registrado_por` → `users`, timestamps, softDeletes |
| `portfolio_imagens` | `tenant_id`, `trabalho_id` → `portfolio_trabalhos` (cascade), `path`, `nome_original`, `mime`, `tamanho` (bytes), `ordem` (tinyint), timestamps |

Índices: `(tenant_id, escola_id, aluno_id, ano_letivo, data)` e `(tenant_id, escola_id, turma_id, materia_id)`.
Models com `TenantAware`; `Trabalho` também com `EscolaAware`. `Imagem` é acessada sempre via trabalho.

**Avaliação em décimos (inteiro).** 8,5 → `85`. A API recebe e devolve número com uma casa (`8.5`); a validação
aceita só múltiplos de 0,1 entre 0 e 10. *Por quê:* o padrão proíbe `float` para valores com regra; décimos
inteiros tornam médias e comparações exatas. Médias são calculadas em décimos e arredondadas (half-up) para uma casa.

**Turma e matéria congeladas no registro.** `turma_id` é a turma atual do aluno no momento do registro e não muda
depois (remanejamento não reescreve histórico). Na edição, a matéria pode mudar, mas sempre validada contra a
turma gravada no trabalho.

**Trimestre deduzido.** `ano_letivo` = ano letivo da turma; `trimestre` = número do `Trimestre` da escola/ano cujo
intervalo contém a `data`; nulo se nenhum contém. Recalculado quando a data muda. A data precisa cair no ano civil
do `ano_letivo` da turma.

### D3 — Escopo do professor próprio do módulo
`Modules\Portfolio\Services\EscopoPortfolio`, no mesmo molde do `EscopoProfessor` do Pedagógico, mas com as
permissões do Portfólio: restrito = tem `portfolio.professor` e não tem `portfolio.manage`. Fornece
`turmasVisiveis()`, `materiasLancaveis(turma)`, `podeVerAluno()`, `podeLancar(turma, materia)` e um
`restringir(query)` que limita os trabalhos às turmas × matérias do professor. *Alternativa:* reutilizar o
`EscopoProfessor` — rejeitada, porque acoplaria o Portfólio ao Pedagógico e às permissões dele; extrair um escopo
genérico para o Escola fica para quando houver um terceiro consumidor.

Consequência: o professor restrito vê apenas os trabalhos das matérias que leciona na turma (inclusive na linha
do tempo e no PDF); o gestor vê todos.

### D4 — Armazenamento das imagens
**Redução no navegador.** A GD do container não lê WebP, não há a extensão EXIF e o PHP da API aceita só 2 MB por
arquivo. Por isso a tela converte cada foto escolhida (JPG/PNG/WebP, até 5 MB) num JPEG de no máximo 1600 px com
`createImageBitmap(arquivo, { imageOrientation: 'from-image' })` + `<canvas>` (qualidade 0,85) e envia **uma imagem
por requisição** (`POST trabalhos/{trabalho}/imagens`, campo `imagem`). O servidor aceita `mimes:jpg,jpeg,png` até
5 MB, reduz de novo por segurança (GD, mesmo molde do `ModeloCertificadoService::fundoEmJpeg`) e guarda sempre JPEG.
O `docker/api/Dockerfile` passa a copiar o `docker/php/uploads.ini` já existente (25 MB), como folga.

**Disco.** `local` (privado), caminho `portfolio/{tenant_id}/trabalhos/{trabalho_id}/{uuid}.jpg`. Servida por rota
autenticada que passa pela policy do trabalho (`Storage::response`), nunca por URL pública. Exclusão de imagem ou
trabalho apaga o arquivo após o commit (`DB::afterCommit`). O soft delete do trabalho remove as imagens de imediato
(evidência excluída não é recuperável; a auditoria registra a exclusão). *Alternativa:* base64 no banco, como no
protótipo — rejeitada (tamanho de linha, backup e memória).

### D5 — PDF com miniaturas
Blade `portfolio::relatorio` + dompdf, A4 retrato. As imagens entram como data-URI de uma **miniatura de até 480 px**
gerada em memória a partir do arquivo já reduzido, para limitar a memória do dompdf. Limite de segurança: se o
período tiver mais de 60 imagens, o PDF traz as 2 primeiras de cada trabalho e indica quantas foram omitidas.
Nome do arquivo: `Portfolio_{nome-do-aluno}_{ano}[_T{n}].pdf`. Como as imagens já estão em JPEG, o dompdf as embute sem decodificar. Gerado na requisição (síncrono); a fila só seria
necessária para relatórios por turma, fora do escopo.

### D6 — Permissões e perfis
`module.json` declara `portfolio.view`, `portfolio.professor`, `portfolio.manage`. `PortfolioRbacSeeder` cria no
tenant SYSTRAT os perfis-modelo `portfolio_professor` e `portfolio_gestor` (ambos com `escola.view`), clonados pelo
`ModuleRoleProvisioner` para os tenants que habilitam o módulo, e é chamado no `docker-entrypoint.sh`.

### D7 — API
Rotas em `Routes/api.php` com `['auth:sanctum', 'tenant', 'escola:portfolio', 'bindings', 'module-access:portfolio']`,
prefixo `api/portfolio`:

| Método e rota | Uso |
|---|---|
| `GET turmas?ano=` | turmas visíveis do ano, com contagem de alunos |
| `GET turmas/{turma}/alunos?ano=&trimestre=` | alunos da turma com total de trabalhos e média no período |
| `GET turmas/{turma}/materias` | matérias em que o usuário pode lançar na turma |
| `GET alunos/{aluno}/trabalhos?ano=&trimestre=` | linha do tempo |
| `GET alunos/{aluno}/desempenho?ano=&trimestre=` | totais, médias por matéria e por trimestre |
| `GET alunos/{aluno}/relatorio?ano=&trimestre=` | PDF |
| `POST alunos/{aluno}/trabalhos` | cria (JSON) |
| `PUT trabalhos/{trabalho}` | altera dados (sem imagens) |
| `POST trabalhos/{trabalho}/imagens` | acrescenta uma imagem (multipart, campo `imagem`) |
| `DELETE trabalhos/{trabalho}` · `DELETE trabalhos/{trabalho}/imagens/{imagem}` | exclusões |
| `GET trabalhos/{trabalho}/imagens/{imagem}` | arquivo da imagem |

Respostas via `JsonResource`; registros fora do escopo → 404 (o binding já aplica tenant e escola; a policy
converte "não visível" em 404 e "visível mas sem permissão de escrita" em 403).

### D8 — Frontend
`apps/web-client/src/modules/portfolio`: `PortfolioModule.tsx` (raiz lazy), `api.ts` (cliente com `apiClient`;
`/portfolio` entra em `ROTAS_COM_ESCOLA` de `core/escola/escolaAtiva.ts` para o cabeçalho `X-Escola-ID` ser
enviado, e a tela usa o mesmo seletor de escola dos demais módulos de educação), `formato.ts` (avaliação `8,5`, datas), `usePortfolio.ts` e
`components/` — `SeletorPeriodo`, `ListaAlunos`, `CabecalhoAluno`, `LinhaDoTempo`, `CardTrabalho`,
`TrabalhoFormModal`, `VisualizadorImagem`, `PainelDesempenho` (cards `KpiCard` + barras, rosca e linha em
`recharts`). Tudo com primitivas do `@sysgov/ui` (`Tabs`, `Modal`, `Select`, `Button`, `Badge`, `KpiCard`…);
números em `font-mono tabular-nums`; cores dos gráficos a partir das variáveis do tema. O download do PDF e as
imagens usam o hook autenticado existente (`useArquivoAutenticado`), pois `<img src>` não envia o token.

## Risks / Trade-offs

- [Memória do dompdf com muitas imagens] → miniaturas de 480 px e limite de 60 imagens por PDF (D5); teste de
  geração com várias imagens.
- [Fotos de celular grandes e com rotação EXIF] → redução e reorientação no navegador, nova redução no servidor (D4).
- [Professor que troca de turma no meio do ano perde a visão dos trabalhos que lançou] → comportamento aceito:
  o escopo segue o vínculo atual do cadastro escolar, igual ao Pedagógico; o gestor continua vendo tudo.
- [Ano letivo diferente do ano civil] → a regra "data no ano civil do ano letivo" pode ser estreita para
  calendários atípicos; fica explícita na validação e pode ser relaxada depois sem mudar o modelo.
- [Escopo próprio duplica lógica do Pedagógico] → aceito para não acoplar módulos; documentado em D3.

## Migration Plan

1. Migrations novas (sem alteração em tabelas existentes); `php artisan migrate` no boot do container.
2. Seeder RBAC no `docker-entrypoint.sh`; habilitar o módulo no tenant pelo painel de módulos.
3. Rollback: desabilitar o módulo no tenant; as tabelas `portfolio_*` podem ser removidas pelo `migrate:rollback`
   do módulo sem afetar o Escola. Os arquivos em `portfolio/` ficam no disco até limpeza manual.
