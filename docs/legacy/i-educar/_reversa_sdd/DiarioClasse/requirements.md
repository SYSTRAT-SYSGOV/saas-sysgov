# DiarioClasse (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema do diário de classe e frequência faz: lançamento de faltas por turma e por matrícula, consolidação de faltas por etapa com regime geral ou por componente, cálculo de frequência por funções de banco, travas de lançamento em camadas e o registro de faltas e atrasos do servidor com compensação.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O subsistema de diário do legado é de **lançamento consolidado por etapa**, e não de diário atômico diário: não existem aulas ministradas com chamada por aula, conteúdos programáticos, habilidades da BNCC, atestados de aluno com vigência ou alertas de evasão. Os quatro elementos que o bastão desenha como novas tabelas (`educa_class_lessons`, `educa_attendance_records`, `educa_absence_justifications` e parte de `educa_stage_absence_summaries`) não têm paralelo table-to-table no legado; apenas os totais consolidados de faltas e as funções de frequência são herdados. 🟢 busca de consumo e módulos (`conteudo_ministrado`, `aula_reposicao`, `compens` no `modules/`: nenhum resultado) contra `_reversa_sdd/DiarioClasse/legacy-mapping.md:19-23`

O que o legado tem de fato:

- O hub "Lançamento por turma" (processo 642), com grade de matrículas por turma e componentes. 🟢 `ieducar/modules/Avaliacao/Views/DiarioController.php:5-37`
- O lançamento de falta por matrícula e etapa (tela individual), com regime geral ou por componente decidido pela regra de avaliação. 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:5-163`
- O backend AJAX de notas, faltas e pareceres da grade. 🟢 `ieducar/modules/Avaliacao/Views/DiarioApiController.php:399-757`
- As tabelas `modules.falta_aluno`, `modules.falta_geral` e `modules.falta_componente_curricular` com totais por etapa. 🟢 `database/migrations/legacy/2020_01_01_110000_create_modules_falta_aluno_table.php` e afins
- As funções de banco de frequência da matrícula e por componente. 🟢 `database/sqls/functions/modules.frequencia_da_matricula.sql` e `modules.frequencia_por_componente.sql`
- Travas em camadas: bandeira de diários encerrados por escola, janela institucional do bloqueio do ano letivo, período de lançamento por escola, etapa e tipo de etapa com permissão de exceção `POST_OUT_PERIOD`, obrigação de faltas anteriores e recusa de remoção com faltas em etapas posteriores. 🟢 `DiarioApiController.php:37-72`, `:287-309`, `:135`, `:252-274`
- O registro de faltas e atrasos **do servidor** (professor), com flag justificada e períodos compensados,-documentado por referência na unit `Servidores`. 🟢 `ieducar/intranet/educar_falta_atraso_cad.php:87` e migrações `create_pmieducar_falta_atraso_table`

Achado de correção de escopo: o bastão da unit anterior (`Configuracao`) descreve o motor de bloqueios com exceção auditável como requisito novo; o legado já tem a permissão `Process::POST_OUT_PERIOD` (999849) que libera o operador da janela de período de lançamento, além dos períodos de lançamento por escola, etapa e tipo de etapa com a etapa resolvida pela turma. 🔴 `DiarioApiController.php:287-299`, `app/Process.php:71` e `app/Services/ReleasePeriodService.php:22-53`

---

## Responsabilidades

- Apresentar o hub de lançamento por turma com filtros por instituição, escola, curso, série, turma, etapa, componente e matrícula opcional, com componente obrigatório quando o usuário é professor. 🟢 `DiarioController.php:11-17`
- Configurar a navegação do cursor entre horizontal e vertical, e informar o botão de replicação configurável pela chave `legacy.app.faltas_notas.mostrar_botao_replicar`. 🟢 `DiarioController.php:19-34`
- Listar as matrículas da turma para a grade, com as enturmações ativas, a última enturmação por sequencial, e mantendo visíveis as movimentadas após a data base de remanejamento da instituição. 🟢 `DiarioApiController.php:810-892`
- Ordenar as matrículas pelo sequencial de fechamento e, em empate, pelo nome. 🟢 `DiarioApiController.php:885-892`
- Lançar, alterar e remover a falta por média geral ou por componente conforme `tipo_presenca` da regra de avaliação. 🟢 `DiarioApiController.php:610-633`, `:733-757` e `FaltaController.php:85-91`, `:151-163`
- Consolidar os totais por etapa em `modules.falta_geral` (regime geral) e `modules.falta_componente_curricular` (regime por componente), ligadas à mestre `modules.falta_aluno` única por matrícula. 🟢 migrações das três tabelas
- Calcular a porcentagem de frequência por SQL de banco para a matrícula e por componente, com fallback entre carga da turma, da série e do curso. 🟢 `modules.frequencia_da_matricula.sql`, `modules.frequencia_por_componente.sql` e `ieducar/modules/Api/Views/MatriculaController.php:497-503`
- Guardar as faltas e atrasos do servidor com flag "justificada" e períodos compensados por escola e intervalo de datas (por referência, unit `Servidores`). 🟢 migrações `pmieducar.falta_atraso` e `pmieducar.falta_atraso_compensado` e telas do processo 635
- Bloquear lançamentos fora do período por escola, etapa e tipo de etapa, salvo quem tem a permissão 999849. 🟢 `DiarioApiController.php:287-309` e `app/Process.php:71`

---

## Regras de Negócio

### Regime de apuração de faltas

- O regime vem de `tipo_presenca` da regra de avaliação: gerolevaliacao geral (1) produz registros em `falta_geral`; por componente (2) produz em `falta_componente_curricular` e exige o componente no POST. 🟢 `DiarioApiController.php:613-622` e `FaltaController.php:85-91`, `:151-163`
- A mestre `modules.falta_aluno` é única por matrícula com a coluna `tipo_falta`, e as consolidações têm chave composta com a etapa. 🟢 migrações (`UNIQUE matricula_id`, `falta_geral_pkey`, `falta_componente_curricular_pkey`)
- A etapa é texto curto (varchar de dois caracteres) e aceita valores especiais de recuperação além dos números da etapa. 🟢 migrações e `FaltaController.php:128` (rótulo "Recuperação" para 'Rc'); o bastão converte etapa para `SMALLINT` sem tratar 'Rc'. 🔴

### Lançamento e remoção

- A tela individual oferece lista de 0 a 100 faltas por etapa; a API aceita qualquer inteiro com clamp somente de negativos para zero. 🟢 `FaltaController.php:135` e `DiarioApiController.php:1082-1091` (teto de 100 não aplicado na API, cap divergente entre as duas entradas). 🟡
- Quando não há registro da etapa na tela individual, a etapa sugerida é o total de etapas já registradas mais um. 🟢 `FaltaController.php:93`
- Para postar falta, todas as faltas das etapas anteriores daquele aluno ou componente devem existir. 🟢 `DiarioApiController.php:350-354` e `:135`
- Para remover falta, não pode haver faltas registradas em etapas posteriores, apontando um a um as etapas bloqueadoras na mensagem. 🟢 `DiarioApiController.php:379-384` e `:252-274`
- A remoção de registro inexistente devolve aviso e não erro. 🟢 `DiarioApiController.php:746-747`
- A gravação das faltas dispara a nova tentativa de promoção do aluno pelo serviço de boletim, silenciando as falhas de promoção manual ou em andamento. 🟢 `DiarioApiController.php:1071-1078` e `FaltaController.php:176-184` (consumo detalhado na unit `Avaliacao`)
- O parecer descritivo por etapa e por componente é lançado na mesma tela da falta quando a regra exige. 🟢 `FaltaController.php:138-140` e `:167-174`

### Travas de lançamento em camadas

- Primeira camada: permissão de alterar o diário (processo 642, nível 7) para postar; leitura da grade também exige os parâmetros completos. 🟢 `DiarioApiController.php:313-333` e `:1880-1887`
- Segunda camada: alteração do diário de anos letivos encerrados recusada pela bandeira da escola `bloquear_lancamento_diario_anos_letivos_encerrados`. 🟢 `DiarioApiController.php:48-52` (unit `School`)
- Terceira camada: janela institucional do `bloqueio_ano_letivo`, onde somente a data dentro da janela permitida lança; é a mesma usada para notas. 🟢 `DiarioApiController.php:54-69`
- Quarta camada: período de lançamento por escola, etapa e tipo de etapa do ano, cuja janela de datas deve conter a data atual; na ausência de vínculo, tudo fica liberado; a etapa 'Rc' e 'An' são resolvidas para a etapa máxima da turma. 🟢 `app/Services/ReleasePeriodService.php:22-53`
- Exceção real: o operador com a permissão do processo 999849 (POST_OUT_PERIOD) lança fora da janela de período. 🟢 `DiarioApiController.php:289` e `app/Process.php:71`
- A menssagem de bloqueio de período é única: "Não é permitido realizar esta alteração fora do período de lançamento de notas/faltas.". 🟢 `DiarioApiController.php:305`

### Seleção de matrículas na grade

- Somente contam a enturmação ativa mais recente por matrícula, antes da data base de remanejamento da instituição; movimentações após a base continuam visíveis quando transferidos, remanejados, reclassificados, com abandono ou falecido. 🟢 `DiarioApiController.php:824-870`
- A regra de avaliação e as tabelas de arredondamento vêm da turma pela série filtrada, carregando regra diferenciada por deficiência quando existir. 🟢 `DiarioApiController.php:898-914` (unit `RegraAvaliacao`)

### Cálculo de frequência

- No regime geral: (dias letivos da série − total de faltas gerais) × 100 ÷ dias letivos, truncado a uma casa, e zero quando a série não tem dias letivos. 🟢 `modules.frequencia_da_matricula.sql:31-40`
- No regime por componente: soma por componente da quantidade × hora falta do componente, e (100 − (total de horas faltadas ÷ carga horária da série)), truncado a uma casa, zero se a carga da série for nula. 🟢 `modules.frequencia_da_matricula.sql:60-96`
- Por componente isolado: 100 − ((faltas × hora_falta × 100) ÷ carga horária), com carga e hora falta resolvidas na ordem: componente na turma, escola-série-disciplina, componente-ano-escolar; a hora falta por último ainda tenta a componente-ano-escolar e o curso; carga ou zero devolve zero. 🟢 `modules.frequencia_por_componente.sql:9-88`
- Consumo público: a API de matrículas expõe a frequência via chamado direto ao banco com o id da requisição interpolado sem parametrização. 🔴 `MatriculaController.php:497-503` (risco de injeção — só o clássico)

### Faltas e atrasos do servidor (por referência à unit `Servidores`)

- O registro é por servidor, escola e função, com tipo (falta ou atraso), dia, horas, minutos, flag justificada e ativo, no processo 635 nível 7, sem anexo digital. 🟢 `educar_falta_atraso_cad.php:53-132` e migração `create_pmieducar_falta_atraso_table`
- A compensação regista período início/fim por servidor e escola, também no processo 635. 🟢 `educar_falta_atraso_compensado_cad.php:40-104` e migração `create_pmieducar_falta_atraso_compensado_table`
- Nenhum desses dados baixa as faltas do aluno; a "justificativa de falta de aluno" do bastão é requisito novo. 🔴

### Ausências do legado (requisitos novos do bastão)

- Diário atômico por aula com conteúdos, metodologia, habilidades da BNCC, observações e status. 🔴 busca de módulos
- Chamada por aula com presença indivisível e aulas geminadas. 🔴
- Atestados e justificativas de aluno com vigência, abono e anexo. 🔴
- Consolidação com níveis de alerta de evasão (NORMAL, ATENÇÃO, risco crítico). 🔴
- Travamento por etapa homologada com `is_locked` por aula. 🔴

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve manter o lançamento consolidado de faltas por etapa, com regime geral ou por componente herdado da regra de avaliação. | Must | Dado um regime por componente, quando lança sem componente, então recusa. 🟢 |
| RC-02 | O sistema deve apresentar a grade de matrículas da turma, ordenada por sequencial de fechamento e nome, com a última enturmação ativa. | Must | Dado um aluno remanejado antes da base, quando a grade abre, então o aluno não aparece, e depois da base com status de movimentação aparece. 🟢 |
| RC-03 | O sistema deve recusar o lançamento de falta quando faltas anteriores na mesma chave não existem. | Must | Dado a etapa 3 sem registro na 2, quando lança na 3, então recusa. 🟢 |
| RC-04 | O sistema deve recusar a remoção de falta com faltas em etapas posteriores, listando as etapas bloqueadoras. | Must | Dado faltas nas etapas 2 e 3, quando remove a 2, então recusa com "após remover as faltas lançadas nas etapas posteriores: 3.". 🟢 |
| RC-05 | O sistema deve aplicar a janela de período de lançamento por escola, etapa e tipo de etapa, com exceção pela permissão 999849. | Must | Dado um operador comum fora da janela, quando lança, então recusa com a mensagem de período; dado um abonado pela 999849, então aceita. 🟢 |
| RC-06 | O sistema deve respeitar a bandeira escolar de diários encerrados e a janela institucional do bloqueio do ano letivo. | Must | Dado a bandeira ligada e o ano encerrado, então bloqueia a grade inteira. 🟢 |
| RC-07 | O sistema deve calcular a frequência da matrícula e por componente conforme as fórmulas do legado, com truncamento a uma casa. | Must | Dado 20 dias letivos e 4 faltas, então frequência 80,0. 🟢 |
| RC-08 | O sistema deve manter o parecer descritivo por etapa e por componente na mesma tela da falta quando a regra o exige. | Must | Dado regra com parecer etapa-componente, quando registra falta, então salva também o parecer. 🟢 |
| RC-09 | O sistema deve registrar aula ministrada com conteúdo, metodologia, habilidades BNCC, chamada atôxima por aula e aulas geminadas. | Should | Dado uma aula geminada, quando o aluno falta, então computa duas faltas. 🔴 |
| RC-10 | O sistema deve registrat atestado de aluno com vigência, abono ou não, anexo e atualização retroativa das chamadas do período. | Should | Dado atestado de 10 a 14 com abono, quando a chamada marca faltas nesse intervalo, então as faltas ficam justificadas e abandonadas do cômputo. 🔴 |
| RC-11 | O sistema deve consolidar faltas por etapa com total de aulas, percentual de presença e nível de alerta de evasão. | Should | Dado percentual 72%, então alerta crítico de risco de evasão. 🔴 |
| RC-12 | O sistema deve registrar faltas e atrasos do servidor com justificativa e períodos de compensação, sem interferir nas faltas do aluno. | Must | Dado o registro do servidor, quando a frequência do aluno associa, então não muda. 🟢 |
| RC-13 | O sistema deve travar a edição retroativa de aulas de etapas homologadas. | Should | Dado etapa homologada, quando edita aula, então recusa. 🔴 |
| RC-14 | O sistema deve prever na migração da etapa o valor especial de recuperação, além dos números de etapa. | Must | Dado um registro com etapa 'Rc', quando migrado, então mapeia para o código de recuperação e não falha a conversão para inteiro. 🔴 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | A frequência exposta pela API de matrículas interpola o id da requisição em SQL sem parametrização. | `MatriculaController.php:501` | 🔴 |
| Segurança | As travas de lançamento dependem da permissão do processo 642 (nível 7) e da 999849 para exceção. | `DiarioApiController.php:1880-1887` e `:289` | 🟢 |
| Integridade | A mestre de faltas é única por matrícula; as consolidações têm chave composta com a etapa e FKs às mestre. | migrações das três tabelas | 🟢 |
| Integridade | Não há unique de aluno etapa componente acima da chave; a quantidade não tem teto na API e o clamp de negativos é leivo. | `DiarioApiController.php:1082-1091` | 🟡 |
| Usabilidade | A grade tem navegação de cursor configurável e botão de replicação configurável pela chave de config. | `DiarioController.php:19-34` | 🟢 |
| Desempenho | A grade recupera enturmações, regra de avaliação, tabelas de arredondamento e recuperações em um único empenho com carregamento aninhado. | `DiarioApiController.php:814-914` | 🟢 |
| Rastreabilidade | Sem auditoria de lançamento de falta (autor/conteúdo anterior), e a gravação trata exceções silenciosas. | `DiarioApiController.php:1071-1078` | 🟡 |
| Contraste de régua | As duas entradas de experiência divergem na faixa aceita (0-100 na tela, sem teto na API). | `FaltaController.php:135` vs `DiarioApiController.php:1082-1091` | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado a turma com regime por componente
Quando lança 2 faltas na etapa 1 sem informar o componente
Então a API recusa e pede o componente 🟢

Dado a etapa 2 com registro na etapa 1
Quando lança 3 faltas na etapa 2
Então salva em falta_componente_curricular com a chave da mestre 🟢

Dado faltas nas etapas 2 e 3
Quando remove a falta da etapa 2
Então recusa com a lista da etapa 3 🟢

Dado um operador com a permissão 999849 fora da janela de período
Quando lança falta
Então aceita 🟢

Dado o operador comum fora da janela
Quando lança falta
Então recusa com a mensagem "Não é permitido realizar esta alteração fora do período de lançamento de notas/faltas." 🟢

Dado uma série com 200 dias letivos e 60 faltas gerais
Consulta frequência da matrícula
Então retorna 70.0 🟢

Dado um lançamento para etapa 'Rc'
Quando migra os dados
Então o valor especial é mapeado sem perder a semântica 🔴

Dado um atestado de aluno com abono de 10 a 14
Quando a chamada marca faltas nesse intervalo
Então as faltas do período são justificadas sem cômputo 🔴
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Lançamento consolidado de faltas por etapa | Must | Núcleo do legado 🟢 |
| Grade por turma com ordenação e última enturmação | Must | Experiência do professor 🟢 |
| Travas em camadas com exceção 999849 | Must | Gated launch 🟢 |
| Fórmulas de frequência do banco | Must | Reprodução exata dos históricos 🟢 |
| Falta/atraso do servidor e compensação | Must | Governança do pessoal (unit `Servidores` por referência) 🟢 |
| Diário atômico diário com BNCC | Should | Requisito novo do bastão 🔴 |
| Atestados e justificativas de aluno com abono | Should | Requisito novo do bastão 🔴 |
| Alerta de evasão por consolidação | Should | Requisito novo do bastão 🔴 |
| Correção da etapa 'Rc' na migração | Must | Sem isso a carga quebra 🔴 |

---

## Rastreabilidade de Código

| Arquivo | Função / Papel | Cobertura |
|---------|----------------|-----------|
| `ieducar/modules/Avaliacao/Views/DiarioController.php` | Hub de lançamento por turma (processo 642) | 🟢 |
| `ieducar/modules/Avaliacao/Views/FaltaController.php` | Tela individual de falta por matrícula | 🟢 |
| `ieducar/modules/Avaliacao/Views/DiarioApiController.php` | Backend AJAX de notas, faltas, pareceres, matrículas e travas | 🟢 |
| `app/Services/ReleasePeriodService.php` | Janela de período de lançamento | 🟢 |
| `app/Process.php` | Permissão 999849 de exceção | 🟢 |
| `database/sqls/functions/modules.frequencia_da_matricula.sql` | Frequência da matrícula | 🟢 |
| `database/sqls/functions/modules.frequencia_por_componente.sql` | Frequência por componente | 🟢 |
| `ieducar/modules/Api/Views/MatriculaController.php` | Consumo da frequência com SQL interpolado | 🔴 |
| migrações `modules.falta_aluno`/`falta_geral`/`falta_componente_curricular` | Modelo de dados de faltas | 🟢 |
| migrações e telas `educar_falta_atraso*` | Servidor: faltas e compensação (unit `Servidores`) | 🟢 |
| `app/Models/LegacySchoolYearLock` e `DiarioApiController.php:54-69` | Janela institucional (unit `Configuracao`) | 🟢 |
| `app/Models/LegacySchoolClass`/`bloquear_lancamento_diario_anos_letivos_encerrados` | Bandeira da escola (unit `School`) | 🟢 |
