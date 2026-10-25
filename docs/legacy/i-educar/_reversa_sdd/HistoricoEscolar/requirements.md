# HistoricoEscolar (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Descreve o **QUE** o subsistema de histórico escolar faz: o cadastro manual da vida pregressa com disciplinas, o processamento consolidado das matrículas do próprio sistema, o livro de assentamento (registro, livro, folha), a média geral e a média por área, o histórico automático de transferência e a restrição institucional de edição.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Visão Geral

O histórico escolar do legado é de dois modos: publicado pela secretaria de "vida pregressa" (cadastro manual de etapa externa com escola, curso e disciplinas digitados) e o "processamento histórico" (consolidação das matrículas do próprio sistema, tomando notas e faltas do boletim ou informadas à mão). Os dois esteiam nas mesmas duas tabelas, `pmieducar.historico_escolar` (cabeçalho com situação, frequência e os dados de livro, folha e registro) e `pmieducar.historico_disciplinas` (linhas de disciplina com nota, faltas, carga e base curricular), replicando a coluna de posição do modelo impresso. 🟢 `ieducar/intranet/educar_historico_escolar_cad.php`, `ieducar/modules/HistoricoEscolar/Views/ProcessamentoController.php`, migrações `create_pmieducar_historico_escolar/disciplinas/grade_curso` contra `_reversa_sdd/HistoricoEscolar/legacy-mapping.md:9-11`

O bastão descreve fielmente a estrutura (duas tabelas, matriz com posição, assentamento notarial); os de/para das colunas conferem com o legado real. Os fluxos de matriz de vida e de documento oficial timbrado são novos. 🟡 `_reversa_sdd/HistoricoEscolar/legacy-mapping.md:15-112`

O processamento do histórico é um requisito funcional **imediato** sob demanda do operador, e não consolidado no fim do ano letivo: o operador escolhe, por lote, qual situação, qual percentual de frequência e quais notas/faltas usam (do boletim ou manuais) e dispara por matrícula ou pela turma inteira; não há gerenciamento de congelamento por calendário. 🔴 busca de agendamento contra `_reversa_sdd/HistoricoEscolar/legacy-mapping.md:11`

---

## Responsabilidades

- Manter a vida pregressa: cadastro manual de etapa cursada com escola externa ou da rede, país, estado, cidade, curso, série e ano. 🟢 `educar_historico_escolar_cad.php:170-249`
- Manter as linhas de disciplinas em tabela dinâmica com base curricular (comum ou diversificada), nota textual, faltas, carga horária, ordem e dependência por disciplina. 🟢 `educar_historico_escolar_cad.php:275-288` e `:418-430`
- Atribuir o sequencial automático por aluno (máximo + 1) na criação. 🟢 `educar_historico_escolar_cad.php:319-330` e `app/Services/SchoolHistoryService.php:102-105`
- Fixar o grama do modelo impresso pelo cadastro "grade curso" (`historico_grade_curso` com descrição de etapa e quantidade de etapas). 🟢 `ProcessamentoController.php:251-268` e migração `create_pmieducar_historico_grade_curso_table`
- Processar o histórico das matrículas do sistema por lote, com opções de fonte (boletim, valor fixo AP, manual) e de situação. 🟢 `ProcessamentoController.php:86-235` e `ProcessamentoApiController.php:549-601`
- Registar o assentamento notarial: registro (arquivo), livro e folha. 🟢 `educar_historico_escolar_cad.php:247-249`
- Calcular a frequência do boletim quando a opção pede o do boletim, ou aceitar a manual. 🟢 `ProcessamentoApiController.php:527-536`
- Processar a carga horária total da série ou a soma das cargas dos componentes (chave de mostrar relatório por rede). 🟢 `ProcessamentoApiController.php:663-680` e `ProcessamentoController.php:68-73`
- Fechar a média por área de conhecimento ou a média geral dos alunos, com arredondamento pela tabela da regra. 🟢 `ProcessamentoController.php:222-233` e `ProcessamentoApiController.php:857` e `app/Services/SchoolHistoryService.php:66-88`
- Gerar o histórico automático de transferência quando a bandeira da instituição pedir. 🟢 `app/Services/SchoolHistoryService.php:19-64` e `ieducar/intranet/educar_transferencia_solicitacao_cad.php:263` (unit `Configuracao`)
- Restringir a edição do histórico por vínculo de escola da instituição. 🟢 `educar_historico_escolar_det.php:211-242`
- Listar e detalhar os históricos por aluno, com cópia inteira de uma etapa via parâmetro da tela. 🟢 `educar_historico_escolar_lst.php:90-138` e `educar_historico_escolar_cad.php:115-119`

---

## Regras de Negócio

