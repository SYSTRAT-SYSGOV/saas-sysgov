# QuadroHorario (i-Educar legado), Design

> Como o subsistema de quadro de horários está estruturado no código legado, com fluxos, dependências, decisões e riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `educar_quadro_horario_cad` (clsCadastro) | Cabeçalho do quadro por turma/ano (processo 641) | 🟢 `ieducar/intranet/educar_quadro_horario_cad.php:3-177` |
| `educar_quadro_horario_lst` | Grade semanal visual da turma | 🟢 `educar_quadro_horario_lst.php:45-275` |
| `educar_quadro_horario_horarios_cad` (834 linhas) | Aulas por slot, rascunho e gravação | 🟢 `educar_quadro_horario_horarios_cad.php:1-834` |
| `educar_quadro_horarios_pesquisas.php` | Filtros de instituição/escola/curso/série/ano/turma (include) | 🟢 |
| `clsPmieducarQuadroHorario` / `...Horarios` / `...HorariosAux` | CRUD legado das três tabelas | 🟢 `ieducar/intranet/include/pmieducar/*.inc.php` |
| `Portabilis_Business_Professor` | Filtros docente derivados do quadro (flag) | 🟢 `ieducar/lib/Portabilis/Business/Professor.php:3-384` |
| `educar_pesquisa_servidor_lst` | Validador de capacidade contra a alocação | 🟢 `:415-470` |
| `educa_pesquisa_servidor` (EmployeeBuilder) | Filtros de servidor multi-sériado | 🟢 `:471-490` |

### Domínio

O domínio é a **distribuição semanal de aulas**: cabeçalho único por turma-ano, slots por dia e intervalo com componente e docente, mais o rascunho transitório por sessão. O quadro também é a fonte de "onde o professor leciona" para os lançamentos, quando a instituição exige vínculo por turma. 🟢 migrações e `Professor.php:370-374`

### Endpoints/telas legadas

| Rota | Uso | Fonte |
|------|-----|-------|
| `educar_quadro_horario_lst.php` (filtros `busca=S`) | Lista e visualiza a grade da turma | 🟢 `educar_quadro_horario_lst.php` |
| `educar_quadro_horario_cad.php` | Cria/exclui cabeçalho | 🟢 `educar_quadro_horario_cad.php:17-186` |
| `educar_quadro_horario_horarios_cad.php` | Inclui/edita/exclui aulas (POST serializado + rascunho aux) | 🟢 `educar_quadro_horario_horarios_cad.php` |
| dropdowns dinâmicos (`DynamicInput`) | Componente/turma/série/curso do professor via quadro | 🟢 `modules/DynamicInput/Views/*.php` |

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `Novo()` (educar_quadro_horario_cad) | Recusa duplicidade por turma/ano; grava cabeçalho | 🟢 `:97-127` |
| `Excluir()` (cad) | Desativa aulas em bloco e inativa cabeçalho | 🟢 `:155-186` |
| `retornaHorario()` | Slots por dia com turma/instituição/escola/série ativos | 🟢 `clsPmieducarQuadroHorarioHorarios.php:613-669` |
| `cadastra()/edita()` (horarios) | Insert/update com `ativo`; edita zera substituto quando ausente | 🟢 `:160-304` |
| `excluirTodos()` | `UPDATE SET ativo = 0` marcando por quadro | 🟢 `clsPmieducarQuadroHorarioHorarios.php:671-682` |
| `cadastra()/excluiRegistro()/excluirTodos()/excluirRegistrosAntigos()` (aux) | Rascunho por identificador + limpeza de 3 h | 🟢 `clsPmieducarQuadroHorarioHorariosAux.php:68`, `:365-405` |
| `necessarioVinculoTurma()` | Lê `exigir_vinculo_turma_professor` da instituição | 🟢 `Professor.php:370-374` |
| `escolasAlocado()/cursosAlocado()/seriesAlocado()/turmasAlocado()/componentesCurricularesAlocado()` | Derivações do quadro ou da alocação | 🟢 `Professor.php:51-345` |

---

## Fluxo Principal

**Montagem da grade de horários de uma turma.**

1. Secretaria abre "Quadros de horários" (menu Servidores) com filtros de instituição, escola, curso, série, ano e turma. 🟢 `educar_quadro_horario_lst.php:45-115`
2. Com busca, a tela renderiza a matriz DOM–SAB com os slots por `retornaHorario`, indicando o docente efetivo (substituto substitui o titular na exibição). 🟢 `:124-215`, `educar_quadro_horario_lst.php:156`, `:190`
3. "Novo quadro" cria o cabeçalho (um ativo por turma/ano). 🟢 `educar_quadro_horario_cad.php:97-127`
4. Na tela de horários, secretaria escolhe componente (ou "todas as disciplinas"), dia, hora inicial/final e servidor; a inclusão entra no estado serializado e no rascunho aux. 🟢 `educar_quadro_horario_horarios_cad.php:204-340`
5. Ao gravar, o backend percorre o estado: novas aulas → `cadastra()`; editadas → `edita()` (zera substituto se ausente); excluídas → `ativo = 0`; no fim, apaga o rascunho por identificador. 🟢 `:549-652`, `:654-797`, `:799-822`

---

## Fluxos Alternativos

