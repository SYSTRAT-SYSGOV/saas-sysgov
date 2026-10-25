# QuadroHorario (i-Educar legado), Tasks

> Plano de tarefas derivado de requirements.md e design.md. Cada tarefa cita evidência no legado.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Tarefas

| ID | Tarefa | Entregável | Dependências | Evidência | Confiança |
|----|--------|-----------|--------------|-----------|-----------|
| T-01 | Criar cabeçalho do quadro por turma/ano com usuário-autor e datas; `ano` obrigatório no alvo. | Migração + modelo | — | `create_pmieducar_quadro_horario_table` | 🟢 |
| T-02 | Criar tabela de slots com chave composta (quadro, sequencial), componente, escola, série, dia 1–7, intervalo de hora, servidor e instituição de origem. | Migração + modelo | T-01 | `create_pmieducar_quadro_horario_horarios_table` | 🟢 |
| T-03 | Criar colunas de substituto pontual (instituição + servidor) com FK ao servidor. | Migração | T-02 | migração FK `quadro_horario_horarios` | 🟢 |
| T-04 | Implementar recusa de duplicidade de quadro por (turma, ano) com constraint única, corrigindo a janela de corrida do legado. | Regra + constraint | T-01 | `educar_quadro_horario_cad.php:99-105` | 🟡 |
| T-05 | Implementar grade semanal visual da turma (DOM–SAB) com slots ordenados por hora. | Tela | T-02 | `educar_quadro_horario_lst.php:124-215` | 🟢 |
| T-06 | Implementar inclusão de aula por componente/dia/hora/docente com apontamento de instituição. | Tela + API | T-02 | `educar_quadro_horario_horarios_cad.php:204-340` | 🟢 |
| T-07 | Implementar replicação "todas as disciplinas" (um slot por componente da série/turma). | API | T-06 | `educar_quadro_horario_horarios_cad.php:554-612` | 🟢 |
| T-08 | Implementar edição e inativação de slot (ativo = 0) com autor e data. | API | T-06 | `:362-406`, `clsPmieducarQuadroHorarioHorarios.php:244-304` | 🟡 |
| T-09 | Implementar substituto pontual por slot com exibição do docente efetivo na listagem. | API + tela | T-03 | `educar_quadro_horario_lst.php:156`, `:190` | 🟢 |
| T-10 | Implementar exclusão do cabeçalho com desativação em bloco das aulas. | Serviço | T-01 | `educar_quadro_horario_cad.php:155-186` | 🟢 |
| T-11 | Eliminar o padrão de estado serializado em POST (substituir por transações tipadas), corrigindo o `unserialize` de entrada. | Remodelagem | T-06 | `educar_quadro_horario_horarios_cad.php:279-281`, `:550` | 🔴 |
| T-12 | Implementar gravação atômica da grade completa (transação única, slot a slot). | Serviço | T-06 | `:549-652` | 🟡 |
| T-13 | Implementar detector global de choques de horário (turma e professor), tenant-wide, com mensagem do conflito. | Serviço | T-02, T-12 | Bastão `_reversa_sdd/QuadroHorario/legacy-mapping.md:177-327`; sem base legada | 🔴 |
| T-14 | Implementar validação prévia (endpoint rápido) para feedback na UI. | API | T-13 | Bastão `:337` | 🔴 |
| T-15 | Implementar versionamento da grade (rascunho/publicado/arquivado). | Migração + fluxo | T-01 | Bastão `:86-98`; sem base legada | 🔴 |
| T-16 | Implementar histórico de substituição por data/motivo (licenças e afastamentos), integrado ao afastamento de `Servidores`. | Migração + serviço | T-09, `Servidores` | `educar_servidor_afastamento_cad.php:226`; bastão `:125-146` | 🟡 |
| T-17 | Implementar filtros docente (escolas, cursos, séries, turmas, componentes) derivados do quadro, gateados pela bandeira `exigir_vinculo_turma_professor`. | Serviço | T-02 | `Portabilis\Business\Professor.php:51-290`, `:370-374` | 🟢 |
| T-18 | Implementar fallback dos filtros por alocação quando a bandeira está desligada. | Serviço | T-17, `Servidores` | `Professor.php:76-99`, `:196-256`, `:290-345` | 🟢 |
| T-19 | Implementar validação de capacidade semanal (carga da alocação ≥ horários atribuídos, com multi-sériado) na pesquisa de servidores. | Regra | T-02, `Servidores` | `educar_pesquisa_servidor_lst.php:415-470` | 🟢 |
| T-20 | Corrigir o `Excluir()` da tela de horários (hoje apaga dia de calendário) e remover os campos vestigiais de minutos por turno. | Correção | T-06 | `educar_quadro_horario_horarios_cad.php:799-822`, `:50-62`, `:533-535` | 🟡 |
| T-21 | Parametrizar consultas com interpolação (classes legadas do quadro). | Correção transversal | — | `clsPmieducarQuadroHorarioHorarios.php:613-669` | 🔴 |

---

## Ordem sugerida

1. **Fundação (T-01 a T-03):** dados do quadro, slots e substituto.
2. **CRUD e grade (T-04 a T-10, T-20):** telas e regras legadas.
3. **Correções estruturais (T-11, T-12, T-21):** estado tipado, transação, SQL seguro.
4. **Novidades do bastão (T-13 a T-16):** choque global, validação prévia, versão, histórico.
5. **Integrações (T-17 a T-19):** filtros docente e capacidade, com `Servidores` e `Configuracao`.

---

## Panorama de riscos de execução

- T-13 exige decisão de política: o que fazer com grades legadas já sobrepostas na migração (aceitar, sinalizar ou rejeitar). 🔴
- T-15 muda o ciclo de trabalho da secretaria; validar com oficina antes de publicação. 🔴
- T-17/T-18 alteram o comportamento percebido do professor no diário; validar com piloto por bandeira. 🟢
- T-19 compartido com a unit `Servidores`: não duplicar regra (única fonte do cálculo). 🟡
