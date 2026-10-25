# AcademicYear (i-Educar legado) — Fluxos

> Cenários observáveis no código. Etapas numeradas com evidência.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Fluxo 1 — Criar ano letivo por escola (tela legada, processo 561)

```
Usuário com LOGIN validado → permissão 561 nível 7  🟢 educar_ano_letivo_modulo_cad.php:57-66
  ↓ abre GET com escola+ano
  busca ano anterior ativo da escola (max ano < ano)  🟢 :297-300 (service)
  pré-carrega datas sugeridas: etapas do ano anterior com str_replace do ano + 29/02→28/02  🟢 :88-158 + service adjustDateForYear
  lista tipos de etapa ativos da instituição (modulo)  🟢 :166-180
  ↓ POST "processar"
  valida datas (conflito com OUTROS anos da escola; ref_ano != ano)  🟢 service validateAcademicYearDates
  valida nº de etapas vs modulo.num_etapas  🟢 validateStageCountWithModule
  ↓ createAcademicYearForSchool
  upsert escola_ano_letivo (ativo=1, andamento por flags, copia_* do POST)  🟢
  insert das etapas em ano_letivo_modulo (sequencial, tipo, datas, dias_letivos)  🟢 :855-891
  executa cópia do ano anterior conforme flags:
    turmas (por nome) → disciplinas da turma → etapas por turma → multisseriadas → professores → alocações  🟢 :300-609
    datas copiadas: etapas por turma ajustadas; vínculo/alocação com datas nulas  🟢 :470-570
    extende anos_letivos (escola_curso, escola_serie, escola_serie_disciplina, componentes)  🟢 :189-225
    copia vínculo série↔regra de avaliação p/ novo ano  🟢 copyEvaluationRulesForNewYear
  ↓ mensagem de sucesso com contadores de cópia
```

**Exceções:** `AcademicYearServiceException` (datas conflitantes / etapas em outra fase / nº de etapas divergente) → mensagem pt-BR, POST limpo, form re-renderizado. 🟢 :375-388

## Fluxo 2 — Editar etapas

```
GET com escola+ano+módulo → form pré-preenchido 🟢
  POST "processar" (Editar): valida datas + módulos  🟢
    updateAcademicYearStages: apaga TODAS as etapas e reinsere as recebidas  🟢 :259-276
    reativa o ano se inativo  🟢
```
Risco: sem revalidação de lançamentos por etapa redefinida além da checagem de redução. 🟡

## Fluxo 3 — Excluir ano letivo (tela legada)

```
POST "Excluir":
  deleteAcademicYear(escola, ano, usuário):
    andamento=2 + ativo=0 + ref_usuario_exc=null + remove etapas  🟢 :281-298
  tela NÃO captura retorno ($excluiu indefinida) → mensagem "Exclusão não realizada." sempre, mas exclusão acontece  🟢 educar_ano_letivo_modulo_cad.php:499-515
```
Sem verificação de matrículas/notas no legado antes de desativar o ano. 🔴 🟡

## Fluxo 4 — Lote criar (admin, 9999120)

```
admin abre GET /ano-letivo-em-lote  🟢 routes/web.php
  seleciona ano + escolas + períodos + flags de cópia
  POST /processar (acao=create):
    valida payload (Validator Laravel) e limpa dados  🟢 controlador :24-128
    pré-valida TODAS as escolas (datas + módulos) — se alguma falha, nada é criado  🟢 :1045-1095
    para cada escola válida: createAcademicYearForSchool dentro de UMA transação (begin/commit)  🟢 service :1097-1129
    resposta: processed / skipped (já tem ano) / errors (com "Escola ID X não encontrada ou inativa.")  🟢 :1007-1060
```
Exceção no meio do loop: sem catch local — consistência depende do rollback implicito da transação abortada; comportamento em produção não verificado. 🟡

## Fluxo 5 — Lote abrir (open)

```
Pré-valida escolas (ano anterior?), depois para cada escola:
  escola_ano_letivo existe e andamento == 0 → seta andamento = 1  🟢 :1367-1388
  senão → "error" por escola ("já está aberto"/"finalizado")  🟢
Tudo dentro da transação única do lote. 🟢
```

## Fluxo 6 — Lote fechar (close)

```
Para cada escola com andamento == 1:
  hasActiveEnrollments(escola, ano):
    matricula ativo=1, ultima_matricula=1, aprovado=3 (em andamento)
    EXCETO quando tipo_ensino -> atividade_complementar verdadeiro  🟢 :1426-1441
  se houver → erro "existem matrículas em andamento..."; nada muda  🟢
  se não → andamento = 2 (finalizado)  🟢
```
Nota: a regra real é "situação de matrícula", não "nota pendente do aluno". 🟡

## Fluxo 7 — Bloqueio de janela por instituição (21251)

```
Usuário abre educar_bloqueio_ano_letivo_lst → cad/det
  upsert bloqueio_ano_letivo (instituição+ano, data_inicio, data_fim)  🟢 :35-90
  exclusão lógica (ativo=0) na tela det/lst  🟢
  ↓ (sem consumer: a janela NÃO é consultada por regra de lançamento neste snapshot)  🔴
```

## Fluxo 8 — Consulta via Resource API

```
GET resource → builder de filtros (escola, ano, ativo) → coleção JSON  🟢 ResourceSchoolAcademicYearController
```
Usado por interfaces administrativas novas (select de anos ao configurar escolas). 🟡

---

## Fluxo combinado com outros módulos

| Consumidor | Uso | Referência |
|---|---|---|
| `Avaliacao`/`DiarioClasse` | etapa corrente do aluno + trava de lançamento por etapa (via ReleasePeriod/POST_OUT_PERIOD, não via bloqueio_ano_letivo) | unit `DiarioClasse` 🟢 |
| `Calendario` | dias letivos por etapa / vinculação com calendário | 🟡 |
| `Educacenso` | datas de etapa para registro 20/validações de período | 🟡 |
| `HistoricoEscolar` | ano letivo finalizado como pré-condição de histórico | 🟡 |
| `Unification` | nenhum efeito direto identificado | 🔴 |
