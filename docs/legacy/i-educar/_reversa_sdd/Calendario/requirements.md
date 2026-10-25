# Calendario (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de calendário escolar legado faz: manter o cabeçalho do calendário do ano letivo por escola, marcar dias como extra letivos ou não letivos com motivo e descrição, marcar turmas com dias extra letivos específicos e registrar anotações por dia, com a grade mensal de consulta.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema Calendario do i-Educar mantém o calendário do ano letivo de cada escola: um cabeçalho por escola e ano, as marcações de dias (motivo, descrição, turmas), os motivos com o tipo extra letivo ou não letivo e as anotações por dia, tudo consultado em uma grade mensal colorida. 🟢 `ieducar/intranet/educar_calendario_*.php`

Problema que resolve: distinguir, por escola e por ano, os dias letivos dos não letivos e dos dias extra letivos por turma, derivando o início e o término do ano letivo das etapas, para a consulta visual da rede. 🟢

Observação estrutural: o legado **não computa** os dias letivos e **não bloqueia** lançamentos em dias não letivos por esta extração: o consumo das tabelas do calendário foi localizado somente nas telas do próprio módulo, e a validação legal dos 200 dias da LDB não existe em código executável. 🔴 `_reversa_sdd/Calendario/legacy-mapping.md:76-83` e busca de consumo confirmada

As tabelas legadas são `pmieducar.calendario_ano_letivo`, `pmieducar.calendario_dia`, `pmieducar.calendario_dia_motivo`, `pmieducar.calendario_anotacao`, `pmieducar.calendario_dia_anotacao` e `modules.calendario_turma`, acessadas pelos modelos Eloquent e por um modelo do framework `CoreExt`. 🟢 `app/Models/LegacyCalendar*.php` e `ieducar/modules/Calendario/Model/TurmaDataMapper.php:7-9`

---

## Responsabilidades

- Listar os calendários por escola com a grade mensal interativa, com navegação de mês e ano pelas sessões. 🟢 `ieducar/intranet/educar_calendario_ano_letivo_lst.php:111-140` e `:164-196`
- Registrar o cabeçalho do calendário por escola e ano, recusando a marcação quando a escola não tem datas de início e de término definidas nas etapas. 🟢 `ieducar/intranet/educar_calendario_ano_letivo_cad.php:107-165`
- Derivar o início e o término do ano letivo das datas mínima e máxima das etapas de ano letivo. 🟢 `educar_calendario_ano_letivo_cad.php:112-113` e `educar_calendario_ano_letivo_lst.php:178-179`
- Marcar um dia com motivo, descrição e turmas, com o tipo do motivo decidindo se é dia extra letivo ou não letivo. 🟢 `ieducar/intranet/educar_calendario_dia_cad.php:222-273`
- Sincronizar as turmas marcadas com o dia, apagando as desmarcadas e inserindo as novas. 🟢 `educar_calendario_dia_cad.php:300-336`
- Manter os motivos com nome, sigla, descrição e tipo. 🟢 `ieducar/intranet/educar_calendario_dia_motivo_cad.php:88-129`
- Manter as anotações por dia, criando o registro do dia quando inexistente, e o vínculo entre anotação e dia. 🟢 `ieducar/intranet/educar_calendario_anotacao_cad.php:92-137`
- Reparar a predefinição de dias letivos e não letivos na grade, com legendas por cor: extra letivo em laranja escuro, não letivo em verde escuro, início e término em amarelo e dias letivos em azul claro. 🟢 `educar_calendario_ano_letivo_lst.php:238-370`
- Excluir o cabeçalho do calendário, o dia, o motivo e a anotação, sem verificação de vínculos localizada. 🟢 `educar_calendario_ano_letivo_cad.php:198-215` e `educar_calendario_dia_cad.php:358-376`
- Fornecer as seleções dinâmicas de instituição, escola, ano e mês usadas nas telas. 🟢 `ieducar/intranet/educar_calendario_pesquisas.php`

---

## Regras de Negócio