### Modelo de dados

- O cabeçalho `pmieducar.historico_escolar` tem chave própria serial e a chave funcional de (aluno, sequencial); colunas de escola, curso, série, ano, cargas, dias letivos, situação, frequência, faltas globalizadas, extra-curricular, aceleração, dependência, posição, origem e os assentamentos notariais. 🟢 migração `create_pmieducar_historico_escolar_table`
- A linha `pmieducar.historico_disciplinas` tem chave própria serial com a tríade funcional (aluno, sequencial cabeçalho, sequencial linha): texto de disciplina, nota texto livre (255), faltas, carga por disciplina, ordem, dependência, base curricular (1 comum, 2 diversificada) e import. 🟢 migração `create_pmieducar_historico_disciplinas_table`
- A coluna `historico_escolar_id` em disciplinas é acréscimo tardio da base (migração de 2026 que popula o vínculo), com índice organizado. 🟢 migrações `2026_03_10_000002_populate_historico_escolar_id.php` e `2026_03_10_171545_organiza_index_historico_disciplinas.php`
- A "grade curso" é tabela própria com descrição de etapa e quantidade de etapas, seed inicial com opções fixas. 🟢 migração `create_pmieducar_historico_grade_curso_table` e `data/...historico_grade_curso.php`

### Situação do aluno no histórico

- Os oito códigos de situação são: 1 Apro, 2 Repr, 3 Curs, 4 Tran, 5 Recl, 6 DeFr, 12 AprDep, 13 AprCo, 14 RpFt; a tela da vida pregressa filtra os especiais (exceto transferidos/abandono, todas e falecido). 🟢 `app/Models/SchoolHistoryStatus.php:9-44`
- No processamento, a situação do boletim é automática quando a opção pede "usar do boletim"; as demais são mapeadas manualmente no enum de situação da matrícula. 🟢 `ProcessamentoApiController.php:501-525`
- O processamento por dependências tem filtro próprio na tela. 🟢 `ProcessamentoController.php:57-66`

### Origem e cópia

- A coluna `origem` distingue: 1 = processamento do sistema; edição da vida pregressa seve somente origem 1 — no processamento a origem gravada é sempre 1, igual à vida pregressa, não distinguindo as duas entradas na base. 🟢 `ProcessamentoApiController.php:620` e `educar_historico_escolar_cad.php:401` (afinação do bastão: `origin_type` system/manual não existe no legado). 🟡
- A tela de cadastro aceita "copia" pelo parâmetro GET para gerar uma etapa clonada sem exluir. 🟡 `educar_historico_escolar_cad.php:115-119`

### Processamento consolidado

- A frequência deliberada: do boletim (percentual de presença arredondado a duas casas) ou manual com vírgula normalizada para ponto. 🟢 `ProcessamentoApiController.php:527-536`
- As faltas globalizadas só alimentam no regime geral da regra. 🟢 `ProcessamentoApiController.php:538-547`
- Notas manuais aceitam o valor fixo "AP" (aprovado) além do boletim; disciplinas manuais permitem nome, nota, falta e carga por linha. 🟢 `ProcessamentoController.php:165-185`, `:127-160`
- O reprocessamento reusa o sequencial existente; a criação usa o próximo. 🟢 `ProcessamentoApiController.java:560-587`
- A gravação é transacional com rollback e mensagem de erro com o detalhe da exceção. 🟢 `ProcessamentoApiController.php:554-555`, `:589-592`
- A média por área fecha o histórico por áreas de conhecimento, não por componentes; e a média geral grava uma linha chamada "Média Geral" com arredondamento pela tabela da regra. 🟢 `ProcessamentoController.php:222-233` e `app/Services/SchoolHistoryService.php:66-88`
- A posição do histórico é exigida somente quando a bandeira institucional de controle de posição está ligada. 🟢 `ProcessamentoController.php:75-84` e `:270-277` (unit `Configuracao`)

### Restrição de edição

- Com a bandeira `restringir_historico_escolar` da instituição ligada, a edição só é liberada para o usuário ligado à escola da última matrícula do aluno ou aos níveis 1 e 2, e somente para registros com origem de prompt de sistema (não-processados manual da secretaria? no legado: `origem` setado). 🟢 `educar_historico_escolar_det.php:211-242` (unit `Configuracao`)
- A leitura dessa bandeira interpola parâmetros direto na consulta. 🔴 `educar_historico_escolar_det.php:215-224` (rastro de rota de injeção típica do legado)

### Histórico automático de transferência

