# QuadroHorario (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de quadro de horários faz: o quadro semanal de horários da turma (cabeçalho por turma e ano, aulas por dia da semana e intervalo de hora), o rascunho em tabela auxiliar, o papel do quadro como fonte de vínculo docente-turma-componente para o diário de classe, a substituição pontual de professor no slot e o fechamento por carga horária semanal contra a alocação.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O quadro de horários do legado é composto de três tabelas: `pmieducar.quadro_horario` (cabeçalho por turma e ano), `pmieducar.quadro_horario_horarios` (aulas por dia da semana 1–7 com disciplina, escola, série, servidor e intervalo de hora) e `pmieducar.quadro_horario_horarios_aux` (rascunho de sessão com identificador temporário, apagado automaticamente após 3 horas). O módulo vive no menu Servidores sob o processo 641, nível 7. 🟢 migrações `create_pmieducar_quadro_horario*` contra `_reversa_sdd/QuadroHorario/legacy-mapping.md:13-17`

Além do cadastro visual (grade semanal por turma), o quadro tem papel estrutural: quando a instituição liga a bandeira `exigir_vinculo_turma_professor`, as telas de lançamento do professor (escola, curso, série, turma e componente curricular) são filtradas por quem está alocado no quadro de horários, em vez de pela alocação administrativa. 🟢 `ieducar/lib/Portabilis/Business/Professor.php:51-99`, `:196-256`, `:258-290` e `:370-374` (unit `Configuracao`)

O bastão descreve com fidelidade o modelo (tabela de/para conferida coluna a coluna), mas omite colunas reais (escola série e as instituições do servidor e do substituto — o servidor pode ser de outra instituição) e atribui ao módulo verificação de choques sobrepostos e versionamento que **não existem no legado**. 🟡 `_reversa_sdd/QuadroHorario/legacy-mapping.md:151-174`

> Escopo por referência: `pmieducar.servidor_alocacao` (jornada, carga, hora-atividade, horas excedentes), `pmieducar.servidor_disciplina` (habilitações) e o afastamento com substituto (`educar_servidor_afastamento_cad.php`) pertencem à unit `Servidores`. 🟢

---

## Responsabilidades

- Manter o quadro por turma e ano: um único quadro ativo por turma/ano (duplicidade recusada com alerta). 🟢 `ieducar/intranet/educar_quadro_horario_cad.php:95-111`
- Registrar aulas por slot: componente curricular (ou "todas as disciplinas" da série, replicando uma aula por componente), dia da semana 1–7 e intervalo de hora inicial a final. 🟢 `educar_quadro_horario_horarios_cad.php:204-244` e `:579-612`
- Atribuir servidor docente por aula, com instituição de origem (o servidor pode ser de outra instituição da rede). 🟢 migração `create_pmieducar_quadro_horario_horarios_table` (colunas `ref_cod_instituicao_servidor`, `ref_servidor`)
- Registrar substituto pontual na aula (colunas de instituição e servidor substituto, com FK ao servidor). 🟢 migração FK `quadro_horario_horarios` e `educar_quadro_horario_lst.php:156`, `:190`
- Sustentar rascunho de edicação em `quadro_horario_horarios_aux` por identificador de sessão; rascunho apagado ao gravar, ao reabrir e automaticamente após 3 horas. 🟢 `educar_quadro_horario_horarios_cad.php:92-94`, `:306-324`, `:641-643` e `clsPmieducarQuadroHorarioHorariosAux.php:68`, `:399-405`
- Exibir a grade semanal da turma (tabela DOM a SAB) com os horários ordenados e a indicação do substituto. 🟢 `educar_quadro_horario_lst.php:124-215`
- Alimentar os filtros do professor no diário de classe (escolas, cursos, séries, turmas e componentes onde leciona no quadro) quando a bandeira institucional exigir vínculo por turma. 🟢 `Portabilis\Business\Professor.php:51-290` (consumidores: `modules/DynamicInput/Views/*.php`, `modules/Avaliacao/Views/DiarioController.php:12`)
- Validar capacidade de alocação na pesquisa de servidores: a carga horária da alocação deve tolerar a soma dos horários já atribuídos (quadro mais rascunho) naquele intervalo, salvo servidor multi-sériado. 🟢 `ieducar/intranet/educar_pesquisa_servidor_lst.php:415-470` (unit `Servidores`)

---

## Regras de Negócio

### Quadro e slots

