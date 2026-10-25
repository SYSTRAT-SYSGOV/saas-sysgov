# Calendario (i-Educar legado), Design

> Como o subsistema de calendário escolar está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `clsListagem` (ano letivo lst) | Grade mensal e listagem dos calendários | 🟢 `ieducar/intranet/educar_calendario_ano_letivo_lst.php:11-45` |
| `clsCadastro` (ano letivo cad) | Cabeçalho do calendário | 🟢 `ieducar/intranet/educar_calendario_ano_letivo_cad.php:9-35` |
| `clsCadastro` (dia cad) | Marcação de dias com motivo e turmas | 🟢 `ieducar/intranet/educar_calendario_dia_cad.php:9-46` |
| `clsListagem` / `clsCadastro` (anotação) | Anotações por dia | 🟢 `ieducar/intranet/educar_calendario_anotacao_cad.php:9-37` |
| `clsCadastro` (motivo) | Cadastro de motivos | 🟢 `ieducar/intranet/educar_calendario_dia_motivo_cad.php:88-129` |
| `Calendario_Model_Turma` + `TurmaDataMapper` | Turmas extra letivas por dia em `modules.calendario_turma` | 🟢 `ieducar/modules/Calendario/Model/TurmaDataMapper.php:3-25` |
| `MonthCalendar` | Grade mensal com legendas e cores | 🟢 `educar_calendario_ano_letivo_lst.php:190-197` |
| Modelos Eloquent | Cabeçalho, dia, motivo, anotação e vínculo | 🟢 `app/Models/LegacyCalendar*.php` |

### Domínio

O domínio desta unit é a **temporalidade escolar**: a tipificação dos dias do ano letivo de cada escola como letivos, não letivos ou extra letivos por turma, e o registro textual dos dias. As datas de início e de término do ano letivo pertencem ao domínio das etapas do ano (`LegacyAcademicYearStage`) e são derivadas, e não gravadas, no calendário. A interação com o diário de classe e o cômputo dos dias letivos não existem no legado lido, e são previstas como motor de governança no modelo novo. 🟢 `educar_calendario_ano_letivo_cad.php:112-113` e `_reversa_sdd/Calendario/legacy-mapping.md:16-16`

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `educar_calendario_ano_letivo_lst.php` | Grade mensal e calendários por escola | 🟢 `educar_calendario_ano_letivo_lst.php:45-114` |
| `educar_calendario_ano_letivo_cad.php` | Cadastro e edição do cabeçalho | 🟢 `educar_calendario_ano_letivo_cad.php:35-105` |
| `educar_calendario_dia_cad.php` | Marcação de dia com motivo e turmas | 🟢 `educar_calendario_dia_cad.php:109-220` |
| `educar_calendario_anotacao_lst.php` | Anotações do dia | 🟢 `educar_calendario_anotacao_lst.php:43-112` |
| `educar_calendario_anotacao_cad.php` | Cadastro e edição de anotações | 🟢 `educar_calendario_anotacao_cad.php:37-90` |
| `educar_calendario_anotacao_det.php` | Detalhe da anotação | 🟡 `ieducar/intranet/educar_calendario_anotacao_det.php` |
| `educar_calendario_dia_motivo_lst.php` | Listagem de motivos | 🟢 `educar_calendario_dia_motivo_lst.php:65` |
| `educar_calendario_dia_motivo_det.php` | Detalhe do motivo | 🟡 `ieducar/intranet/educar_calendario_dia_motivo_det.php` |
| `educar_calendario_dia_motivo_cad.php` | Cadastro de motivos | 🟢 `educar_calendario_dia_motivo_cad.php:35-86` |

Processos de permissão: 620 no calendário e nos dias e anotações, 576 nos motivos, com soma de nível sete. 🟢 `educar_calendario_ano_letivo_cad.php:44` e `educar_calendario_dia_motivo_cad.php:42`

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `Inicializar()` por tela | Permissões, carga do registro e breadcrumb | 🟢 cada tela |
| `Gerar()` por tela | Campos e seleções dinâmicas | 🟢 cada tela |
| `Novo()` / `Editar()` / `Excluir()` por tela | Gravações e exclusões | 🟢 cada tela |
| `_hasEntry()` / `_getEntries()` (dia cad) | Consulta das turmas marcadas | 🟢 `educar_calendario_dia_cad.php:59-107` |
| `MonthCalendar::setLargura()` / `adicionarLegenda()` / `adicionarArrayDias()` | Montagem da grade | 🟢 `educar_calendario_ano_letivo_lst.php:190-370` |

---

## Fluxo Principal

**Abrir a grade do calendário e marcar um dia.**

1. O usuário abre a listagem, que carrega escola e ano da sessão ou do formulário, e inclui as seleções dinâmicas. 🟢 `educar_calendario_ano_letivo_lst.php:72-109`
2. A consulta dos calendários filtra por escola, pelo identificador e pelo ano conforme o nível do usuário. 🟢 `educar_calendario_ano_letivo_lst.php:111-138`
3. Para cada calendário, a escola, as etapas com as datas e as turmas são carregados, e a grade `MonthCalendar` é criada. 🟢 `educar_calendario_ano_letivo_lst.php:162-196`
4. Os dias marcados do mês são carregados, e cada um ganha tipo, motivo, descrição, turmas e o botão de anotações. 🟢 `educar_calendario_ano_letivo_lst.php:199-303`
5. Os dias fora do intervalo do ano letivo ganham a legenda de não letivos, e o meio do intervalo a de letivos. 🟢 `educar_calendario_ano_letivo_lst.php:305-370`
6. O usuário abre a marcação do dia, escolhe o motivo, digita a descrição e marca as turmas. 🟢 `educar_calendario_dia_cad.php:168-220`
7. Na gravação, o dia é criado ou editado e as turmas sincronizadas, com o redirecionamento para as anotações. 🟢 `educar_calendario_dia_cad.php:222-356`

