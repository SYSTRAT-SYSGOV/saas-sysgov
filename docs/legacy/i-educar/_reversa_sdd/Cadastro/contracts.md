# Cadastro (i-Educar legado), Contratos

> Contratos externos observados no legado para a unit de cadastro de aluno. Serve de entrada para o `openapi/` do modelo novo.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Contrato de tela: formulário de cadastro e edição do aluno

| Elemento | Formato | Observação |
|----------|---------|------------|
| Título | "Cadastrar aluno" ou "Editar aluno" | 🟢 `ieducar/modules/Cadastro/Views/AlunoController.php:297-304` |
| Processo | 578 | 🟢 `Cadastro/Views/AlunoController.php:34` |
| Nível de acesso | SOMENTE_ESCOLA | 🟢 `Cadastro/Views/AlunoController.php:32` |
| Cancelar | Rota da listagem `/intranet/educar_aluno_lst.php` | 🟢 `Cadastro/Views/AlunoController.php:318` |
| Pessoa | Query `person` ou código do aluno; documentos da pessoa carregados | 🟢 `Cadastro/Views/AlunoController.php:328-342` |
| Justificativa obrigatória | Campo oculto quando a instituição ativa exigir | 🟢 `Cadastro/Views/AlunoController.php:320-326` |
| Criação e edição | Delegadas à API; `_initNovo` e `_initEditar` devolvem `false` | 🟢 `Cadastro/Views/AlunoController.php:306-314` |

Seções do formulário: cadastro (identidade, alfabetizado, emancipado, família, transporte, INEP, recursos INEP, escolarização em outro espaço, justificativa de falta de documentação), documentos, laudos, deficiências e transtornos, ficha médica, moradia, projetos, benefícios, histórico de altura e peso e observações. 🟡 `_reversa_sdd/Cadastro/legacy-mapping.md` e `Api/Views/AlunoController.php:44-370`

---

## 2. Contratos HTTP legados (API do aluno)

| Método | Rota | Entrada | Saída | Fonte |
|--------|------|---------|-------|-------|
| GET | `module/Api/Aluno/get` | `id` | Detalhe completo do aluno, com família, matrícula e benefícios | 🟢 `Api/Views/AlunoController.php:1172-1285` |
| POST | `module/Api/Aluno/post` | Corpo completo do formulário | `{id}` | 🟢 `Api/Views/AlunoController.php:1709-1743` |
| PUT | `module/Api/Aluno/put` | Corpo completo do formulário | `{id}` | 🟢 `Api/Views/AlunoController.php:1745-1777` |
| DELETE | `module/Api/Aluno/delete` | `id` | `{id}` | 🟢 `Api/Views/AlunoController.php:1822-1846` |
| PUT | `module/Api/Aluno/enable` | `id` | `{id}` | 🟢 `Api/Views/AlunoController.php:1802-1820` |
| GET | `module/Api/Aluno/search` | `query`, `escola_id` opcional | Lista de alunos com matrícula | 🟢 `Api/Views/AlunoController.php:919-1078` |
| GET | `module/Api/Aluno/getMatriculas` | `id` | Matrículas com situação e escola | 🟢 `Api/Views/AlunoController.php:1483-1587` |
| GET | `module/Api/Aluno/getOcorrenciasDisciplinares` | `aluno_id`, `escola` | Ocorrências disciplinares | 🟢 `Api/Views/AlunoController.php:830-902` |
| GET | `module/Api/Aluno/getTodosAlunos` | `instituicao_id`, `escola`, `ano` opcional | Todos os alunos, com excluídos | 🟢 `Api/Views/AlunoController.php:1324-1427` |
| GET | `module/Api/Aluno/getAlunosByGuardianCpf` | `aluno_id`, `cpf` | Alunos vinculados ao responsável | 🟢 `Api/Views/AlunoController.php:1449-1482` |
| GET | `module/Api/Aluno/getUnificacoes` | `arquivo` | Dados de unificação | 🟢 `Api/Views/AlunoController.php:2113-2219` |
| GET | `module/Api/Aluno/getAlunosMatriculados` | `instituicao_id` | Alunos matriculados por escola | 🟢 `Api/Views/AlunoController.php:2012-2095` |

---

## 3. Regras de validação (catálogo)

