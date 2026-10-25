# Cadastro (i-Educar legado), Tarefas

> Tarefas de recriação do subsistema de cadastro de aluno no modelo novo, com a origem no legado e o critério de pronto de cada uma.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Modelo de pessoas do SYSGOV Core definido (unit `People`), pois aluno é extensão de pessoa. 🟢 `_reversa_sdd/People/legacy-mapping.md`
- Estratégia de tenant definida (ADR-001) e isolamento por `tenant_id`. 🟢 `_reversa_sdd/adrs/001-multi-tenancy-schema-isolation.md`
- Serviço de arquivos do modelo novo, para fotos e laudos. 🟡
- Validadores reutilizáveis definidos no modelo novo (CPF, NIS, INEP, certidão, deficiencias). 🟢 `Api/Views/AlunoController.php:283-361`

---

## Tarefas

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| T-01 | Criar o modelo do estudante (`educa_students`) com os campos do DDL, herdando do modelo de pessoas do núcleo | `Api/Views/AlunoController.php:596-690` e `_reversa_sdd/Cadastro/legacy-mapping.md:13` | CRUD completo com migração de dados ok | 🟢 |
| T-02 | Implementar as validações de unicidade: um aluno por pessoa, código INEP único entre ativos, código estadual único com tamanho mínimo da instituição | `Api/Views/AlunoController.php:112-182` | Recusas com mensagens equivalentes | 🟢 |
| T-03 | Implementar a validação do código INEP (doze dígitos que não começam com zero) | `Api/Views/AlunoController.php:200-211` | Recusa com formato inválido | 🟢 |
| T-04 | Implementar a validação de CPF condicionada à instituição, com dispensa de estrangeiros | `Api/Views/AlunoController.php:245-272` | Exigência configurável, mensagens equivalentes | 🟢 |
| T-05 | Implementar a gravação da família: pais distintos, responsável conforme o tipo e restrições judiciais | `Api/Views/AlunoController.php:549-580` e `:1588-1608` | Gravação com as quatro situações de tipo | 🟢 |
| T-06 | Implementar a sincronização de deficiências e transtornos, com atualização dos códigos mudados | `Api/Views/AlunoController.php:582-594` e `:2264-2299` | Sincronização com a base de deficiências do censo | 🟢 |
| T-07 | Implementar ficha médica, moradia e histórico de altura e peso, sem descartar valores nulos | `Api/Views/AlunoController.php:436-515` e `:1686-1707` | Campos limpos são efetivamente limpos na base | 🟢 |
| T-08 | Implementar benefícios, projetos e a validação de turno, unicidade e datas | `Api/Views/AlunoController.php:1617-1684` e `:402-421` | Visto pro completo, com mensagens equivalentes | 🟢 |
| T-09 | Implementar documentos, SUS, foto e laudos pelo serviço de arquivos | `Api/Views/AlunoController.php:428-434` e `:1856-1988` | Gravação de documentos e arquivos integrada | 🟢 |
| T-10 | Implementar o código do Educacenso do aluno com destruição e recriação conforme a presença do código | `Api/Views/AlunoController.php:525-546` | Estado coerente com o campo INEP | 🟢 |
| T-11 | Implementar os códigos de desativação e reativação com o bloqueio de matrícula ativa e o autor registrado | `Api/Views/AlunoController.php:1802-1846` | Bloqueio com mensagem equivalente | 🟢 |
| T-12 | Implementar as consultas: busca, matrículas, ocorrências visíveis aos pais, listagem completa e alunos por CPF do responsável | `Api/Views/AlunoController.php:830-1587` | Consultas com o mesmo formato de saída | 🟢 |
| T-13 | Substituir as três interpolações SQL e a interpolação do `id` no formulário por consultas preparadas | `Api/Views/AlunoController.php:881` e `:1380` e `:1404` e `Cadastro/Views/AlunoController.php:336` 🔴 | Testes de injeção falham = consultas preparadas | 🟢 |
| T-14 | Corrigir a transação da criação: rollback na falha dos pais e no falha do aluno | `Api/Views/AlunoController.php:1712-1739` 🔴 | Nenhum estado parcial na base | 🟢 |
| T-15 | Implementar a trilha de auditoria das mudanças do cadastro do aluno | ausente no legado, previsto no modelo novo 🔴 | Trilha consultável por aluno | 🔴 |
| T-16 | Decidir no modelo novo a convenção do nome social na exibição com o nome civil | `Api/Views/AlunoController.php:940-944` | Padrão de exibição definido e documentado | 🟡 |

---

## Tarefas de Teste