---

## Fluxos Alternativos

- **Criação do cabeçalho:** existe na base, o registro é atualizado; caso contrário, criado com o usuário autenticado. 🟢 `educar_calendario_ano_letivo_cad.php:116-159`
- **Anotação em dia sem marcação:** o registro do dia é criado antes da anotação e do vínculo. 🟢 `educar_calendario_anotacao_cad.php:97-129`
- **Troca de motivo e turma na edição do dia:** os dados são substituídos, e as turmas sincronizadas por diferença. 🟢 `educar_calendario_dia_cad.php:275-336`
- **Exclusões:** cabeçalho, dia, motivo e anotação são excluídos diretamente, sem verificação de vínculos localizada. 🔴
- **Ano sem calendário:** a listagem mostra a mensagem de sem calendário para o ano. 🟢 `educar_calendario_ano_letivo_lst.php:140-158`

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `LegacyAcademicYearStage` | Derivação do início e do término do ano letivo | Saída | 🟢 `educar_calendario_ano_letivo_cad.php:112-113` |
| `App_Model_IedFinder::getTurmas()` | Lista de turmas da escola para as marcações | Saída | 🟢 `educar_calendario_dia_cad.php:205` |
| `clsPermissoes` | Permissões dos processos 620 e 576 | Saída | 🟢 cada tela |
| Sessão | Estado de navegação do calendário | Interna | 🟢 `educar_calendario_ano_letivo_lst.php:164-170` |
| Banco de dados | `pmieducar.calendario_*` e `modules.calendario_turma` | Saída | 🟢 modelos e mapper |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| A temporalidade do dia é o triplo de inteiros mês, dia e cabeçalho, e não uma data. | `app/Models/LegacyCalendarDay.php:30-31` | 🟢 |
| A classe do dia vem do motivo, com o tipo binário 'e' de extra e 'n' de não letivo. | `educar_calendario_dia_motivo_cad.php:84-85` e `educar_calendario_ano_letivo_lst.php:238` | 🟢 |
| As datas de início e término do ano letivo são derivadas das etapas, e não gravadas no calendário. | `educar_calendario_ano_letivo_cad.php:112-113` | 🟢 |
| A variação de dias extra letivos por turma é uma tabela própria com chave composta. | `ieducar/modules/Calendario/Model/TurmaDataMapper.php:19-25` | 🟢 |
| A navegação do calendário é mantida em sessão, com a marcação do calendário aberto. | `educar_calendario_ano_letivo_lst.php:164-170` | 🟢 |
| A anotação gera o dia quando não existe, com a descrição vazia e o usuário autenticado. | `educar_calendario_anotacao_cad.php:97-113` | 🟢 |
| Os redirecionamentos da marcação de dia apontam para a listagem de anotações, o que traz a exclusão da marcação para o mesmo lugar. | `educar_calendario_dia_cad.php:122` e `:156-165` | 🟢 |
| As exclusões são diretas e sem verificação de vínculos. | `educar_calendario_ano_letivo_cad.php:198-215` | 🟢 |
| A camada de persistência é híbrida: modelos Eloquent nas telas, e o modelo `CoreExt` para a tabela de turmas. | `TurmaDataMapper.php` e telas | 🟢 |

---

## Estado Interno

- A sessão mantém o calendário, a escola, a instituição, o ano e o mês da navegação. 🟢 `educar_calendario_ano_letivo_lst.php:84-89`
- As propriedades públicas das telas espelham as colunas das tabelas. 🟢 cada tela
- A grade `MonthCalendar` acumula legendas coloridas por classe de dia. 🟢 `educar_calendario_ano_letivo_lst.php:238-370`

---

## Observabilidade

- Não há log estruturado de marcação do calendário. 🔴
- As falhas são devolvidas como mensagens na tela ou alertas em script. 🟢 `educar_calendario_ano_letivo_cad.php:162-164`
- Não há métricas nem trilha de auditoria. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| Cômputo dos 200 dias ausente | Não existe verificação executável da exigência da LDB de dias letivos e carga horária. | `_reversa_sdd/Calendario/legacy-mapping.md:76-83` e busca de consumo | 🔴 |
| Sem integração com o diário | As tabelas do calendário não são consumidas fora do módulo por esta extração; nenhum bloqueio de lançamento existe. | busca de consumo confirmada | 🔴 |
| Dupla gravação do dia | A criação do dia chama `save()` em sequência, dobrando a escrita sem rollback. | `educar_calendario_dia_cad.php:240-242` | 🟢 |
| Exclusões sem verificação de vínculos | A exclusão do motivo, do cabeçalho e do dia não confere marcações em uso nem anotações vinculadas. | `educar_calendario_dia_motivo_cad.php:131-139` | 🔴 |
| Redirecionamentos trocados | A marcação de dia usa os redirecionamentos da listagem de anotações, com a permissão também da tela de anotações. | `educar_calendario_dia_cad.php:122` e `:229` | 🟢 |
| Sessão para navegação | O estado de navegação em sessão não é auditável. | `educar_calendario_ano_letivo_lst.php:84-89` | 🟡 |
