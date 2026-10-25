# HistoricoEscolar (i-Educar legado), Flows

> Fluxos observados no código legado. Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## F-01: Cadastro da vida pregressa

**Ator:** secretaria com acesso ao processo 578 (nível 7). 🟢 `educar_historico_escolar_cad.php:96-97`

1. Abre a tela a partir da listagem do aluno (`ref_cod_aluno` na URL); pode vir com `sequencial` (edição) ou como cópia (GET `copia` oculta a ação de excluir e preenche o formulário do registro de origem). 🟢 `educar_historico_escolar_cad.php:115-119`
2. Define a escola: da rede (nome e município da instituição) ou externa, com indicador "fora do município", UF e país. 🟢 `:170-208`
3. Informa curso, série (nome), ano, assentamento (registro, livro, folha), situação (enum filtrado), frequência, cargas, dias letivos, marcas de extra-curricular, aceleração e dependência. 🟢 `:210-249`
4. Adiciona disciplina por linha (tabela dinâmica): disciplina (do componente ou digitada), base curricular (comum/diversificada), nota, faltas, carga, ordem e dependência da linha. 🟢 `:275-288`
5. Gravação transacional: sequencial automático (máximo + 1), cabeçalho com autor, disciplinas recriadas do array submetido. 🟢 `:310-330` e `SchoolHistoryService.php:102-105`
6. Erros de validação reiniciam o formulário com mensagens; exclusão lógica do cabeçalho com exclusão física das linhas. 🟡 `:366-380`

## F-02: Processamento consolidado de uma matrícula

**Ator:** operador com acesso ao processo 999613 (nível 7). 🟢 `ProcessamentoController.php:17-18`

1. O operador escolhe ano, instituição, escola, curso, série, turma e matrícula (filtros opcionais) e marca as opções de fonte por campo (boletim, AP fixo ou manual) e o alcance (todas as matrículas, somente dependências). 🟢 `ProcessamentoController.php:37-235`, `:57-66`
2. O formulário exige dias letivos, grade curso e percentual de frequência como mínimo; quando posição é exigida pela bandeira institucional, o campo passa a ser obrigatório. 🟢 `:86-115`, `:270-277`
3. A grade lista as matrículas com situação do histórico e estado por linha; o operador processa matrícula a matrícula. 🟢 `ProcessamentoApiController.php:997-1089`
4. Para cada processamento, o backend valida os parâmetros (presença, numérico e existência em banco, inclusive a grade), abre transação e identifica aluno, ano, dados da matrícula e da escola. 🟢 `:549-554`
5. Se já existe histórico do aluno no ano (por matrícula), reprocessa o existente mantendo o sequencial; senão cria com o próximo. 🟢 `:577-587`
6. As disciplinas são apagadas e recriadas: do boletim (componente, nota arredondada, faltas, carga) ou manuais; no modo "AP" a nota fica "AP"; faltas globalizadas só no regime geral da regra. 🟢 `:663-884`
7. Marcações de média por área (linhas por área substituem as de componentes) e de média geral (linha "Média Geral" arredondada pela tabela da regra) são aplicadas. 🟢 `ProcessamentoController.php:222-233`, `SchoolHistoryService.php:66-88`
8. A resposta devolve a situação do histórico e o link do detalhe; erro no meio da transação faz rollback com mensagem. 🟢 `:589-599`

## F-03: Remoção do histórico de uma matrícula

1. O operador solicita a remoção na grade do processamento (ou na tela do histórico). 🟢 `ProcessamentoApiController.php:436-467`
2. O backend valida a permissão, localiza o cabeçalho por (aluno, ano, matrícula), marca `ativo = 0` com autor e data e apaga as linhas de disciplina. 🟢 `:444-455`
3. A listagem do aluno passa a não exibir a etapa excluída. 🟡

## F-04: Histórico automático de transferência

**Ator:** sistema, ao gravar a solicitação de transferência. 🟢 `educar_transferencia_solicitacao_cad.php:263`

1. Com a bandeira `gerar_historico_transferencia` da instituição ligada (unit `Configuracao`), o serviço é chamado no cadastro da transferência. 🟢 `SchoolHistoryService.php:19-25`
2. O serviço escolhe a grade de modelo pela organização do curso (nome contendo "8" → séries; senão anos) e monta o cabeçalho com situação 4 (Tran) e dados da escola. 🟢 `:26-28`
3. Cria o histórico com as disciplinas da série (sem notas, sem faltas) e o assentamento não-preenchido; o registro fica visível na listagem do aluno. 🟢 `:30-64`

## F-05: Restrição de edição

1. Na tela de detalhe, com `restringir_historico_escolar` ligada, o sistema avalia o usuário: nível institucional ou superior passa direto. 🟢 `educar_historico_escolar_det.php:211-242`
2. Para os demais, libera edição somente se o usuário está vinculado à escola da última matrícula do aluno. 🟢 `:215-240`
3. Sem edição liberada: leitura; com liberação: mesmas ações da vida pregressa. 🟢

## F-06: Unificação de alunos

1. Na unificação, o histórico e as linhas do aluno duplicado são movidos para o aluno vencedor com log do movimento. 🟢 `ieducar/lib/App/Unificacao/Aluno.php:24-76` (unit `Unification`)

## F-07: Documento oficial timbrado (novo)

1. O bastão pede a emissão do documento oficial com chancela digital a partir dos históricos; não há paridade no legado (units `Reports` e bastão). 🔴
