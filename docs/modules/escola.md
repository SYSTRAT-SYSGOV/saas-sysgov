# Módulo Escola (`api/escola`)

Cadastro escolar único do tenant — base dos módulos Pedagógico, Formatura e Passeio.
Spec: `openspec/changes/modulos-educacao-backend/specs/escola/spec.md`.

- **Middlewares:** `auth:sanctum`, `tenant` (header `X-Tenant-ID` ou `X-Tenant-Slug`), `escola:escola` (header `X-Escola-ID`), `bindings`, `module-access:escola`.
- **Cadastro de Pessoas:** aluno com CPF (opcional) é ligado à pessoa do município (vínculo `aluno`); dados civis vêm da pessoa e se atualizam pelo evento `PessoaAtualizada`. Equipe gestora pode apontar para uma pessoa.
- **Permissões:** `escola.view` (leitura), `escola.alunos.manage` (alunos), `escola.estrutura.manage` (demais cadastros).
- **Perfis provisionados:** Direção Escolar (`escola_direcao`, todas) e Secretaria / Pedagogia (`escola_secretaria`, `view` + `alunos.manage`).
- **Erros:** validação → 422 `{"message", "errors"}`; regra de negócio → 422 `{"error"}`; registro de outro tenant → 404.
- **Auditoria/outbox:** toda escrita grava `audit_logs` (`escola.<recurso>.<acao>`) e publica o evento `escola.<recurso>.<acao>`.
- **Arquivos:** logo e fotos em disco privado, servidos só pelas rotas `GET` abaixo.

## Escolas do órgão e escola de trabalho

A prefeitura (tenant) tem várias escolas, cada uma ligada a uma unidade do organograma. O acesso a uma escola segue
o escopo de unidades do usuário no módulo (Usuários & Acessos), com descendentes: acesso à "Secretaria de
Educação" dá todas as escolas abaixo dela. Admin geral acessa todas. Escola migrada da antiga unidade fica sem
unidade (acessível a todos com acesso ao módulo) até o administrador ligá-la.

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/escolas/minhas?modulo=` | acesso ao módulo | Escolas que o usuário acessa em `escola`, `pedagogico`, `formatura` ou `passeio` (seletor do painel) |
| GET | `/api/escola/escolas` | escolas | Todas as escolas do órgão, com a unidade |
| POST | `/api/escola/escolas` | escolas | `{nome, inep?, org_unit_id}` — INEP e unidade únicos no órgão |
| PUT | `/api/escola/escolas/{escola}` | escolas | `{nome?, inep?, org_unit_id?, ativa?}` |
| POST | `/api/escola/escolas/{escola}/logo` | escolas | multipart `logo` |
| GET | `/api/escola/escolas/unidades-organograma` | escolas | Unidades do organograma (lista plana) |

"escolas" = `escola.escolas.manage` (sem perfil padrão: o admin geral do tenant). Estas rotas não exigem
`X-Escola-ID`; todas as demais do módulo exigem (ver middlewares).

## Unidade (= escola de trabalho)

Nome e logo da escola de trabalho, usados nos relatórios e atas dessa escola.

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/unidade` | view | Nome da unidade e `tem_logo` (criada com o nome do tenant na 1ª consulta) |
| PUT | `/api/escola/unidade` | estrutura | `{nome}` |
| POST | `/api/escola/unidade/logo` | estrutura | multipart `logo` (PNG/JPEG/WEBP pelo conteúdo real, até 2 MB) |
| GET | `/api/escola/unidade/logo` | view | Arquivo do logo |

## Turnos

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/turnos` | view | Lista com `turmas_count`; cria Manhã/Tarde/Noite se o tenant nunca teve turnos |
| POST | `/api/escola/turnos` | estrutura | `{nome, ordem?}` |
| PUT | `/api/escola/turnos/{turno}` | estrutura | `{nome?, ordem?}` |
| DELETE | `/api/escola/turnos/{turno}` | estrutura | Recusa (422) se houver turmas |

## Turmas e professores

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/professores` | view | Usuários ativos do tenant (para vincular a turma × matéria), com o nome da pessoa ligada ao usuário (`pessoa_id`) |
| GET | `/api/escola/turmas` | view | `?turno_id`, `?ano_letivo`; com turno, `pedagoga {id, nome}`, `total_alunos` e matérias/professores |
| POST | `/api/escola/turmas` | estrutura | `{nome, turno_id, ano_letivo, pedagoga_id?}` — nome único por turno e ano; `pedagoga_id` é da equipe com cargo pedagoga (sai da turma se for excluída ou mudar de cargo) |
| GET | `/api/escola/turmas/{turma}` | view | Detalhe |
| PUT | `/api/escola/turmas/{turma}` | estrutura | `{nome?, turno_id?, ano_letivo?, pedagoga_id?}` (`null` remove a pedagoga) |
| DELETE | `/api/escola/turmas/{turma}` | estrutura | Exclusão lógica; alunos ficam sem turma |
| POST | `/api/escola/turmas/{turma}/duplicar` | estrutura | Cria "<nome> (Cópia)" com a mesma pedagoga e matérias/professores, sem alunos |
| PUT | `/api/escola/turmas/{turma}/materias` | estrutura | `{vinculos: [{materia_id, professor_user_id?}]}` — substitui os vínculos |
| POST | `/api/escola/turmas/{turma}/limpar` | alunos | `{confirmacao: "EXCLUIR"}` — exclui (logicamente) todos os alunos da turma |

