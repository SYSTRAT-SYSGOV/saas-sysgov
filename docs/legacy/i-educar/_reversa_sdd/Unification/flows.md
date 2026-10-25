# Fluxos — Unification (i-Educar legado)

> Fluxos operacionais, transacionais e de reversão do motor de unificação de pessoas e alunos.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

### Fluxo 1 — Unificação Cadastral de Pessoas Físicas
- **Gatilho:** Gestor municipal identifica duas fichas civis de pessoa física pertencentes ao mesmo indivíduo.
- **Passos:**
  1. O usuário aciona o assistente de unificação informando a pessoa principal e as duplicadas.
  2. `App_Unificacao_Pessoa::validaParametros` valida se há mais de um aluno ativo no grupo; se houver, recusa a operação. 🟢 `Pessoa.php:220-228`
  3. Se a pessoa for identificada como servidor, dispara previamente `App_Unificacao_Servidor::unifica`. 🟢 `Pessoa.php:213-218`
  4. O sistema desabilita triggers via `ALTER TABLE ... DISABLE TRIGGER ALL`. 🟢 `Base.php:167-174`
  5. As triggers estritamente necessárias são reativadas (`trigger_when_deleted_pmieducar_aluno`). 🟢 `Base.php:160-165`
  6. Para cada tabela, `storeLogOldDataByKeys` salva o snapshot anterior em `pmieducar.log_unificacao_old_data`. 🟢 `Base.php:205-221`
  7. Processa exclusão e atualização nas 45 tabelas associadas (`processaChavesDeletarDuplicados`, `processaChavesManterPrimeiroVinculo`, `processaChavesManterTodosVinculos`). 🟢 `Base.php:57-146`
  8. O sistema reabilita todas as triggers via `ALTER TABLE ... ENABLE TRIGGER ALL`. 🟢 `Base.php:176-185`

---

### Fluxo 2 — Unificação de Alunos Duplicados
- **Gatilho:** Secretaria escolar constata que um aluno possui duas matrículas distintas sob códigos de aluno diferentes.
- **Passos:**
  1. O usuário seleciona o aluno mestre e a lista de alunos duplicados.
  2. `App_Unificacao_Aluno::validaParametros` valida a tipagem dos identificadores informados. 🟢 `Aluno.php:47-60`
  3. O método `logData` captura os registros de histórico escolar, disciplinas, matrículas e dados cadastrais antes da fusão. 🟢 `Aluno.php:62-100`
  4. Para cada aluno duplicado, calcula `maxSequencialAlunoPrincipal` em `pmieducar.historico_escolar`. 🟢 `Aluno.php:19-22`
  5. Atualiza `pmieducar.historico_escolar` somando o sequencial máximo para evitar duplicação de chave. 🟢 `Aluno.php:23-29`
  6. Atualiza `pmieducar.historico_disciplinas` somando o mesmo deslocamento sequencial. 🟢 `Aluno.php:31-37`
  7. Reativa o aluno principal definindo `data_exclusao = null`. 🟢 `Aluno.php:40`
  8. Repontua todas as matrículas dos alunos duplicados para o aluno principal. 🟢 `Aluno.php:41`
  9. Desativa os alunos duplicados com `ativo = 0`, `data_exclusao = now()` e `ref_usuario_exc`. 🟢 `Aluno.php:42`

---

### Fluxo 3 — Reversão de Unificação de Aluno (Undo)
- **Gatilho:** Secretário escolar percebe que unificou dois alunos homônimos por engano e solicita o cancelamento.
- **Passos:**
  1. O usuário clica em "Desfazer" na tela de detalhes da unificação (`StudentLogUnificationController::undo`). 🟢 `StudentLogUnificationController.php:51-54`
  2. `StudentUnificationService::canUndo` verifica se a unificação está com `active = true`. 🟢 `StudentUnificationService.php:40-45`
  3. Verifica se o aluno mestre (`main`) ainda existe e está ativo na base; se não, lança `InactiveMainUnification`. 🟢 `StudentUnificationService.php:46-48`
  4. Executa `checkPermission`: valida se o usuário possui alçada escolar compatível ou institucional. 🟢 `StudentUnificationService.php:56-72`
  5. O adaptador do log lê os registros em `pmieducar.log_unificacao_old_data` e restaura as chaves e dados originais. 🟢 `StudentUnificationService.php:31-33`
  6. Altera o status da unificação para `active = false` e preenche `updated_by` com o usuário autenticado. 🟢 `StudentUnificationService.php:35-37`
  7. Redireciona o usuário com mensagem de confirmação de sucesso. 🟢

---

### Fluxo 4 — Bloqueio de Unificação por Conflito de Alunos Múltiplos
- **Gatilho:** Usuário tenta unificar dois cadastros de pessoas que possuem alunos ativos distintos.
- **Passos:**
  1. O usuário submete a unificação de pessoas pelo formulário.
  2. `App_Unificacao_Pessoa::validaParametros` executa query contando alunos ativos associados. 🟢 `Pessoa.php:223-225`
  3. O contador retorna valor maior que 1 (`numeroAlunos > 1`). 🟢 `Pessoa.php:225`
  4. Dispara exceção `CoreExt_Exception` com mensagem explicativa. 🟢 `Pessoa.php:226-227`
  5. A rotina encerra imediatamente antes de desabilitar triggers ou alterar qualquer tabela. 🟢