| ID | Teste | Origem no legado | Critério de pronto | Confiança |
|----|-------|------------------|--------------------|-----------|
| TT-01 | Aluno duplicado para a mesma pessoa é recusada | `Api/Views/AlunoController.php:112-123` | Mensagem de aluno já cadastrado | 🟢 |
| TT-02 | Código INEP duplicado é recusado entre alunos ativos | `Api/Views/AlunoController.php:125-147` | Mensagem com o aluno em conflito | 🟢 |
| TT-03 | Código INEP com onze dígitos ou início com zero é recusado | `Api/Views/AlunoController.php:200-211` | Recusa em ambos os casos | 🟢 |
| TT-04 | CPF inválido é recusado com instituição exigente, e aceito para estrangeiro | `Api/Views/AlunoController.php:245-272` | A dispensa funciona | 🟢 |
| TT-05 | Mesma pessoa como pai e mãe é recusada | `Api/Views/AlunoController.php:1593-1597` | Gravação interrompida | 🟢 |
| TT-06 | Projeto no turno da matrícula, duplicado ativo ou com data anterior ao desligamento é recusado | `Api/Views/AlunoController.php:1648-1681` | As três recusas | 🟢 |
| TT-07 | Desativação do aluno com matrícula ativa é recusada | `Api/Views/AlunoController.php:1822-1846` | Bloqueio com mensagem | 🟢 |
| TT-08 | Campos limpos da moradia são apagados na base | `Api/Views/AlunoController.php:478-515` 🔴 | Sem dados obsoletos | 🟢 |
| TT-09 | Consulta com conteúdo malicioso nos campos interpolados é segura | `Api/Views/AlunoController.php:881` 🔴 | Nenhuma execução | 🟢 |
| TT-10 | Falha dos pais na criação faz rollback e não persiste nada | `Api/Views/AlunoController.php:1712-1739` 🔴 | Nenhum aluno parcial | 🟢 |
| TT-11 | Inserção do aluno com nome social exibe o formato composto | `Api/Views/AlunoController.php:940-944` | Formato igual ao legado | 🟢 |

---

## Tarefas de Migração de Dados

| ID | Tarefa | Origem no legado | Critério de pronto | Confiança |
|----|--------|------------------|--------------------|-----------|
| TM-01 | Migrar `pmieducar.aluno` para `educa_students`, com UUID, `tenant_id` e vínculo à pessoa do núcleo | `_reversa_sdd/Cadastro/legacy-mapping.md:13` | Contagens batem, códigos preservados | 🟢 |
| TM-02 | Migrar a ficha médica, a moradia e o histórico com a conversão dos booleanos de "S"/"N" | `Api/Views/AlunoController.php:436-515` | Booleanos convertidos, campos coerentes | 🟢 |
| TM-03 | Migrar benefícios e projetos, com a resolução da duplicidade de projetos ativos | `Api/Views/AlunoController.php:1617-1684` | Sem projetos duplicados | 🟡 |
| TM-04 | Migrar os array literals do PostgreSQL (`recursos_prova_inep`) e quais listas CSV (`veiculo_transporte_escolar`) para o formato do modelo novo | `Api/Views/AlunoController.php:640-657` | Consultas convertidas corretamente | 🟡 |
| TM-05 | Migrar as fotos e os laudos para o serviço de arquivos do modelo novo | `Api/Views/AlunoController.php:1856-1928` | Arquivos acessíveis pelas rotas novas | 🟡 |
| TM-06 | Reconciliar os campos obsoletos da moradia gerados pelo mecanismo que descarta nulos | `Api/Views/AlunoController.php:508-514` 🔴 | Relatório de inconsistências curado | 🟡 |

---

## Ordem Sugerida

1. T-01 (modelo do estudante)
2. T-02 a T-04 (unicidade e validações)
3. T-05 a T-07 (família, deficiências e fichas)
4. T-08 a T-10 (benefícios, projetos, documentos e Educacenso)
5. T-13 e T-14 (correções de segurança e transação)
6. T-11 (desativação e reativação)
7. T-12 (consultas)
8. T-16 (nome social)
9. T-15 (auditoria)
10. TM-01 a TM-06 (migração)

**Bloqueios:**

- T-01 bloqueia todas as demais, pois o modelo do estudante é a base.
- T-13 e T-14 independem da ordem e devem entrar antes da implantação.
- TM-01 depende do modelo de pessoas do SYSGOV Core (unit `People`).
- TM-05 depende do serviço de arquivos do modelo novo.

---

## Lacunas Pendentes (🔴)

- Existência de campos sem consumo localizado (inscrição estadual do aluno, autorizados de busca e busca de parentes). 🟡
- Comportamento de `getAlunosMatriculados` (consumido por aplicativos de parceiros) no modelo novo. 🟡
- Semântica de `getUnificacoes` a detalhar na unit `Unification` (20), que cobre o mesmo domínio. 🟡
- Dados obsoletos da moradia na base real, efeito do mecanismo de descarte de nulos. 🟡
