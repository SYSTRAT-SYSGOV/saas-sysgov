# DiarioClasse (i-Educar legado), Fluxos

> Fluxos da unit diário de classe e frequência que completam os fluxos do `design.md`.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## 1. Fluxo de abertura da grade de lançamento

**Gatilho:** o professor ou secretaria abre o hub "Lançamento por turma" (processo 642).

1. Os filtros dinâmicos são montados; para professor puro o componente é obrigatório. 🟢 `ieducar/modules/Avaliacao/Views/DiarioController.php:11-17`
2. A chamada `get-matriculas` valida os parâmetros completos. 🟢 `ieducar/modules/Avaliacao/Views/DiarioApiController.php:313-325`
3. A bandeira da escola recusa anos encerrados configurados; na sequência a janela institucional recusa datas fora da janela permitida. 🟢 `DiarioApiController.php:40-69`
4. A turma carrega a enturmação ativa mais recente de cada matrícula, com aluno, pessoa, deficiências e dependências. 🟢 `DiarioApiController.php:816-877`
5. A data base de remanejamento da instituição filtra as exclusões: movimentações depois dela permanecem visíveis conforme o tipo. 🟢 `DiarioApiController.php:824-843` (unit `Configuracao`)
6. A lista ordena por sequencial de fechamento e nome, e carrega a regra de avaliação com tabelas de arredondamento e recuperações, inclusive a diferenciada por deficiência. 🟢 `DiarioApiController.php:885-914`

## 2. Fluxo de lançamento de falta no registro consolidado

**Gatilho:** o operador grava a quantidade na célula da grade ou na tela individual.

1. A validação do POST exige etapa, matrícula, permissão do processo 642 e período de lançamento com a exceção 999849. 🟢 `DiarioApiController.php:327-333`, `:350-354`, `:287-309`
2. O regime vem da regra: por componente exige o componente; geral grava a falta geral. 🟢 `DiarioApiController.php:613-622`
3. As faltas das etapas anteriores devem existir. 🟢 `DiarioApiController.php:135` e `:350-354`
4. A quantidade negativa clampada para zero, o modelo é montado e adicionado ao serviço do boletim. 🟢 `DiarioApiController.php:1082-1108` e `:624`
5. A gravação prioritária das faltas dispara a promoção e silencia a exceção de progressão manual; a situação recalculada volta na resposta. 🟢 `DiarioApiController.php:1071-1078` e `:626-632`
6. Na tela individual, o fluxo é idêntico com a etapa sugerida e o parecer acoplado. 🟢 `FaltaController.php:85-107`, `:146-188`

## 3. Fluxo de remoção de falta com bloqueio escada

**Gatilho:** o operador zera ou remove o lançamento de uma etapa.

1. A validação percorre as etapas posteriores procurando faltas. 🟢 `DiarioApiController.php:252-274`
2. Havendo faltas, bloqueia listando as etapas bloqueadoras na mensagem. 🟢 `DiarioApiController.php:268-270`
3. Sem faltas posteriores, o registro é removido pelo serviço e a promoção re-tentada. 🟢 `DiarioApiController.php:746-751` e `:1071-1078`
4. Registro inexistente devolve aviso "inexistente ou já removida", sem erro. 🟢 `DiarioApiController.php:746-747`

## 4. Fluxo do período de lançamento com exceção

**Gatilho:** qualquer POST/DELETE de notas ou faltas.

1. Primeiro verifica se o operador possui o processo 999849: tem, lança fora da janela sem registro. 🟢 `DiarioApiController.php:289` e `app/Process.php:71`
2. Sem a permissão, o serviço resolve a etapa da turma; para 'Rc' e 'An' usa a etapa máxima. 🟢 `app/Services/ReleasePeriodService.php:24-34`
3. O vínculo de períodos é buscado por ano, tipo de etapa e etapa, restrito às escolas vinculadas. 🟢 `ReleasePeriodService.php:37-43`
4. Sem vínculo, lança livre; com vínculo, exige a data atual dentro de alguma janela início-fim. 🟢 `ReleasePeriodService.php:45-53`
5. Fora de tudo, bloqueia com a mensagem única de período. 🟢 `DiarioApiController.php:304-306`

## 5. Fluxo de cálculo de frequência

**Gatilho:** tela de relatório, API de matrículas ou histórico.

1. A função `frequencia_da_matricula` resolve o regime pela regra da série e do ano. 🟢 `database/sqls/functions/modules.frequencia_da_matricula.sql:13-29`
2. No regime geral: dias letivos da série menos o somatório de faltas gerais, em percentual truncado a uma casa; sem dias letivos devolve zero. 🟢 `:31-40`
3. No regime por componente: somatório por componente de quantidade × hora falta do componente, e 100 menos o quociente pela carga horária da série; sem carga devolve zero. 🟢 `:60-96`
4. Por componente isolado, `frequencia_por_componente` resolve a carga na turma, depois escola-série-disciplina, depois componente-ano-escolar; a hora falta tem fallback similar até o curso; sem carga devolve zero. 🟢 `database/sqls/functions/modules.frequencia_por_componente.sql:22-88`
5. A API de matrículas expõe o percentual chamando a função com o id da requisição interpolado direto. 🔴 `ieducar/modules/Api/Views/MatriculaController.php:497-503`

## 6. Fluxo de faltas/atrasos do servidor (por referência à unit `Servidores`)

**Gatilho:** cadastro pela área de Servidores (processo 635).

1. O registro por servidor, escola e função grava tipo, dia, horas e minutos e a flag justificada. 🟢 `ieducar/intranet/educar_falta_atraso_cad.php:53-132`
2. A compensação grava o intervalo de datas por servidor e escola. 🟢 `educar_falta_atraso_compensado_cad.php:106-141`
3. Nenhum efeito recai sobre as faltas do aluno. 🟢 busca de consumo

## 7. Fluxos ausentes no legado

Requisitos novos do bastão, sem implementação correspondente. 🔴

- Aula ministrada com conteúdo, metodologia, BNCC e status, com travamento por etapa homologada. 🔴
- Chamada atômica por aula com aulas geminadas. 🔴
- Atestados de aluno com vigência, abono, anexo e retroatividade nas chamadas. 🔴
- Consolidação com presença, justificadas e nível de alerta de evasão. 🔴
- Auditoria de lançamentos e do abono de período. 🔴