## Alunos

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/alunos` | view | `?busca` (nome, mãe, pai, turma ou CPF completo), `?turma_id`, `?situacao`, `?per_page` (≤100); paginado |
| POST | `/api/escola/alunos` | alunos | `{nome, cpf?, cgm?, numero?, turma_id?, nascimento?, mae?, pai?, situacao?, contatos?: [{telefone, descricao?}]}` |
| POST | `/api/escola/alunos/importar` | alunos | multipart `arquivo` CSV — ver abaixo |
| POST | `/api/escola/alunos/excluir` | alunos | `{ids: [..]}` — todos precisam ser do tenant |
| GET | `/api/escola/alunos/{aluno}` | view | Detalhe com turma, turma de origem e contatos |
| PUT | `/api/escola/alunos/{aluno}` | alunos | Mesmos campos; `situacao: "remanejado"` exige `turma_id` diferente da atual e atribui o próximo número |
| DELETE | `/api/escola/alunos/{aluno}` | alunos | Exclusão lógica |
| POST | `/api/escola/alunos/{aluno}/foto` | alunos | multipart `foto` (PNG/JPEG/WEBP, até 2 MB) |
| GET | `/api/escola/alunos/{aluno}/foto` | view | Arquivo da foto |

**CSV de alunos:** separador `;` ou `,`, UTF-8 com ou sem BOM, até 2 MB / 5.000 linhas. Cabeçalhos `NOME` e
`TURMA` obrigatórios; `CPF`, `CGM`, `NUMERO`, `MAE`, `PAI`, `NASCIMENTO` (dd/mm/aaaa ou aaaa-mm-dd) e `CONTATO`
opcionais, em qualquer ordem. Mesmo CPF, mesmo CGM ou mesmo nome na mesma turma atualiza em vez de duplicar; CPF
inválido rejeita a linha. Resposta: `{criados, atualizados, rejeitadas: [{linha, motivo}]}`.

**CPF e Cadastro de Pessoas:** CPF opcional, único por escola, guardado cifrado e devolvido só como
`cpf_mascarado`. Com CPF, o aluno é ligado à pessoa do município (`pessoa_id`, criada se não existir) e a pessoa
recebe o vínculo `aluno` (`dados`: escola, aluno, turma; `matricula` = CGM). A pessoa é a fonte de nome,
nascimento, mãe e pai: editar esses campos num aluno ligado grava na pessoa, e correções feitas no Cadastro de
Pessoas atualizam os alunos de todas as escolas. Transferência ou exclusão encerram o vínculo da escola.
`php artisan escola:ressincronizar-pessoas` recopia os dados das pessoas para os alunos.

## Matérias

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/materias` | view | Com as turmas vinculadas a cada matéria |
| POST | `/api/escola/materias` | estrutura | `{nome}` — único sem diferenciar maiúsculas/acentos |
| GET | `/api/escola/materias/exportar` | view | CSV `ID;Nome` (UTF-8 com BOM) |
| POST | `/api/escola/materias/importar` | estrutura | multipart `arquivo` — coluna `Nome` ou nomes na 1ª coluna; já existentes são ignoradas. Resposta `{importadas, ignoradas}` |
| PUT | `/api/escola/materias/{materia}` | estrutura | `{nome}` |
| DELETE | `/api/escola/materias/{materia}` | estrutura | Exclusão lógica; remove os vínculos com as turmas |

## Trimestres

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/trimestres` | view | Ano desc, número asc; `situacao`: `agendado`, `em_andamento`, `encerrado`, `arquivo` |
| POST | `/api/escola/trimestres` | estrutura | `{ano_letivo (2020–2100), numero (1–3), data_inicio, data_fim}` — ano + número únicos |
| PUT | `/api/escola/trimestres/{trimestre}` | estrutura | Mesmos campos |
| DELETE | `/api/escola/trimestres/{trimestre}` | estrutura | Exclusão lógica |

## Categorias de ocorrência

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/escola/categorias` | view | Cria as 8 categorias padrão se o tenant nunca teve categorias |
| POST | `/api/escola/categorias` | estrutura | `{nome, cor: "#rrggbb"}` |
| PUT | `/api/escola/categorias/{categoria}` | estrutura | `{nome?, cor?}` |
| DELETE | `/api/escola/categorias/{categoria}` | estrutura | Exclusão lógica; ocorrências já registradas preservam a categoria |
| GET | `/api/escola/equipe` | view | Equipe gestora (D17): `[{id, nome, cargo: diretor\|diretor_auxiliar\|secretaria\|pedagoga, ordem, pessoa_id}]`, diretor primeiro |
| POST | `/api/escola/equipe` | estrutura | `{pessoa_id?, nome?, cargo, ordem?}` — com `pessoa_id` o nome é o da pessoa; um segundo `diretor` → 422 |
| GET | `/api/escola/pessoas?busca=` | estrutura | Busca no Cadastro de Pessoas (nome com 3+ letras ou CPF): `[{id, nome, cpf_mascarado}]` |
| PUT | `/api/escola/equipe/{membro}` | estrutura | `{nome?, cargo?, ordem?}` |
| DELETE | `/api/escola/equipe/{membro}` | estrutura | Exclusão lógica |