- O calendário é por escola e por ano, com a existência exigida antes das marcações. 🟢 `educar_calendario_ano_letivo_lst.php:50-58`
- O dia é identificado por três inteiros: mês, dia e o ano do calendário, e não por uma data. 🟢 `app/Models/LegacyCalendarDay.php:23-34`
- O motivo tem o tipo 'e' (extra) ou 'n' (não-letivo), exibidos como "Dia Extra-Letivo" e "Dia Não Letivo". 🟢 `educar_calendario_dia_motivo_cad.php:84-85` e `educar_calendario_ano_letivo_lst.php:238`
- O motivo não é obrigatório na marcação do dia; a descrição é obrigatória. 🟢 `educar_calendario_dia_cad.php:195-201` e `:219`
- As turmas marcadas com o dia formam a variação de dias extra letivos por turma, com a chave composta de calendário, ano, mês, dia e turma. 🟢 `ieducar/modules/Calendario/Model/TurmaDataMapper.php:11-25`
- As marcações de turmas são sincronizadas na edição: as ausentes na requisição são apagadas e nas já marcadas são mantidas. 🟢 `educar_calendario_dia_cad.php:321-336`
- A criação de anotação em dia sem registro cria o registro do dia com a descrição vazia. 🟢 `educar_calendario_anotacao_cad.php:97-113`
- O ano letivo é derivado das etapas: a data de início é a menor `data_inicio` e a de término a maior `data_fim` das etapas da escola no ano. 🟢 `educar_calendario_ano_letivo_cad.php:112-113`
- Sem início e término definidos, a marcação do cabeçalho é recusada com alerta em script. 🟢 `educar_calendario_ano_letivo_cad.php:162-164`
- Antes do início e depois do término do ano letivo todos os dias do mês são apresentados como não letivos, e nos meses de início e de término apenas os dias fora do intervalo. 🟢 `educar_calendario_ano_letivo_lst.php:305-362`
- Os fins de semana são coloridos de rosa na grade, com o domingo e o sábado indicados. 🟢 `educar_calendario_ano_letivo_lst.php:194-197` e `:372-375`
- As marcações do calendário ficam em sessão para a navegação entre telas. 🟢 `educar_calendario_ano_letivo_lst.php:164-170` e `educar_calendario_anotacao_lst.php:61-66`
- A permissão do calendário é o processo 620 e a dos motivos é o processo 576, ambos com soma de nível 7. 🟢 `educar_calendario_ano_letivo_cad.php:44` e `educar_calendario_dia_motivo_cad.php:42`
- Os dias sem motivo, mas com descrição, aparecem na grade com a descrição e o botão de anotações. 🟢 `educar_calendario_ano_letivo_lst.php:287-297`
- A listagem só é acessível ao usuário de nível até sete, com a mensagem de sem permissão. 🟢 `educar_calendario_ano_letivo_lst.php:45-64`
- A marcação de turmas com o dia é apagada e reinserida a cada salvamento, com o registro do usuário autenticado nos cabeçalhos e nos dias. 🟢 `educar_calendario_dia_cad.php:244-253` e `educar_calendario_ano_letivo_cad.php:127-146`
- A exclusão do cabeçalho, do dia, do motivo e da anotação é direta, sem verificação de vínculos por esta extração. 🔴
- Não existe trilha de auditoria além dos usuários de registro e de exclusão. 🔴
- Não existe, no legado, cômputo dos dias letivos nem bloqueio de lançamento em dias não letivos por esta extração. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve manter o calendário por escola e ano, com a recusa quando as datas de início e de término das etapas não existirem. | Must | Dado uma escola sem etapas com datas, quando o calendário é gravado, então a gravação é recusada com a mensagem. |
| RC-02 | O sistema deve marcar os dias com motivo, descrição e turmas, com o tipo do motivo decidindo a classe do dia. | Must | Dado um dia marcado com motivo não letivo, quando consultado, então o dia aparece como não letivo. |
| RC-03 | O sistema deve sincronizar as turmas marcadas com o dia por chave composta. | Must | Dado três turmas marcadas e duas removidas, quando gravado, então as duas saem e as demais se mantêm. |
| RC-04 | O sistema deve manter os motivos com nome, sigla, descrição e tipo. | Must | Dado um motivo criado com sigla, quando consultado, então os campos são devolvidos. |
| RC-05 | O sistema deve manter as anotações por dia, com a criação do dia inexistente na hora. | Must | Dado uma anotação em dia sem marcação, quando gravada, então o dia é criado e a anotação vinculada. |
| RC-06 | O sistema deve renderizar a grade mensal com as cores por classe de dia e as legendas por marcação. | Must | Dado um mês com um feriado e um dia extra letivo por turma, quando aberto, então os dois aparecem com as legendas. |
| RC-07 | O sistema deve preparar os dias fora do intervalo do ano letivo como não letivos. | Should | Dado um mês anterior ao início, quando aberto, então todos os dias aparecem como não letivos. |
| RC-08 | O sistema deve excluir cabeçalhos, dias, motivos e anotações. | Must | Dado um motivo não usado, quando excluído, então o registro sai da base. |
| RC-09 | O sistema deve computar e apresentar os dias letivos do ano com a validação dos 200 dias da LDB na publicação do calendário. | Should | Dado um calendário com 190 dias letivos, quando publicado, então a publicação é recusada com o diagnóstico. 🔴 |
| RC-10 | O sistema deve bloquear o lançamento de frequência em dias não letivos pelo diário de classe. | Should | Dado um lançamento em feriado, quando gravado, então a gravação é recusada. 🔴 |
| RC-11 | O sistema deve permitir a importação do calendário da rede pela secretaria, com cópia atômica dos dias e feriados para a escola. | Should | Dado o calendário padrão da rede publicado, quando importado, então a escola recebe os dias com a possibilidade de acrescentar os próprios. 🔴 |
| RC-12 | O sistema deve restringir as telas do calendário ao processo 620 e às dos motivos ao 576, com a soma de nível sete. | Must | Dado um usuário sem permissão, quando a tela é aberta, então o acesso é negado. |
| RC-13 | O sistema deve manter a trilha de auditoria das marcações do calendário, com autor, instante, valor anterior e novo valor. | Should | Dado uma troca de motivo do dia, quando a trilha é consultada, então a troca aparece registrada. 🔴 |
| RC-14 | O sistema deve representar o dia por data ISO com a indicação de dia letivo, e não por três inteiros. | Should | Dado a migração dos dias, quando executada, então cada dia tem data única e a bandeira de letivo. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | As telas exigem os processos 620 e 576 com soma de nível sete, e a listagem bloqueia o usuário acima do nível sete. | `educar_calendario_ano_letivo_lst.php:45-64` e `educar_calendario_ano_letivo_cad.php:44` | 🟢 |
| Integridade | A sincronização de turmas do dia é idempotente, com exclusão e inserção por diferença e interseção. | `educar_calendario_dia_cad.php:321-336` | 🟢 |
| Integridade | A criação do dia na anotação evita a duplicidade do registro do dia pela existência prévia. | `educar_calendario_anotacao_cad.php:97-113` | 🟢 |
| Integridade | A criação do dia chama `save()` duas vezes em sequência, dobrando a escrita sem rollback. | `educar_calendario_dia_cad.php:240-242` | 🟢 |
| Usabilidade | A grade mensal é a navegação central, com as marcações e anotações acessíveis pelo dia. | `educar_calendario_ano_letivo_lst.php:190-303` | 🟢 |
| Usabilidade | Os redirecionamentos das marcações de dia apontam para a listagem de anotações, e não de calendário. | `educar_calendario_dia_cad.php:122` e `:156-162` | 🟢 |
| Observabilidade | Não há log estruturado, métricas nem trilha de auditoria. | ausência de evidência no código lido | 🔴 |
| Conformidade | A exigência da LDB de 200 dias e 800 horas não é verificada em código executável. | `_reversa_sdd/Calendario/legacy-mapping.md:10-16` e `:76-83` | 🔴 |
| Multi-tenancy | O calendário é por escola no legado; o modelo novo admite o calendário padrão da rede com escola nula. | `_reversa_sdd/Calendario/legacy-mapping.md:24` | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado uma escola sem etapas com datas de início e término
Quando o calendário do ano letivo é gravado
Então a gravação é recusada com o alerta de datas ausentes