- Ao solicitar transferência, com a bandeira `gerar_historico_transferencia` da instituição, o sistema cria o cabeçalho com situação 4 (Tran), o número de grade curso derivado do nome do curso (séries 8 vs anos), e as disciplinas da série/escola/ano com nota vazia, sem faltas e sem assentamento notarial. 🟢 `app/Services/SchoolHistoryService.php:19-64`
- A derividade da grade é codificada por substring "8" no nome do curso — regra frágil inerente. 🟡 `app/Services/SchoolHistoryService.php:28`

### Exclusão e unificação

- A exclusão do cabeçalho é lógica (ativo = 0 com autor e data), mas as disciplinas são apagadas em bloco (exclusão física). 🟢 `educar_historico_escolar_cad.php:373-380`
- A edição apaga e recria todas as disciplinas do histórico. 🟢 `educar_historico_escolar_cad.php:356-359`
- A unificação de alunos move os históricos para o vencedor (unit `Unification` por referência). 🟢 `ieducar/lib/App/Unificacao/Aluno.php:24-76`

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RC-01 | O sistema deve cadastrar etapas da vida pregressa com escola externa, país, estado, cidade, curso, série e ano. | Must | Dado uma escola fora da rede, quando gravado, então o nome fica textual na etapa. 🟢 |
| RC-02 | O sistema deve manter disciplinas do histórico com base curricular, nota textual, faltas, carga, ordem e dependência por disciplina. | Must | Dado uma disciplina diversificada, quando gravada, então o agrupamento do relatório separa. 🟢 |
| RC-03 | O sistema deve atribuir o sequencial cronológico por aluno na criação. | Must | Dado dois históricos do mesmo aluno, então sequencial 1 e 2. 🟢 |
| RC-04 | O sistema deve processar o histórico das matrículas do sistema por lote com fonte escolhida para notas, faltas, frequência e situação. | Must | Dado a opção "usar do boletim", então os dados saem do boletim; dado manual, então da tela. 🟢 |
| RC-05 | O sistema deve reprocessar a mesma etapa mantendo o sequencial, sob transação com rollback. | Must | Dado um erro no meio, então nada é gravado. 🟢 |
| RC-06 | O sistema deve registrar livro, folha e registro no cabeçalho do histórico. | Must | Dado os três campos, quando gravados, então o documento aponta o assentamento. 🟢 |
| RC-07 | O sistema deve fechar a média por área de conhecimento ou a média geral com arredondamento da regra. | Must | Dado média geral ligada, então uma linha "Média Geral" com nota arredondada. 🟢 |
| RC-08 | O sistema deve gerar o histórico automático de transferência quando a bandeira da instituição pedir, com situação Tran e notas vazias. | Must | Dado a bandeira ligada, quando a transferência é solicitada, então o histórico nasce com disciplinas da série. 🟢 |
| RC-09 | O sistema deve restringir a edição por vínculo de escola quando a bandeira pedir. | Must | Dado usuário de outra escola, quando edita, então sem botão de edição. 🟢 |
| RC-10 | O sistema deve posicionar a etapa na coluna do modelo impresso quando a bandeira de posição pedir. | Must | Dado a bandeira ligada e posição 2, então a etapa imprime na coluna 2. 🟢 |
| RC-11 | O sistema deve emitir o documento oficial timbrado com chancela digital a partir dos históricos. | Should | Dado os históricos do aluno, então o PDF sai com a matriz e o assentamento. 🔴 |
| RC-12 | O sistema deve apresentar a matriz curricular como "vida função" visível do aluno no portal. | Should | Dado as etapas, então a matriz exibe nota/falta por etapa com dispensas. 🔴 |
| RC-13 | O sistema deve consolidar o fechamento anual automaticamente ao fim do ano letivo. | Could | Dado o encerramento do ano, então todos os históricos processam sem intervenção. 🔴 |
| RC-14 | O sistema deve preservar a distinção manual/system na migração, atribuindo 'system' aos registros criados pelo processamento. | Must | Dado os registros legados, quando migrados, então origem fiel. 🟡 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência no código | Confiança |
|------|-----------|---------------------|-----------|
| Segurança | A bandeira de restrição é lida com interpolação direta dos parâmetros da tela em SQL. | `educar_historico_escolar_det.php:215-224` | 🔴 |
| Integridade | Exclusão lógica do cabeçalho com física das disciplinas; edição apaga e recria disciplinas. | `educar_historico_escolar_cad.php:356-380` | 🟡 |
| Integridade | No reprocessamento e na edição, `data_exclusao` é estampada mesmo com o registro ativo (dobradiça de análise). | `ProcessamentoApiController.php:581-584` e `educar_historico_escolar_cad.php:351-354` | 🟡 |
| Usabilidade | Opções do processamento reúnem tudo em um formulário com fonte por campo (boletim/AP/manual). | `ProcessamentoController.php:86-235` | 🟢 |
| Usabilidade | Escola externa com município por busca e indicador de "outro município ou fora da rede" para a cidade da instituição como padrão. | `educar_historico_escolar_cad.php:170-208` e `:394-395` | 🟢 |
| Desempenho | O processamento rola em transação por requisição, com carregamento do serviço de boletim por matrícula. | `ProcessamentoApiController.php:549-601` | 🟡 |
| Rastreabilidade | Autor de cadastro/exclusão nos cabeçalhos; sem trilha de alteração de notas. | migração/fillable | 🟡 |
| Consistência | A origem gravada é sempre 1 em ambas as entradas, sem distinção manual/system. | `ProcessamentoApiController.php:620` e `educar_historico_escolar_cad.php:401` | 🟡 |