- Cabeçalho `pmieducar.quadro_horario`: chave serial, turma obrigatória, usuário de cadastro/exclusão, datas e `ativo`; `ano` é opcional no legado (nulo possível), ao contrário do alvo. 🟢 migração
- Aulas `pmieducar.quadro_horario_horarios`: chave composta (quadro, sequencial); componente, escola, série, instituição do servidor, servidor, instituição e servidor substituto (opcionais), dia da semana, hora inicial e final, ativo; índice de busca por servidor e intervalo para as telas de filtragem. 🟢 migração + FKs
- A exclusão do cabeçalho marca `ativo = 0` e desativa as aulas em bloco (`UPDATE ... SET ativo = 0`). 🟢 `educar_quadro_horario_cad.php:155-186`, `clsPmieducarQuadroHorarioHorarios.php: excluirTodos`
- A inclusão "todas as disciplinas" replica um registro por componente da série/turma com o mesmo servidor e intervalo. 🟢 `educar_quadro_horario_horarios_cad.php:554-612`
- O botão de excluir aula marca o slot como `ativo = 0` (inatividade) ou faltando no banco (marca 2 para o formulário), sempre pelo par de quadro e sequencial. 🟡 `educar_quadro_horario_horarios_cad.php:362-406`

### Rascunho (`_aux`) e ciclo de gravação

- Todo estado do formulário trafega serializado em campo oculto (`serialize`/`unserialize de $_POST`) e na tabela auxiliar com `identificador`; a gravação final percorre os registros e grava/edita um a um, sem transação explícita, e limpa o rascunho no fim. 🟢 `:279-281`, `:549-652`, `:654-797`
- Reabrir a tela apaga os rascunhos do identificador (evita fantasmas). 🟢 `:92-94`

### Choques e capacidade

- **Não existe** verificação de sobreposição de intervalos (turma com duas aulas no mesmo horário; professor em duas turmas simultâneas) nem proteção concorrente — nem constraint exclusiva, nem checagem transacional. 🔴 busca no código contra `_reversa_sdd/QuadroHorario/legacy-mapping.md:19-23`
- A única checagem relacionada é de **capacidade semanal** na pesquisa de servidores: carga da alocação ≥ soma dos horários do quadro e do rascunho na escola/intervalo (ou `multi_seriado`). 🟢 `educar_pesquisa_servidor_lst.php:415-470` (unit `Servidores`)
- A checagem de duplicidade do quadro por turma/ano é a única proteção de unicidade, feita por consulta ad hoc antes de gravar (janela de corrida). 🟡 `educar_quadro_horario_cad.php:99-105`

### Papel estrutural para o professor

- Com `exigir_vinculo_turma_professor` ligada, os dropdowns do diário do professor derivam do quadro: escolas, cursos, séries, turmas e componentes onde ele tem aula ativa; sem a bandeira, derivam da `servidor_alocacao`/`servidor_curso_ministra`/`servidor_disciplina`. 🟢 `Portabilis\Business\Professor.php:51-290`, `:370-374`
- O filtro de componente também tem fallback por turma e por curso quando o quadro não restringe. 🟢 `:290-345`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve manter um único quadro ativo por turma e ano com cabeçalho e datas de auditoria. | Must | Dado quadro existente para a turma, então edição recusa duplicidade bloqueando. 🟢 |
| RC-02 | O sistema deve registrar aulas por dia da semana (1–7) com componente, escola, série, servidor e intervalo de hora. | Must | Dado aula de 07:30 a 08:20 em segundas, então o slot gravado aponta o componente e o docente. 🟢 |
| RC-03 | O sistema deve replicar "todas as disciplinas" em um registro por componente da série/turma. | Must | Dado opção todas, quando gravado, então componentes da série geram slots iguais. 🟢 |
| RC-04 | O sistema deve permitir substituto pontual por aula, com instituição de origem. | Should | Dado substituto informado, então o slot aponta o docente efetivo e o titular preservado. 🟢 |
| RC-05 | O sistema deve sustentar rascunho por sessão com limpeza automática (3 horas, ao gravar, ao reabrir). | Should | Dado rascunho órfão, quando o ciclo fecha, então nenhum resíduo permanece. 🟢 |
| RC-06 | O sistema deve exibir a grade semanal da turma (DOM a SAB) com slots ordenados e docente efetivo (substituto quando existir). | Must | Dado aulas de 5 dias, então a matriz tem bastões nos dias certos. 🟢 |
| RC-07 | O sistema deve filtrar escola/curso/série/turma/componente do professor pelo quadro quando a bandeira institucional pede vínculo por turma. | Must | Dado professor alocado em 2 escolas, quando abre o diário, então só essas escolas aparecem. 🟢 |
| RC-08 | O sistema deve validar capacidade semanal da alocação contra os horários atribuídos (e rascunho) na pesquisa de servidores. | Should | Dado servidor sem carga livre, então sem permissão na pesquisa. 🟢 |
| RC-09 | O sistema deve detectar e recusar sobreposição de horários da turma e do professor em todo o tenant, com mensagem do conflito. | Must | 🔴 Nova funcionalidade do bastão (sem paridade legada). |
| RC-10 | O sistema deve versionar a grade (rascunho, publicado, arquivado) com lote atômico de gravação. | Should | 🔴 Nova funcionalidade do bastão (legado grava slot a slot, sem versão). |
| RC-11 | O sistema deve manter histórico de substituição por data e motivo (licença, afastamento). | Could | 🔴 Nova funcionalidade do bastão (legado tem só o campo pontual; afastamento formal na unit `Servidores`). |
| RC-12 | O sistema deve expor horas de sala, hora-atividade e horas excedentes por docente a partir da alocação. | Should | 🟢 Paridade via unit `Servidores` (servidor_alocacao). |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Segurança | Estado do formulário trafega por `serialize`/`unserialize` de `$_POST` (execução de objeto se manipulado). | `educar_quadro_horario_horarios_cad.php:279-281`, `:550`, `:664` | 🔴 |
| Segurança | Consultas SQL com interpolação de parâmetros nas classes e telas do módulo. | `clsPmieducarQuadroHorarioHorarios.php: retHorario `, `_aux` igual | 🔴 |
| Integridade | Gravação slot a slot sem transação; falha no meio deixa grade parcial com rascunho ainda vivo. | `educar_quadro_horario_horarios_cad.php:549-652` | 🟡 |
| Integridade | `Excluir()` da tela de horários apaga dia de calendário (bug de copiar/colar) e redireciona para anotação do calendário. | `educar_quadro_horario_horarios_cad.php:799-822` | 🟡 |
| Auditoria | Autor e data no cabeçalho; nas aulas só data de cadastro/exclusão sem autor. | migração | 🟡 |
| Consistência | `ano` do cabeçalho opcional no banco, exigido pela tela via GET. | migração e `educar_quadro_horario_cad.php:41-45` | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado turma com quadro ativo no ano
Quando o quadro é gravado de novo
Então recusado com alerta de quadro já cadastrado 🟢