Dado um dia marcado como não letivo com motivo e turmas
Quando a grade mensal é aberta
Então o dia aparece com a legenda de não letivo e as turmas relacionadas

Dado três turmas marcadas com um dia
Quando duas são desmarcadas na edição
Então as duas relações são apagadas e a terceira se mantém

Dado uma anotação em dia sem registro
Quando gravada
Então o registro do dia é criado e a anotação vinculada

Dado um motivo do tipo extra letivo
Quando o dia aparece na grade
Então a legenda de extra letivo é renderizada

Dado um mês anterior ao início do ano letivo
Quando a grade é aberta
Então todos os dias aparecem como não letivos

Dado um calendário com menos de 200 dias letivos
Quando a publicação é tentada
Então a publicação é recusada com o diagnóstico dos dias faltantes 🔴

Dado um lançamento de frequência em dia não letivo
Quando gravado
Então o lançamento é recusado 🔴

Dado um usuário sem a permissão do processo 620
Quando a tela é aberta
Então o acesso é negado
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Calendário por escola e ano, com a recusa sem etapas datadas | Must | Base das marcações |
| Marcações de dia com motivo, descrição e turmas | Must | Classificação dos dias |
| Motivos com tipo extra letivo e não letivo | Must | Semântica da marcação |
| Anotações por dia com vínculo N:N | Must | Registros da escola por dia |
| Grade mensal colorida | Must | Navegação central |
| Exclusões dos quatro registros | Must | Ciclo de vida |
| Sincronização idempotente de turmas | Must | Coerência das marcações |
| Cômputo dos dias letivos e validação dos 200 dias | Must | Exigência da LDB ausente no legado 🔴 |
| Bloqueio de lançamento em dias não letivos | Must | Conexão com o diário eletrônico 🔴 |
| Calendário padrão da rede e importação | Should | Governança central prevista no modelo novo 🔴 |
| Data ISO com bandeira de letivo | Should | Migração do modelo triple inteiro 🔴 |
| Trilha de auditoria das marcações | Should | Ausente no legado e previsto 🔴 |
| Representação visual preservada das cores | Could | Paridade de apresentação |