- **Rascunho órfão:** qualquer abertura sem POST e o `cadastra()` da própria aux apagam rascunhos do identificador e os antigos (3 h). 🟢 `:92-94`, `clsPmieducarQuadroHorarioHorariosAux.php:68`, `:399-405`
- **Replicação por componentes:** "todas as disciplinas" gera um slot por componente da série/turma com o mesmo docente e intervalo. 🟢 `:554-612`
- **Cabeçalho excluído:** desativa todas as aulas (`ativo = 0`) e inativa o quadro, com autor e data. 🟢 `educar_quadro_horario_cad.php:155-186`
- **Filtro docente para o diário:** com a bandeira ligada e usuário "somente professor", os dropdowns derivam do quadro (escolas, cursos, séries, turmas, componentes); sem a bandeira, da alocação/amplitude de oferta. 🟢 `Professor.php:51-345`
- **Pesquisa de servidor:** capacidade semanal checada contra horários ativos (mais rascunho) no intervalo, tolerante a multi-sériado. 🟢 `educar_pesquisa_servidor_lst.php:415-470`
- **Bug de exclusão:** o `Excluir()` da tela de horarios apaga dia de calendário e redireciona para anotações do calendário (código copiado de outra tela). 🟡 `educar_quadro_horario_horarios_cad.php:799-822`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `Servidores` | Servidor, alocação (capacidade), funções (professor), afastamento/substituição formal | Entradas | 🟢 `Professor.php:5-49`, `educar_pesquisa_servidor_lst.php:415-470` |
| `Configuracao` | Bandeira `exigir_vinculo_turma_professor` (tabela `instituicao`) | Entrada | 🟢 `Professor.php:370-374` |
| `ComponenteCurricular` | Componentes por série/turma para slots e replicação | Entrada | 🟢 `educar_quadro_horario_horarios_cad.php:204-232`, `Professor.php:258-345` |
| `SchoolClass` / `Stages` / `School` / `AcademicYear` | Turma, série, escola, ano | Entradas | 🟢 migrações FKs e filtros |
| `DiarioClasse` / `Avaliacao` | Consumem os filtros derivados do quadro | Consumidor | 🟢 `DiarioController.php:12`, `DynamicInput/*` |
| `People` | Nome do servidor via `LegacyPerson` | Entrada | 🟢 `educar_quadro_horario_horarios_cad.php:356-359` |
| `Calendario` | Compartilha a média por turnos da tela (campos `min_mat/min_ves/min_not` possíveis resíduos) | — | 🟡 `:50-62`, `:533-535` |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Um quadro por turma-ano, sem versionamento, checado por consulta ad hoc. | `educar_quadro_horario_cad.php:99-105` | 🟢 |
| Slots como linhas independentes com chave (quadro, sequencial), sem chave de unicidade por turma/dia/hora. | migração | 🟢 |
| Rascunho em tabela auxiliar compartilhada por identificador, com TTL de 3 horas. | `_aux` e `:92-94` | 🟢 |
| Estado do formulário em campo serializado (padrão legado da época). | `:279-281` | 🟢 |
| Gravações slot a slot, sem transação, com mensagem completa por slot não seguida de rollback. | `:549-652` | 🟡 |
| Sem detecção de sobreposição (nem turma, nem professor): único controle é capacidade semanal na pesquisa de servidor. | busca no módulo | 🔴 |
| Bandeira institucional decide fonte dos filtros do professor (quadro vs alocação). | `Professor.php:370-374` | 🟢 |
| Substituição formal pertence ao afastamento da unidade `Servidores`; no quadro fica só a sobreposição pontual. | `educar_servidor_afastamento_cad.php:226` | 🟢 |

---

## Estado Interno

- Cabeçalho: `ativo` binário com autor/data; sem situação (rascunho/publicado), sem versão. 🟢 migração
- Slots: `ativo` binário; `data_exclusao` só na edição concreta; substituto sobressai só na exibição da listagem. 🟡 `clsPmieducarQuadroHorarioHorarios.php:244-304`, `educar_quadro_horario_lst.php:156`
- Aux: sem `ativo`, apagada fisicamente; identificador de no máximo 30 caracteres. 🟢 migração `_aux`

---

## Observabilidade

- Sem trilha de quem alterou aulas individualmente (apenas datas). 🟡
- Falhas de gravação mostram mensagem genérica "Cadastro não realizado"; sem detalhe ou log. 🟡 `:649-651`
- Nenhum registro de validação de choque (inexistente) → risco sem instrumentação no legado. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Choque sobreposto não detectado | Turma com duas aulas no mesmo intervalo e professor em duas turmas simultâneas jamais são recusados; dependência silenciosa de disciplina humana. | busca no módulo | 🔴 |
| `unserialize` de `$_POST` | Manipulação do campo oculto pode instanciar objetos (padrão inseguro); no novo fluxo, estado tipado. | `educar_quadro_horario_horarios_cad.php:279-281`, `:550` | 🔴 |
| Gravação sem transação | Grade parcial em falha; rascunho sobrevive e reaparece na tela. | `:549-652` | 🟡 |
| Bug de copiar/colar no `Excluir()` da tela de horários | Apaga `LegacyCalendarDay` de calendário alheio. | `:799-822` | 🟡 |
| `ano` opcional no banco | Quadro sem ano vira órfão de filtro; tornar obrigatório no alvo. | migração | 🟡 |
| `min_mat/min_ves/min_not` vestigiais | Campos presentes mas nunca calculados na tela de horários. | `:50-62`, `:533-535` | 🟡 |
| Duplicidade por corrida | Checagem ad hoc sem constraint única (turma, ano, ativo). | `educar_quadro_horario_cad.php:99-105` | 🟡 |
| Bastão pressupões versions/choque | Suportar versionamento, publicação e detector global será obra nova. | `_reversa_sdd/QuadroHorario/legacy-mapping.md:19-23`, `:86-98` | 🔴 |
