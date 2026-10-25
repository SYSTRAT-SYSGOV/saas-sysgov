# HistoricoEscolar (i-Educar legado), Tasks

> Plano de tarefas derivado de requirements.md e design.md. Cada tarefa cita evidência no legado.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tarefas

| ID | Tarefa | Entregável | Dependências | Evidência | Confiança |
|----|--------|-----------|--------------|-----------|-----------|
| T-01 | Criar tabela de cabeçalho do histórico com aluno, sequencial, ano, escola/curso/série textuais, cargas, dias letivos, situação, frequência, faltas globalizadas, extra-curricular, aceleração, dependência, posição, origem e assentamento (registro, livro, folha). | Migração + modelo | — | `create_pmieducar_historico_escolar_table` | 🟢 |
| T-02 | Criar tabela de disciplinas com vínculo ao cabeçalho, texto de disciplina, nota textual, faltas, carga, ordem, dependência e base curricular (comum/diversificada). | Migração + modelo | T-01 | `create_pmieducar_historico_disciplinas_table` | 🟢 |
| T-03 | Criar tabela de grade de modelo impresso (descrição de etapa + quantidade de etapas) com seed fixo. | Migração + seed | — | `create_pmieducar_historico_grade_curso_table` + data seed | 🟢 |
| T-04 | Implementar atribuição de sequencial automático por aluno (máximo + 1) na criação. | Serviço | T-01 | `SchoolHistoryService.php:102-105` | 🟢 |
| T-05 | Implementar CRUD da vida pregressa: etapa com escola externa (país, UF, cidade por busca), curso, série, ano, assentamento livre e situação filtrada. | Tela + API | T-01 | `educar_historico_escolar_cad.php:145-308` | 🟢 |
| T-06 | Implementar tabela dinâmica de disciplinas na vida pregressa com base curricular, nota, faltas, carga, ordem e dependência por linha. | Tela + API | T-05 | `educar_historico_escolar_cad.php:275-288`, `:418-430` | 🟢 |
| T-07 | Implementar exclusão lógica do cabeçalho (autor + data) com decisão de arquivamento das disciplinas. | Serviço | T-01, T-05 | `educar_historico_escolar_cad.php:366-384` | 🟡 |
| T-08 | Implementar a tela de processamento consolidado (ano, instituição, escola, curso, série, turma, matrícula) com fonte por campo (boletim, AP fixo, manual). | Tela | T-01 | `ProcessamentoController.php:37-235` | 🟢 |
| T-09 | Implementar backend do processamento com transação, criação (próximo sequencial) e reprocessamento (sequencial mantido). | API | T-08 | `ProcessamentoApiController.php:549-601` | 🟢 |
| T-10 | Implementar leitura do boletim para situação, percentual de frequência, notas, faltas e faltas globalizadas (reaproveitando o módulo de avaliação). | Integração | T-09 | `ProcessamentoApiController.php:501-547` | 🟢 |
| T-11 | Implementar média geral como linha de disciplina com arredondamento pela tabela da regra. | Serviço | T-09 | `SchoolHistoryService.php:66-88` | 🟢 |
| T-12 | Implementar média por área de conhecimento no processamento. | API | T-09 | `ProcessamentoController.php:222-233` | 🟢 |
| T-13 | Implementar histórico automático de transferência acionado pela bandeira institucional, com situação Tran e disciplinas da série sem notas. | Serviço + gatilho | T-01 | `SchoolHistoryService.php:19-64` | 🟢 |
| T-14 | Implementar restrição de edição por vínculo de escola da última matrícula (ou níveis superiores) quando a bandeira institucional pedir. | Regra | T-01 | `educar_historico_escolar_det.php:211-242` | 🟢 |
| T-15 | Implementar campo de posição com exigência condicionada à bandeira institucional de controle de posição. | Tela + validação | T-08 | `ProcessamentoController.php:75-84`, `:270-277` | 🟢 |
| T-16 | Implementar listagem e detalhe por aluno, com clonagem de etapa via parâmetro. | Telas | T-05 | `educar_historico_escolar_lst.php:90-138`, `educar_historico_escolar_cad.php:115-119` | 🟢 |
| T-17 | Corrigir o vício do legado de estampar `data_exclusao` em updates com registro ativo (reprocessamento e edição). | Correção | T-09 | `ProcessamentoApiController.php:581-584` | 🟡 |
| T-18 | Definir distinção explícita de origem (manual vs processado) na migração, sem tentar derivar do legado (`origem` sempre 1). | Migração | T-01 | `ProcessamentoApiController.php:620`, `educar_historico_escolar_cad.php:401` | 🟡 |
| T-19 | Implementar movimentação de históricos e disciplinas na unificação de alunos. | Integração | T-01, T-02 | `ieducar/lib/App/Unificacao/Aluno.php:24-76` (unit `Unification`) | 🟢 |
| T-20 | Emitir o documento oficial timbrado com chancela digital a partir dos históricos. | Relatório | T-16 | Sem base legada; bastão | 🔴 |
| T-21 | Consolidar fechamento anual automático ao fim do ano letivo. | Job | T-09, `Calendario` | Sem base legada; processamento é sob demanda | 🔴 |
| T-22 | Substituir consultas com interpolação de parâmetros por consultas parametrizadas. | Correção transversal | — | `educar_historico_escolar_det.php:215-224` | 🔴 |

---

## Ordem sugerida

1. **Fundação (T-01 a T-04):** modelo de dados e sequencial.
2. **Vida pregressa (T-05 a T-07, T-16):** CRUD manual completo.
3. **Processamento (T-08 a T-12, T-15, T-17):** consolidação e fontes.
4. **Temas cruzados (T-13, T-14, T-18, T-19, T-22):** bandeiras institucionais e integrações.
5. **Novidades do bastão (T-20, T-21):** documento timbrado e fechamento anual.

---

## Marimba de riscos de execução

- T-10 depende do módulo de avaliação estar operante (units `Avaliacao` e `RegraAvaliacao` concluídas antes). 🟢
- T-20 e T-21 não têm paridade de código no legado; executar com critério do bastão e validar com a secretaria. 🔴
- T-07 e T-18 exigem decisão de migração discordante do legado; registrar em ADR próprio. 🟡
