# QuadroHorario (i-Educar legado), Flows

> Fluxos observados no código legado. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## F-01: Criação do quadro de uma turma

**Ator:** secretaria com acesso ao processo 641 (nível 7). 🟢 `educar_quadro_horario_cad.php:20-93`

1. O operador seleciona ano, instituição, escola, curso, série e turma nos filtros dinâmicos. 🟢 `educar_quadro_horario_cad.php:88-90`
2. No envio, o backend checa se já existe quadro ativo para a mesma turma/ano; se houver, alerta "Quadro de Horário já cadastrado para esta turma". 🟢 `:99-108`
3. Novo quadro é gravado com usuário e data,agem ativo; o fluxo vai para a listagem. 🟢 `:110-127`
4. Exclusão do quadro: desativa todas as aulas (`ativo = 0`) por consulta em bloco e inativa o cabeçalho com autor. 🟢 `:155-186`

## F-02: Inclusão de aulas (slots)

**Ator:** secretaria (processo 641). 🟢 `educar_quadro_horario_horarios_cad.php:14-104`

1. Aberta a tela com quadro, turma, série, escola, disciplina e dia por GET; reaberturas sem POST apagam os rascunhos do identificador. 🟢 `:28-36`, `:88-94`
2. Se a turma já tem aulas naquele dia, são carregadas para o estado do formulário e copiadas ao rascunho aux (para consultas na listagem). 🟢 `:110-150`
3. O operador escolhe componente (ou "todas as disciplinas"), vê dia bloqueado, e informa hora inicial/final e servidor (com instituição implícita). 🟢 `:204-266`
4. "Incluir" grava no rascunho aux e no estado serializado do formulário; slot aparece na lista com dia, horas, disciplina e nome do servidor. 🟢 `:279-340`, `:439-504`
5. Repetição dos passos 3–4 para cada aula. Gravação final: para aulas originárias de listado existente → `edita()`; para novas/create → `cadastra()`; "todas as disciplinas" replicado componente a componente. 🟢 `:540-652`
6. Sucesso limpa o rascunho por identificador e redireciona à listagem; falha de qualquer slot deixa o rascunho vivo e mostra mensagem minimalista. 🟢 `:641-651`
7. A exclusão de slot pela lista marca inatividade (ou marca 2 quando o registro já não está ativo). 🟢 `:362-406`

## F-03: Visualização da grade semanal

1. Na listagem, com `busca = S` e turma selecionada, a matriz DOM–SAB é montada com `retornaHorario` por dia (slots ordenados por hora inicial). 🟢 `educar_quadro_horario_lst.php:124-215`, `clsPmieducarQuadroHorarioHorarios.php:613-669`
2. Cada slot exibe o docente efetivo: se a aula tem `ref_servidor_substituto`, o substituto aparece; senão o titular. 🟢 `educar_quadro_horario_lst.php:156`, `:190`

## F-04: Pesquisa de servidor com validação de capacidade

**Ator:** secretaria, ao escolher quem lecciona em um slot. 🟢 `ieducar/intranet/educar_pesquisa_servidor_lst.php:415-470` (unit `Servidores`)

1. A pesquisa compara a carga horária da alocação do servidor com a soma dos horários dos slots ativos do quadro + rascunho na escola/intervalo, respeitando o turno. 🟢 `:420-457`
2. Servidores `multi_seriado` passam pela checagem; sem carga suficiente, ficam invisíveis/indisponíveis. 🟢 `:454-470`

## F-05: Filtros docente no diário (consumo estrutural)

**Ator:** professor abrindo o diário de classe. 🟢 `ieducar/modules/Avaliacao/Views/DiarioController.php:12`, `modules/DynamicInput/Views/*.php`

1. Se usuário é "somente professor" e a bandeira `exigir_vinculo_turma_professor` está ligada, os dropdowns (escola, curso, série, turma, componente) derivam dos slots do quadro onde ele está alocado. 🟢 `Portabilis_Business_Professor.php:51-290`, `:370-374`
2. Sem a bandeira, os mesmos filtros derivam da `servidor_alocacao` (escolas/turnos), `servidor_curso_ministra`/`servidor_disciplina` (cursos/séries) e componentes por turma/curso. 🟢 `:76-99`, `:196-256`, `:290-345`

## F-06: Detecção de choque sobreposto (novo no alvo)

1. O bastão pede detector global (turma e professor) com validação prévia na UI; não existe no legado — conflitos eram possíveis e não reclamados. 🔴 `_reversa_sdd/QuadroHorario/legacy-mapping.md:19-23`, `:177-327`