| Campo | Regra | Mensagem | Fonte |
|-------|-------|----------|-------|
| `pessoa_id` | Presence e existência de física em `cadastro` | — | 🟢 `Api/Views/AlunoController.php:44-50` |
| `pessoa_id` (criação) | Unicidade de aluno por pessoa | "Já existe um aluno cadastrado para a pessoa {id}." | 🟢 `Api/Views/AlunoController.php:112-123` |
| `tipo_responsavel` | Presence e conjunto {mae, pai, outra_pessoa, pai_mae} | padrão do validador | 🟢 `Api/Views/AlunoController.php:82-92` |
| `responsavel_id` | Presence e existência de física somente quando o responsável é outra pessoa | padrão do validador | 🟢 `Api/Views/AlunoController.php:67-80` |
| `beneficio_id` | Existência quando numérico (opcional) | padrão do validador | 🟢 `Api/Views/AlunoController.php:52-65` |
| `tipo_transporte` | Presence e conjunto {nenhum, municipal, estadual} | padrão do validador | 🟢 `Api/Views/AlunoController.php:100-110` |
| `aluno_inep_id` | Doze dígitos, sem começar com zero; unicidade entre ativos | "Já existe o aluno {id} cadastrado com código inep ..." | 🟢 `Api/Views/AlunoController.php:125-147` e `:200-211` |
| `aluno_estado_id` | Unicidade entre ativos e tamanho mínimo da configuração | "Já existe o aluno {id} cadastrado com código estadual (RA) ..." | 🟢 `Api/Views/AlunoController.php:149-182` |
| `id_federal` (CPF) | CPF válido quando a instituição exige; estrangeiros dispensados | "O CPF informado é inválido" | 🟢 `Api/Views/AlunoController.php:245-272` |
| Deficiências e transtornos | `DeficiencyValidator` com conversão dos códigos do censo | mensagem do validador | 🟢 `Api/Views/AlunoController.php:277-292` |
| Certidão de nascimento | `BirthCertificateValidator` contra a data de nascimento | mensagem do validador | 🟢 `Api/Views/AlunoController.php:297-314` |
| `nis_pis_pasep` | `NisValidator` | mensagem do validador | 🟢 `Api/Views/AlunoController.php:319-330` |
| Recursos tecnológicos | A opção "Nenhum" é exclusiva | "Não é possível informar mais de uma opção no campo: Possui acesso à recursos tecnológicos? ..." | 🟢 `Api/Views/AlunoController.php:335-346` |
| Recursos da prova INEP | `InepExamValidator` contra deficiências e transtornos | mensagem do validador | 🟢 `Api/Views/AlunoController.php:351-370` |
| Pai e mãe | A mesma pessoa não pode ser pai e mãe | "Não é possível informar a mesma pessoa para Pai e Mãe." | 🟢 `Api/Views/AlunoController.php:1593-1597` |
| Projeto | Turno da matrícula, unicidade sem desligamento e data de inclusão superior ao desligamento anterior | mensagens específicas | 🟢 `Api/Views/AlunoController.php:1648-1681` |
| Exclusão de aluno | Sem matrícula ativa | "O cadastro não pode ser removido, pois existem matrículas vinculadas." | 🟢 `Api/Views/AlunoController.php:1822-1846` |

---

## 4. Contrato de persistência

| Tabela legada | Escopo | Gravação | Fonte |
|---------------|--------|----------|-------|
| `pmieducar.aluno` | Registro do aluno | `clsPmieducarAluno` cadastra/edita | 🟢 `Api/Views/AlunoController.php:600-689` |
| `cadastro.fisica` | Pai, mãe, responsável, restrições judiciais e SUS | update | 🟢 `Api/Views/AlunoController.php:549-580` e `:1588-1608` e `:428-434` |
| `cadastro.documento` | Documentos da pessoa | updateOrCreate | 🟢 `Api/Views/AlunoController.php:1943-1974` |
| `cadastro.fisica_deficiencia` | Deficiências e transtornos | sync | 🟢 `Api/Views/AlunoController.php:582-594` |
| `modules.educacenso_cod_aluno` | Código do aluno no censo | delete + recriação | 🟢 `Api/Views/AlunoController.php:525-546` |
| `modules.ficha_medica_aluno` | Ficha médica | updateOrCreate | 🟢 `Api/Views/AlunoController.php:436-476` |
| `modules.moradia_aluno` | Moradia e socioeconômico | updateOrInsert 🟡 (descarta nulos) | 🟢 `Api/Views/AlunoController.php:478-515` |
| `pmieducar.aluno_aluno_beneficio` | Benefícios | delete + inserção | 🟢 `Api/Views/AlunoController.php:1617-1629` |
| `pmieducar.projeto_aluno` | Projetos | delete + inserção | 🟢 `Api/Views/AlunoController.php:1636-1684` |
| `pmieducar.aluno_historico_altura_peso` | Histórico de altura e peso | delete + inserção | 🟢 `Api/Views/AlunoController.php:1686-1707` |
| `cadastro.fisica_foto` | Foto da pessoa | updateOrCreate e delete | 🟢 `Api/Views/AlunoController.php:1856-1876` |
| `modules.pessoa_transporte` | Transporte da pessoa | classe legada | 🟢 `Api/Views/AlunoController.php:1779-1800` |

---

## 5. Contrato de domínio do aluno

Agrupamento do conteúdo gravado na requisição completa:

| Grupo | Conteúdo | Fonte |
|-------|----------|-------|
| Identidade do aluno | `pessoa_id`, código do aluno, nome social, `analfabeto` (invertido), `emancipado`, `tipo_responsavel` | 🟢 `Api/Views/AlunoController.php:596-690` |
| Códigos institucionais | `aluno_inep_id`, `aluno_estado_id`, `codigo_sistema` | 🟢 `Api/Views/AlunoController.php:603-615` |
| Censo | Recursos da prova INEP, escolarização em outro espaço, justificativa de falta de documentação, veículos do transporte | 🟢 `Api/Views/AlunoController.php:640-657` e `:648-649` |
| Transporte | Tipo, rota, ponto, uso rural, transporte da pessoa | 🟢 `Api/Views/AlunoController.php:100-110` e `:677-679` e `:1779-1800` |
| Família | Pai, mãe, responsável, restrições judiciais, autorizados (cinco grupos com parentesco) | 🟢 `Api/Views/AlunoController.php:616-625` e `:1588-1608` |
| Deficiências | Deficiências e transtornos, laudos, obrigatoriedade do laudo | 🟢 `Api/Views/AlunoController.php:277-292` e `:1901-1928` |
| Ficha médica | Vinte e quatro booleanos, grupo sanguíneo e fator Rh, descritivos e contatos do responsável pela ficha | 🟢 `Api/Views/AlunoController.php:436-476` |
| Moradia | Tipo e material, cômodos, bens, saneamento, renda, recursos tecnológicos | 🟢 `Api/Views/AlunoController.php:478-515` |
| Projetos | Projeto, data de inclusão e de desligamento, turno | 🟢 `Api/Views/AlunoController.php:1636-1684` |
| Benefícios | Lista de benefícios | 🟢 `Api/Views/AlunoController.php:1617-1629` |
| Histórico | Datas, altura e peso | 🟢 `Api/Views/AlunoController.php:1686-1707` |

---

## 6. Contrato de exclusão lógica

| Elemento | Regra | Fonte |
|----------|-------|-------|
| Desativação | `ativo = 0` com autor (`ref_usuario_exc`) | 🟢 `Api/Views/AlunoController.php:1822-1846` |
| Reativação | `ativo = 1` com autor | 🟢 `Api/Views/AlunoController.php:1802-1820` |
| Tabela de excluídos | `pmieducar.aluno_excluidos` entra na listagem completa com a data de exclusão | 🟢 `Api/Views/AlunoController.php:1389-1427` |
| Bloqueio | Matrícula ativa impede a desativação | 🟢 `Api/Views/AlunoController.php:1825-1843` |

---

## 7. Contratos planejados para o modelo novo

Derivados de `_reversa_sdd/Cadastro/legacy-mapping.md` e do comportamento observado:

### De/para de entidades

| Legado | Modelo novo |
|--------|-------------|
| `cadastro.pessoa` / `cadastro.fisica` / `cadastro.documento` | `App\Models\Person` do núcleo SYSGOV 🟢 `_reversa_sdd/Cadastro/legacy-mapping.md:11` |
| `cadastro.fisica_deficiencia` | `educa_student_special_needs` 🟢 `_reversa_sdd/Cadastro/legacy-mapping.md:12` |
| `pmieducar.aluno` | `educa_students` 🟢 `_reversa_sdd/Cadastro/legacy-mapping.md:13` |
| `modules.ficha_medica_aluno` | extensão escolar do estudante 🟡 |
| `modules.moradia_aluno` | extensão socioeconômica 🟡 |

### Endpoints REST (Laravel, prefixo `/api/v1/educa/students`)

| Método | Caminho | Deriva de |
|--------|---------|-----------|
| GET | `/api/v1/educa/students` | Listagem completa 🟢 `Api/Views/AlunoController.php:1324-1427` |
| POST | `/api/v1/educa/students` | Criação 🟢 `Api/Views/AlunoController.php:1709-1743` |
| GET | `/api/v1/educa/students/{id}` | Detalhe 🟢 `Api/Views/AlunoController.php:1172-1285` |
| PUT | `/api/v1/educa/students/{id}` | Edição 🟢 `Api/Views/AlunoController.php:1745-1777` |
| DELETE | `/api/v1/educa/students/{id}` | Desativação 🟢 `Api/Views/AlunoController.php:1822-1846` |
| POST | `/api/v1/educa/students/{id}/enable` | Reativação 🟢 `Api/Views/AlunoController.php:1802-1820` |
| GET | `/api/v1/educa/students/search` | Busca por código e por nome 🟢 `Api/Views/AlunoController.php:919-1078` |
| GET | `/api/v1/educa/students/{id}/enrollments` | Matrículas 🟢 `Api/Views/AlunoController.php:1483-1587` |
| GET | `/api/v1/educa/students/{id}/disciplinary-afflictions` | Ocorrências visíveis 🟢 `Api/Views/AlunoController.php:830-902` |
| GET | `/api/v1/educa/students/by-guardian-cpf` | Alunos por responsável 🟢 `Api/Views/AlunoController.php:1449-1482` |