> Prioridade inferida pela transição do legado de consulta visual para o motor de governança previsto no modelo novo.

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `ieducar/intranet/educar_calendario_ano_letivo_lst.php` | Grade mensal e listagem dos calendários | 🟢 |
| `ieducar/intranet/educar_calendario_ano_letivo_cad.php` | Cabeçalho do calendário | 🟢 |
| `ieducar/intranet/educar_calendario_dia_cad.php` | Marcação de dias com motivo e turmas | 🟢 |
| `ieducar/intranet/educar_calendario_anotacao_lst.php` | Listagem de anotações do dia | 🟢 |
| `ieducar/intranet/educar_calendario_anotacao_cad.php` | Criação e edição de anotações | 🟢 |
| `ieducar/intranet/educar_calendario_anotacao_det.php` | Detalhe da anotação | 🟡 |
| `ieducar/intranet/educar_calendario_dia_motivo_lst.php` | Listagem de motivos | 🟢 |
| `ieducar/intranet/educar_calendario_dia_motivo_det.php` | Detalhe do motivo | 🟡 |
| `ieducar/intranet/educar_calendario_dia_motivo_cad.php` | Cadastro de motivos | 🟢 |
| `ieducar/intranet/educar_calendario_pesquisas.php` | Seleções dinâmicas das telas | 🟢 |
| `ieducar/modules/Calendario/Model/Turma.php` | Entidade da turma extra letiva | 🟢 |
| `ieducar/modules/Calendario/Model/TurmaDataMapper.php` | Persistência em `modules.calendario_turma` | 🟢 |
| `app/Models/LegacyCalendarYear.php` | Modelo do cabeçalho | 🟢 |
| `app/Models/LegacyCalendarDay.php` | Modelo do dia | 🟢 |
| `app/Models/LegacyCalendarDayReason.php` | Modelo do motivo | 🟢 |
| `app/Models/LegacyCalendarNote.php` | Modelo da anotação | 🟢 |
| `app/Models/LegacyCalendarDayNote.php` | Modelo do vínculo dia e anotação | 🟢 |
| `app/Support/View/MonthCalendar.php` | Grade mensal da listagem | 🟢 |
| `app/Models/LegacyAcademicYearStage.php` | Datas de início e término do ano letivo | 🟢 |
| `pmieducar.calendario_ano_letivo` | Tabela do cabeçalho | 🟢 |
| `pmieducar.calendario_dia` | Tabela do dia | 🟢 |
| `pmieducar.calendario_dia_motivo` | Tabela do motivo | 🟢 |
| `pmieducar.calendario_anotacao` | Tabela da anotação | 🟢 |
| `pmieducar.calendario_dia_anotacao` | Tabela do vínculo | 🟢 |
| `modules.calendario_turma` | Tabela da turma extra letiva | 🟢 |
| `_reversa_sdd/Calendario/legacy-mapping.md` | Desenho de migração para o modelo novo | 🟢 |