Dado aula inclusa com "todas as disciplinas" e 8 componentes
Quando gravada
Então 8 slots com o mesmo docente e intervalo 🟢

Dado substituto na aula
Quando a grade abre
Então o nome exibido é do substituto 🟢

Dado rascunho com identificador antigo (mais de 3 h)
Quando outro rascunho é gravado
Então o antigo é apagado fisicamente 🟢

Dado bandeira exigir vínculo por turma e professor alocado em 2 escolas
Quando o professor abre o diário
Então só escolas/cursos/séries/turmas/componentes do quadro 🟢

Dado duas aulas sobrepostas da mesma turma no tentânte
Quando gravado
Então recusado com conflito ⭕ (novo no alvo) 🔴
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Quadro por turma/ano com slots semanais | Must | Núcleo legado 🟢 |
| Filtros docente-turma-componente para o diário | Must | Papel estrutural do quadro 🟢 |
| Grade semanal visual e substituto pontual | Must | Experiência de secretaria 🟢 |
| Rascunho de sessão | Should | Mecânica interna 🟡 |
| Capacidade vs alocação na pesquisa | Should | Compartida com unit `Servidores` 🟢 |
| Detecção de choque sobreposto global | Must | Solução do risco maior do bastão 🔴 |
| Versionamento e publicação da grade | Should | Novo fluxo de trabalho 🔴 |
| Histórico de substituição por motivo | Could | Novo; formal já na unit `Servidores` 🔴 |

---

## Rastreabilidade de Código

| Arquivo | Papel | Cobertura |
|---------|-------|-----------|
| `ieducar/intranet/educar_quadro_horario_cad.php` | Cabeçalho do quadro (processo 641, nível 7) | 🟢 |
| `ieducar/intranet/educar_quadro_horario_lst.php` | Grade semanal visual + substituto | 🟢 |
| `ieducar/intranet/educar_quadro_horario_horarios_cad.php` | Aulas, rascunho, gravação por slots | 🟢 |
| `ieducar/intranet/educar_quadro_horarios_pesquisas.php` | Filtros compartilhados (include) | 🟢 |
| `ieducar/intranet/educar_pesquisa_servidor_lst.php` | Validador de capacidade/quadratura por servidor | 🟢 |
| `ieducar/intranet/include/pmieducar/clsPmieducarQuadroHorario*.inc.php` | CRUD legado das três tabelas | 🟢 |
| `ieducar/lib/Portabilis/Business/Professor.php` | Filtros docente do quadro (flag institucional) | 🟢 |
| `ieducar/modules/DynamicInput/Views/*.php` | Consumidores dos dropdowns | 🟢 |
| `ieducar/modules/Avaliacao/Views/DiarioController.php` | Consumidor (professor-only) | 🟢 |
| migrações `create_pmieducar_quadro_horario*` + FKs | Modelo de dados | 🟢 |
| `ieducar_servidor_afastamento_cad.php` | Substituição formal (unit `Servidores`, referência) | 🟢 |
