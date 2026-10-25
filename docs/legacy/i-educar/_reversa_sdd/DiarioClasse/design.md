# DiarioClasse (i-Educar legado), Design

> Como o subsistema diário de classe e frequência está estruturado no código legado, com os fluxos principais, as dependências, as decisões de design e os riscos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades e componentes legados

| Componente | Papel | Fonte |
|----------|-------|-------|
| `DiarioController` | Hub "Lançamento por turma" com filtros e navegação de cursor | 🟢 `ieducar/modules/Avaliacao/Views/DiarioController.php:3-45` |
| `FaltaController` | Tela individual de falta por matrícula, com parecer acoplado | 🟢 `ieducar/modules/Avaliacao/Views/FaltaController.php:5-188` |
| `DiarioApiController` | Backend AJAX de notas, faltas, pareceres, matrículas e travas | 🟢 `ieducar/modules/Avaliacao/Views/DiarioApiController.php:37-757` |
| `Avaliacao_Service_Boletim` | Serviço central do boletim (saveFaltas/promover) | 🟢 `DiarioApiController.php:1071-1078` (detalhe na unit `Avaliacao`) |
| `ReleasePeriodService` | Janela de período de lançamento por escola, etapa e tipo | 🟢 `app/Services/ReleasePeriodService.php:9-54` |
| `ReleasePeriod` + `ReleasePeriodDate` | `release_periods`, `release_period_schools`, `release_period_dates` | 🟢 migrações `2020_06_24_1703xx/1705xx` |
| `LegacySchoolYearLock` | Janela institucional do bloqueio do ano letivo | 🟢 `DiarioApiController.php:54-69` (unit `Configuracao`) |
| `falta_aluno` / `falta_geral` / `falta_componente_curricular` | Mestre única por matrícula e consolidações por etapa | 🟢 migrações `2020_01_01_110000_create_modules_falta_*` |
| funções `modules.frequencia_da_matricula` e `modules.frequencia_por_componente` | Percentuais de frequência em banco | 🟢 `database/sqls/functions/*.sql` |
| `LegacyAbsenceDelay` / `LegacyAbsenceDelayCompensate` | Faltas/atrasos do servidor e compensação | 🟢 telas do processo 635 (unit `Servidores`) |

### Domínio

O domínio é a **apuração consolidada de faltas por etapa avaliativa**: uma mestre única por matrícula define o regime (geral ou por componente), as consolidações somam quantidades por etapa, e as funções de banco convertem os totais em porcentagem de frequência usando dias letivos da série ou carga horária do componente. Não há aula individual como entidade: a unidade de tempo é a etapa. A única noção de "presença" é a ausência contada. 🟢 migrações e funções SQL

### Endpoints HTTP legados

| Rota | Uso | Fonte |
|------|-----|-------|
| `modules/diario` (hub, processo 642) | Lançamento por turma | 🟢 `DiarioController.php:5-7` |
| `DiarioController?operation=get-matriculas` | Grade de matrículas da turma | 🟢 `DiarioApiController.php:1944-1949` |
| `POST post-falta` | Alt/gravação de falta geral ou por componente | 🟢 `DiarioApiController.php:610-633` |
| `DELETE delete-falta` | Remoção com travas de etapas posteriores | 🟢 `DiarioApiController.php:733-757` |
| `POST post-situacao` | Alteração de situação da matrícula (processo 630) | 🟢 `DiarioApiController.php:1889-1908` |
| `modules/falta?matricula=&etapa=&componenteCurricular=` | Tela individual | 🟢 `FaltaController.php:52-70` |
| API `get-frequencia` de matrículas | Percentual via função de banco | 🔴 `MatriculaController.php:497-503` |
| Telas `educar_falta_atraso_*` (processo 635) | Faltas/atrasos e compensação do servidor | 🟢 telas (unit `Servidores`) |

### Funções e classes no nível de aplicação