---

## Critérios de Aceitação

```gherkin
Dado um aluno com escola externa e cidade fora do município
Quando a etapa da vida pregressa é gravada
Então o cabeçalho guarda nome textual da escola, cidade e UF digitados 🟢

Dado a grade curso "Fundamental anos" e posição exigida
Quando a etapa é processada sem posição
Então o processamento recusa 🟢

Dado a opção de frequência "usar do boletim" e o percentual de presença 85.555
Quando processa
Então grava 85.56 🟢

Dado regime de regra por componente
Quando processa
Então faltas globalizadas ficam nulas 🟢

Dado média geral ativada
Quando processa
Então a linha "Média Geral" armazena a nota arredondada da tabela da regra 🟢

Dado a bandeira de histórico de transferência ligada
Quando a solicitação de transferência é gravada
Então o histórico de transferência nasce com situação Tran e disciplinas da série sem notas 🟢

Dado a bandeira de restrição ligada e usuário vinculado a outra escola
Quando o detalhe abre
Então sem ação de edição 🟢

Dado o reprocessamento da mesma matrícula
Quando concluído
Então o mesmo sequencial permanece e as disciplinas são substituídas 🟢
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Vida pregressa com disciplinas dinâmicas | Must | Núcleo do legado 🟢 |
| Processamento consolidado por lote com fontes | Must | Experiência principal 🟢 |
| Assentamento notarial (livro/folha/registro) | Must | Documento oficial 🟢 |
| Situação e frequência do boletim | Must | Reuso do módulo Avaliacao 🟢 |
| Média por área e média geral | Must | Relatório oficial 🟢 |
| Histórico automático de transferência | Must | Regra institucional real 🟢 |
| Restrição por vínculo de escola | Must | Governança do documento 🟢 |
| Documento timbrado com chancela | Should | Emissão nova 🔴 |
| Fechamento anual automático | Could | Sem base legada; processamento é sob demanda 🔴 |
| Posição exata na matriz impressa | Must | Paridade do cabeçalho impresso 🟢 |

---

## Rastreabilidade de Código

| Arquivo | Função / Papel | Cobertura |
|---------|----------------|-----------|
| `ieducar/intranet/educar_historico_escolar_cad.php` | Vida pregressa (processo 578, nível 7) | 🟢 |
| `ieducar/intranet/educar_historico_escolar_det.php` | Detalhe com restrição por vínculo | 🟢 |
| `ieducar/intranet/educar_historico_escolar_lst.php` | Listagem por aluno | 🟢 |
| `ieducar/modules/HistoricoEscolar/Views/ProcessamentoController.php` | Tela de processamento (processo 999613, nível 7) | 🟢 |
| `ieducar/modules/HistoricoEscolar/Views/ProcessamentoApiController.php` | Backend do processamento e remoção | 🟢 |
| `app/Services/SchoolHistoryService.php` | Sequencial, escola, transferência automática e média geral | 🟢 |
| `app/Models/LegacySchoolHistory.php` | Cabeçalho `pmieducar.historico_escolar` | 🟢 |
| `app/Models/LegacySchoolHistoryDiscipline.php` | Linhas `pmieducar.historico_disciplinas` | 🟢 |
| `app/Models/SchoolHistoryStatus.php` | Códigos de situação | 🟢 |
| migrações `historico_escolar`/`historico_disciplinas`/`historico_grade_curso` | Modelo de dados | 🟢 |
| migrações 2026 `populate_historico_escolar_id` / `organiza_index` | Higiene tardia da base | 🟢 |
| `ieducar/transferencia_solicitacao_cad.php` | Gatilho da transferência automática | 🟢 |
| `ieducar/lib/App/Unificacao/Aluno.php` | Movimentação na unificação (unit `Unification`) | 🟢 |
| `ieducar/intranet/educar_matricula_historico_cad.php` | Histórico de enturmações (unit `Enrollments`, por referência) | 🟢 |