---

### Fluxo 5 — Unificação Preliminar de Servidores
- **Gatilho:** Unificação de pessoa física envolve indivíduo que também é servidor municipal.
- **Passos:**
  1. `App_Unificacao_Pessoa::unifica` instancia `App_Unificacao_Servidor`. 🟢 `Pessoa.php:215-216`
  2. Repontua funções em `pmieducar.servidor_funcao` para o servidor mestre. 🟢 `Servidor.php:38-41`
  3. Repontua faltas e atrasos em `pmieducar.falta_atraso`. 🟢 `Servidor.php:26-29`
  4. Repontua afastamentos em `pmieducar.servidor_afastamento` recalculando `sequencial` via `MAX()+1`. 🟢 `Base.php:243-255`
  5. Repontua alocações escolares em `pmieducar.servidor_alocacao`. 🟢 `Servidor.php:34-37`
  6. Remove cursos ministrados e disciplinas habilitadas duplicadas. 🟢 `Servidor.php:53-60`
  7. Retorna o controle para o fluxo principal de unificação de pessoas. 🟢

---

### Fluxo 6 — Consulta Comparativa Pré-Unificação (Diff Visual)
- **Gatilho:** Usuário acessa o assistente de unificação e quer checar os dados antes de confirmar.
- **Passos:**
  1. O frontend chama `GET /module/Api/Pessoa?dadosUnificacaoPessoa` passando a lista de IDs. 🟢 `PessoaController.php:735`
  2. O controller executa queries com junções em `cadastro.pessoa`, `cadastro.fisica` e tabelas de vínculos. 🟢
  3. Retorna array comparativo contendo CPF, nome da mãe, data de nascimento e flags de aluno/servidor. 🟢
  4. A interface exibe as divergências para conferência visual do gestor escolar. 🟢

---

### Fluxo 7 — Bloqueio de Desfazimento por Falta de Alçada Hierárquica
- **Gatilho:** Secretário de uma escola tenta reverter unificação realizada por outra unidade escolar.
- **Passos:**
  1. O usuário aciona a rota de desfazimento.
  2. `checkPermissionSchoolingLevel` obtém as escolas do usuário e as escolas do criador da unificação. 🟢 `StudentUnificationService.php:82-83`
  3. Executa interseção de arrays: `count(array_intersect($schoolsUser, $schoolsUnificationOwner)) < 1`. 🟢 `StudentUnificationService.php:85`
  4. Lança exceção `WithoutPermission`. 🟢 `StudentUnificationService.php:86`
  5. O controller intercepta a exceção e redireciona com mensagem de erro impeditiva. 🟢

---

### Fluxo 8 — Bloqueio de Rollback em Unificação Já Inativa
- **Gatilho:** Usuário tenta reverter uma unificação que já se encontra desfeita.
- **Passos:**
  1. A requisição de desfazimento chega ao serviço.
  2. `canUndo` avalia `!$unification->active`. 🟢 `StudentUnificationService.php:42`
  3. Identificando que `active` é falso, lança imediatamente `UndoInactiveUnification`. 🟢 `StudentUnificationService.php:43`
  4. Nenhuma query de reversão é executada. 🟢

---

### Fluxo 9 — Captura e Armazenamento Serializado de Snapshots
- **Gatilho:** Rotina de unificação se prepara para alterar uma tabela relacional.
- **Passos:**
  1. O método `storeLogOldDataByKeys` é invocado passando a tabela, coluna e IDs antigos. 🟢 `Base.php:205`
  2. Executa `getOldData` lendo as linhas existentes no banco. 🟢 `Base.php:229-236`
  3. Se houver dados, chama `UnificationService::storeLogOldData`. 🟢 `Base.php:214-220`
  4. Instancia `LogUnificationOldData` e salva com `json_encode` das chaves e dados. 🟢 `UnificationService.php:11-16`
  5. O snapshot fica disponível para auditoria e posterior processo de rollback. 🟢

---

## Fluxos Ausentes no Legado (🔴)

- 🔴 **Desfazimento de Unificação de Pessoas Físicas:** Inexistência de fluxo para reverter fusão de pessoas civis; a interface apenas exibe a visualização sem ação de reversão.
- 🔴 **Rollback Atômico em Queda de Conexão durante Comandos DDL:** Se a aplicação for interrompida após desabilitar triggers, o banco não possui mecanismo automático para reabilitá-las, exigindo script manual de contingência.
- 🔴 **Auditoria de Conflito de Matrícula no Mesmo Ano:** Se dois alunos unificados possuírem matrícula ativa no mesmo ano letivo e mesma série, o legado mescla cegamente gerando duplicidade de matrícula para o mesmo aluno.