| Método | Papel | Fonte |
|--------|-------|-------|
| `getMatriculas()` | Enturmações ativas, última por sequencial, corte pela base de remanejamento, regra + tabelas de arredondamento | 🟢 `DiarioApiController.php:810-929` |
| `canGetMatriculas()` / `validatesCanChangeDiarioForAno()` | Parâmetros obrigatórios + bandeira escolar + janela institucional | 🟢 `DiarioApiController.php:313-325` e `:37-72` |
| `canPostFalta()` | Etapa, matrícula, permissão, período e faltas anteriores | 🟢 `DiarioApiController.php:350-354` |
| `postFalta()` / `deleteFalta()` | Gravação e remoção pelas mestres da regra | 🟢 `DiarioApiController.php:610-633`, `:733-757` |
| `getFaltaGeral()` / `getFaltaComponente()` | Montagem dos modelos com clamp de negativos | 🟢 `DiarioApiController.php:1082-1108` |
| `trySaveServiceBoletimFaltas()` | `saveFaltas(true)` + `promover()` silenciando exceções | 🟢 `DiarioApiController.php:1071-1078` |
| `canPostNow(escola, turma, etapa, ano)` | Janela de período; sem vínculo libera, 'Rc'/'An' viram etapa máxima | 🟢 `ReleasePeriodService.php:22-53` |
| `getRegra()` (Boletim) | Decisão de regime `tipoPresenca` | 🟢 `FaltaController.php:85-91` |

---

## Fluxo Principal

**Lançamento de falta na grade por turma.**

1. O usuário abre o hub, escolhe instituição, escola, curso, série, turma, etapa e componente; professor tem componente obrigatório e só vê os seus. 🟢 `DiarioController.php:11-17`
2. A grade pede as matrículas; a validação exige parâmetros completos, permissão do processo 642 e passa pelas travas de ano encerrado e janela institucional. 🟢 `DiarioApiController.php:313-325` e `:37-72`
3. As enturmações ativas mais recentes são carregadas com aluno, pessoa, deficiências e dependência, ordenadas por sequencial de fechamento e nome; movimentações depois da base de remanejamento continuam visíveis conforme a movimentação. 🟢 `DiarioApiController.php:814-929`
4. Cada POST de falta valida etapa, matrícula, permissão e período de lançamento; com regime por componente exige o componente. 🟢 `DiarioApiController.php:327-333`, `:350-354`, `:613-615`
5. O modelo de falta (geral ou componente) é montado com a quantidade, adicionado ao serviço e gravado, com promoção de situação na sequência. 🟢 `DiarioApiController.php:617-626` e `:1071-1078`
6. A resposta devolve a situação recalculada do componente e os ecos dos parâmetros. 🟢 `DiarioApiController.php:629-632`

---

## Fluxos Alternativos

- **Tela individual:** carga pelo serviço do boletim, etapa sugerida = registros existentes + 1, lista 0–100, gravação com parecer acoplado quando a regra exige, exceção de promoção manual silenciada. 🟢 `FaltaController.php:75-107`, `:112-188`
- **Remoção com bloqueio escada:** o DELETE percorre as etapas posteriores à requerida; havendo faltas, bloqueia e lista as etapas; registro inexistente devolve aviso. 🟢 `DiarioApiController.php:252-274`, `:379-384`, `:733-757`
- **Exceção de operador abonado:** quem tem o processo 999849 ignora a janela de período sem registrar nada. 🟢 `DiarioApiController.php:287-299` e `app/Process.php:71`
- **Turma sem períodos definidos:** `canPostNow` retorna verdadeiro quando não há vínculo — períodos são opt-in por escola/etapa/tipo. 🟢 `ReleasePeriodService.php:37-47`
- **Consulta de frequência:** o controlador de matrículas chama a função de banco com o id da requisição interpolado. 🔴 `MatriculaController.php:497-503`
- **Falta/atraso do servidor:** cadastro por função do servidor com justificada booleana e compensação por intervalo de datas; não afeta o aluno. 🟢 telas do processo 635 (unit `Servidores`)

---

## Dependências

| Dependência | Uso | Direção | Fonte |
|-------------|-----|---------|-------|
| `Avaliacao_Service_Boletim` | Gravação, promoção e regra de avaliação | Saída | 🟢 `FaltaController.php:64-70` |
| `RegraAvaliacao` (unit homônima) | `tipoPresenca`, `parecerDescritivo` | Saída | 🟢 `FaltaController.php:85`, `:130`, `:138` |
| `TabelaArredondamento` (unit futura) | Tabelas carregadas para a grade | Saída | 🟢 `DiarioApiController.php:898-914` |
| `School` (unit `School`) | Bandeira de diários encerrados | Saída | 🟢 `DiarioApiController.php:48-52` |
| `Configuracao` (unit homônima) | Janela do bloqueio do ano letivo | Saída | 🟢 `DiarioApiController.php:54-69` |
| `Servidores` (unit futura) | Faltas/atrasos e compensação de servidor | Referência | 🟢 telas do processo 635 |
| `Unification` (unit futura) | Nenhum consumo direto identificado na unit | — | 🔴 |
| `Calendario` (unit homônima) | Etapas da turma para resolver a etapa máxima em 'Rc'/'An' | Saída | 🟢 `ReleasePeriodService.php:24-34` |
| Rotinas do banco (funções SQL) | Percentuais de frequência | Interna | 🟢 funções SQL |

