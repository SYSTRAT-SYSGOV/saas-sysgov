# Tarefas de Engenharia Reversa e Reconstrução — Unification

> Plano executável de migração e reconstrução do subsistema de Unificação, Deduplicação e Reversão Cadastral no SYS-Educa (SYSGOV).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Pré-requisitos

- Entidade canônica `Person` (`App\Models\Person`) consolidada no SYSGOV Core.
- Entidades `Student` e `Employee` com chaves estrangeiras tipadas para `people(id)`.
- Infraestrutura de logging e auditoria do SYSGOV (`audit_logs` ou subsistema de auditoria transacional).
- Banco de dados MySQL 8.0+ ou PostgreSQL com suporte a isolamento de transações `REPEATABLE READ`.

---

## Tarefas

### T-01 — Serviço Canônico de Unificação Transacional de Pessoas (`PersonUnificationService`)
- **Origem no legado:** `ieducar/lib/App/Unificacao/Base.php`, `App_Unificacao_Pessoa.php`.
- **Descrição:** Implementar serviço desacoplado de unificação de pessoas no SYSGOV Core, executando 100% dentro de `DB::transaction`, substituindo a desativação de triggers por deferimento de chaves estrangeiras (`DEFERRABLE INITIALLY DEFERRED`) ou atualização ordenada de dependências.
- **Critério de pronto:** Unificação migra com sucesso vínculos civis, documentos, contatos e filiações sem emitir comandos DDL e sem falhas de integridade referencial.

### T-02 — Mecanismo Transacional de Unificação de Alunos com Reordenação Sequencial
- **Origem no legado:** `ieducar/lib/App/Unificacao/Aluno.php`.
- **Descrição:** Reconstruir o algoritmo de unificação de alunos no SYS-Educa, calculando o deslocamento dinâmico de sequenciais do histórico escolar e transferindo todas as matrículas vigentes e encerradas para o aluno mestre.
- **Critério de pronto:** Histórico do aluno duplicado anexado ao aluno mestre sem colisão de chaves únicas, duplicatas marcadas como `UNIFIED`/inativas e matrículas reatribuídas.

### T-03 — Estrutura de Snapshot de Auditoria e Logs de Unificação (`educa_unification_logs`)
- **Origem no legado:** `app/Models/LogUnification.php`, `app/Models/LogUnificationOldData.php`.
- **Descrição:** Criar entidade de log com coluna JSON nativa (`before_state` e `after_state`) registrando as alterações executadas em cada tabela, o usuário responsável, data/hora e justificativa textual obrigatória.
- **Critério de pronto:** Payload diferencial serializado em JSON com índices GIN/funcionais para busca rápida por pessoa ou aluno envolvido.

### T-04 — Serviço Completo de Reversão com Alçada de Acesso (`UnificationRollbackService`)
- **Origem no legado:** `app/Services/StudentUnificationService.php:27-51`.
- **Descrição:** Desenvolver o mecanismo de desfazimento da unificação com suporte tanto para Alunos quanto para Pessoas Físicas, restaurando pontualmente os registros aos identificadores originais a partir do snapshot JSON.
- **Critério de pronto:** Operação de `undo` reativa as duplicatas, restaura os ponteiros de matrículas e marca o log como inativo, validando a matriz de alçadas institucionais do usuário.

### T-05 — Interface Gráfica Comparativa e Confirmação de Fusão
- **Origem no legado:** `GET /module/Api/Pessoa?dadosUnificacaoPessoa`.
- **Descrição:** Desenvolver tela comparativa lado a lado (diff visual) exibindo divergências de nome, data de nascimento, nome da mãe, CPF e endereço entre os cadastros candidatos antes da submissão da unificação.
- **Critério de pronto:** Usuário visualiza as diferenças em destaque e precisa assinalar declaração de ciência com justificativa formal antes de disparar a fusão.

---

## Tarefas de Teste

### TT-01 — Teste de Integridade Transacional e Rollback em Falha
- Forçar uma falha deliberada no meio da repontuação de tabelas e verificar se o banco de dados executa `ROLLBACK` completo sem deixar chaves órfãs ou triggers desligadas.

### TT-02 — Teste de Deslocamento Sequencial de Histórico Escolar
- Simular unificação de aluno principal com 3 registros históricos e aluno secundário com 2 registros históricos, confirmando que os registros secundários assumem sequenciais 4 e 5.

### TT-03 — Teste de Validação Hierárquica de Permissões no Desfazimento
- Testar tentativa de reversão por usuário de outra escola e verificar se a operação é bloqueada com exceção de autorização.

### TT-04 — Teste de Reversão de Unificação de Aluno (Undo)
- Executar unificação de aluno e em seguida acionar o desfazimento, confirmando que todas as matrículas retornam aos IDs de origem e o aluno duplicado volta ao status ativo.

---

## Tarefas de Migração de Dados

### TM-01 — Migração do Histórico de Unificações
- Extrair `pmieducar.log_unificacao` e `pmieducar.log_unificacao_old_data`, consolidando o snapshot em coluna JSON única na tabela `educa_unification_logs`.

---

## Ordem Sugerida

1. `T-03` (Estrutura de Snapshot de Auditoria e Logs)
2. `T-01` (Serviço Canônico de Unificação de Pessoas)
3. `T-02` (Mecanismo de Unificação de Alunos)
4. `T-04` (Serviço de Reversão / Rollback com Alçada)
5. `T-05` (Interface Gráfica Comparativa)
6. `TT-01` a `TT-04` (Bateria de Testes Automatizados)
7. `TM-01` (Migração do Histórico de Logs)

**Bloqueios:** `T-04` depende de `T-03` e `T-02`. `TT-04` depende de `T-04`.

---

## Lacunas Pendentes (🔴)

- 🔴 **Inexistência de Reversão para Pessoas no Legado:** A unificação civil de pessoa física não possui reversão implementada, exigindo criação de algoritmo inédito no modelo novo.
- 🔴 **Risco de Corrupção por Comandos DDL:** O uso de `DISABLE TRIGGER ALL` deve ser categoricamente banido na arquitetura nova, substituído por transações padrão ou locks específicos.
- 🔴 **Novas Matrículas Pós-Unificação:** Falta regra clara no desfazimento caso o aluno principal tenha recebido novas notas ou matrículas no intervalo entre a unificação e a reversão.