---

## Decisões de Design Identificadas

| Decisão | Evidência | Confiança |
|---------|-----------|-----------|
| Consolidação por etapa em vez de chamada por aula: a unidade de registro é a etapa. | migrações e funções SQL | 🟢 |
| Mestre única por matrícula com regime fixado na criação (`tipo_falta`). | migração `falta_aluno` (`UNIQUE matricula_id`) | 🟢 |
| Regime decidido pela regra de avaliação, não pela turma ou pelo curso. | `DiarioApiController.php:613-622` | 🟢 |
| Trava em camadas, cada uma com mensagem própria e exceção por permissão na última. | `DiarioApiController.php:37-72`, `:287-309` | 🟢 |
| Períodos de lançamento opt-in: sem vínculo, tudo liberado. | `ReleasePeriodService.php:45-47` | 🟢 |
| Faltas anteriores obrigatórias e remoção escada-invertida. | `DiarioApiController.php:135`, `:252-274` | 🟢 |
| Frequência calculada em função de banco, com a lógica fora de aplicação. | funções SQL | 🟢 |
| Fallback triplo de carga horária e duplo de hora falta no cálculo por componente. | `modules.frequencia_por_componente.sql:22-80` | 🟢 |
| Falta/atraso do servidor como subsistema separado do aluno. | telas do processo 635 | 🟢 |
| Botão de replicar e navegação de cursor configuráveis por chave de configuração. | `DiarioController.php:19-34` | 🟢 |

---

## Estado Interno

- A mestre `falta_aluno` fixa o regime na criação e não muda sem intervenção externa; trocar o regime da regra com dados existentes cria inconsistência. 🟡 (chaves distintas sem migração)
- A etapa especial 'Rc' (recuperação) coexiste com as etapas numéricas nas mesmas tabelas. 🟢 `FaltaController.php:128`
- A quantidade é inteiro-sem-teto na API e lista limitada a 100 na tela. 🟡
- O serviço de boletim mantém em memória as faltas por etapa durante o request. 🟡 (unit `Avaliacao`)

---

## Observabilidade

- Mensagens de sucesso e erro retornadas ao cliente por matrícula, mas sem trilha de auditoria do lançamento (autor, valor anterior). 🔴
- Exceções de promoção silenciadas com catch vazio. 🟢 `DiarioApiController.php:1076-1077`
- Nenhum registro de quem removou ou replicou faltas. 🔴

---

## Riscos e Lacunas

| Risco | Descrição | Evidência | Confiança |
|-------|-----------|-----------|-----------|
| SQL na frequência da API | O id da requisição é interpolado direto na função de banco. | `MatriculaController.php:501` | 🔴 |
| Cap divergente | Tela limita a 100; API aceita qualquer inteiro positivo. | `FaltaController.php:135` vs `DiarioApiController.php:1082-1091` | 🟡 |
| Etapa 'Rc' na migração | O bastão converte etapa varchar em `SMALLINT` sem tratar recuperação. | `FaltaController.php:128` e `legacy-mapping.md:152` | 🔴 |
| Regime fixo na mestre | Troca de regra com registros existentes deixa dados no regime antigo. | migração `falta_aluno` | 🟡 |
|etheus sem justificativa de aluno | O bastão promete atestados com abono e anexo; o legado só tem flag de servidor. | busca + telas do processo 635 | 🔴 |
| Sem cheamada atômica | Nenhum registro por aula existe; a migração gerará consolidações diretas. | `legacy-mapping.md:20` e busca | 🔴 |
| Exceção de período sem auditoria | O abono 999849 libera sem registro de autor ou motivo. | `DiarioApiController.php:287-299` | 🟡 |
| Correção à unit `Configuracao` | O motor de bloqueios com exceção por permissão já existe em parte (períodos + 999849); a unit 14 registrou ausência total. | `ReleasePeriodService.php` e `app/Process.php:71` | 🔴 |
