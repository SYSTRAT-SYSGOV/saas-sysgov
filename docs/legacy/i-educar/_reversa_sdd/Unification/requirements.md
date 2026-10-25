# Unification (i-Educar legado)

> Unit do plano de extração do Reversa (`granularity = module`). Motor de fusão, deduplicação e reversão de registros duplicados de pessoas físicas (`cadastro.pessoa`, `App_Unificacao_Pessoa`), servidores escolares (`pmieducar.servidor`, `App_Unificacao_Servidor`) e alunos (`pmieducar.aluno`, `App_Unificacao_Aluno`), log de auditoria com snapshots de dados anteriores (`pmieducar.log_unificacao`, `pmieducar.log_unificacao_old_data`) e serviço de reversão de unificação com controle hierárquico de alçada (`StudentUnificationService`, `StudentLogUnificationController`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.
> Rastreabilidade: `ieducar/lib/App/Unificacao/Base.php`, `ieducar/lib/App/Unificacao/Pessoa.php`, `ieducar/lib/App/Unificacao/Aluno.php`, `ieducar/lib/App/Unificacao/Servidor.php`, `app/Services/UnificationService.php`, `app/Services/StudentUnificationService.php`, `app/Models/LogUnification.php`, `app/Models/LogUnificationOldData.php`, `app/Http/Controllers/StudentLogUnificationController.php`, `app/Http/Controllers/PersonLogUnificationController.php`.

---

## Recorte (evitar duplicação)

- A **unit `People`** cobre o ciclo de vida e atributos civis da pessoa física (`cadastro.pessoa`, `cadastro.fisica`); esta unit detalha o mecanismo transacional de fusão de homônimos e deduplicação cadastral.
- A **unit `Servidores`** cobre a vida funcional e lotações; esta unit detalha a repontuação de funções, alocações e histórico de afastamento durante a unificação de dois registros de servidor.
- A **unit `Enrollments`** cobre matrículas e enturmações; esta unit detalha a repontuação do histórico escolar com deslocamento sequencial e transferência de matrículas durante a fusão de alunos.
- Alvo canônico SYSGOV: `PersonUnificationService`, `educa_student_unifications`, `core_person_unification_logs` com snapshot JSON e reversão transacional auditada (ADR-003). 🟢

---

## Visão Geral

Nas redes municipais de ensino, erros de digitação, cadastros incompletos e ausência de CPF na primeira infância geram proliferação de cadastros duplicados para o mesmo cidadão, aluno ou professor.
O i-Educar legado implementa um mecanismo de deduplicação estruturado em três níveis: (1) **Unificação de Pessoa** (`App_Unificacao_Pessoa`), que percorre 45 tabelas relacionais transferindo chaves estrangeiras; (2) **Unificação de Servidor** (`App_Unificacao_Servidor`), que unifica matrículas, histórico de faltas e alocações antes da pessoa; e (3) **Unificação de Aluno** (`App_Unificacao_Aluno`), que reponta matrículas vigentes e reordena sequenciais do histórico escolar (`pmieducar.historico_escolar` e `historico_disciplinas`). Para viabilizar rastreabilidade e reversibilidade, a camada Laravel implementa `LogUnification` e `LogUnificationOldData`, persistindo payloads serializados dos registros alterados. Contudo, enquanto a unificação de alunos possui reversão operacional (`StudentUnificationService::undo`), a reversão de pessoa física é irreversível no legado (método ausente no controller). Além disso, a rotina legada desabilita gatilhos do PostgreSQL via DDL fora de transação atômica (`ALTER TABLE ... DISABLE TRIGGER ALL`), gerando sérios riscos de corrupção caso ocorra falha intermediária. 🟢

---

## Responsabilidades

### Família 1 — Unificação de Pessoas Físicas (`App_Unificacao_Pessoa`, `App_Unificacao_Base`)

- Classificar e processar chaves relacionais em três conjuntos operacionais: (a) *Manter Primeiro Vínculo* (12 tabelas de propriedade civil, como `cadastro.fisica`, `documento`, `foto`); (b) *Manter Todos os Vínculos* (tabelas de referência onde a pessoa atua como pai, mãe, responsável ou testemunha); (c) *Deletar Duplicados* (`portal.funcionario`). 🟢 `Base.php:9-15`, `Pessoa.php:5-205`
- Bloquear a unificação de pessoas quando houver mais de um aluno ativo vinculado aos registros candidatos, orientando o usuário a unificar os alunos previamente. 🟢 `Pessoa.php:220-228`
- Executar previamente a unificação de servidor (`App_Unificacao_Servidor`) quando a pessoa for também identificada como servidor municipal. 🟢 `Pessoa.php:213-218`
- Desabilitar em lote todas as triggers das tabelas envolvidas antes da migração e reabilitá-las após o término, mantendo ativas apenas as triggers estritamente necessárias (`trigger_when_deleted_pmieducar_aluno`). 🟢 `Base.php:46-51`, `Base.php:167-185`

### Família 2 — Unificação de Alunos (`App_Unificacao_Aluno`)

- Repontuar históricos escolares em `pmieducar.historico_escolar` e `pmieducar.historico_disciplinas`, somando o `MAX(sequencial)` do aluno principal para evitar colisões de chave composta. 🟢 `Aluno.php:18-38`
- Transferir todas as matrículas ativas e encerradas (`pmieducar.matricula`) dos alunos duplicados para o aluno principal. 🟢 `Aluno.php:41`
- Desativar logicamente os alunos duplicados (`ativo = 0`, `data_exclusao = NOW()`) e reativar o aluno principal garantindo `data_exclusao = NULL`. 🟢 `Aluno.php:40-42`
- Registrar snapshot detalhado dos históricos e matrículas anteriores antes de qualquer alteração física no banco. 🟢 `Aluno.php:62-100`

### Família 3 — Rastreamento, Auditoria e Snapshots (`LogUnification`, `UnificationService`)

- Gravar registro mestre de unificação com ID principal (`main_id`), IDs duplicados (`duplicates_id`), autor (`created_by`), tipo polimórfico (`Student` ou `Individual`) e status ativo. 🟢 `app/Models/LogUnification.php:21-60`
- Persistir o estado anterior completo dos registros em formato JSON em `pmieducar.log_unificacao_old_data` por tabela e chave. 🟢 `app/Services/UnificationService.php:9-19`
- Expor histórico paginado de unificações para consulta da Secretaria de Educação. 🟢 `StudentLogUnificationController.php:13-37`, `PersonLogUnificationController.php:11-34`

### Família 4 — Reversão de Unificação (`StudentUnificationService`)

- Reverter unificação de aluno restaurando registros ao estado anterior com base nos logs de snapshot (`adapter->undo`). 🟢 `StudentUnificationService.php:27-38`
- Validar se a unificação está ativa e se o aluno principal ainda existe na base antes de autorizar a reversão. 🟢 `StudentUnificationService.php:40-51`
- Aplicar matriz de controle de acesso hierárquico por escola e alçada institucional para permissão de desfazimento. 🟢 `StudentUnificationService.php:56-100`
- Marcar o log de unificação como inativo (`active = false`) e registrar o usuário executor da reversão em `updated_by`. 🟢 `StudentUnificationService.php:35-37`

---

## Regras de Negócio

| Regra | Evidência | Confiança |
|---|---|---|
| Unificação de pessoa é proibida se mais de uma pessoa do conjunto possuir aluno ativo atrelado; exige-se unificar os alunos primeiro. | 🟢 `ieducar/lib/App/Unificacao/Pessoa.php:223-228` | 🟢 CONFIRMADO |
| Na unificação de aluno, o sequencial do histórico escolar das duplicadas é deslocado pela fórmula `sequencial = sequencial + MAX(sequencial_principal)`. | 🟢 `ieducar/lib/App/Unificacao/Aluno.php:19-28` | 🟢 CONFIRMADO |
| Servidor duplicado repontua faltas, alocações e funções, preservando a propriedade funcional e o código INEP apenas no servidor mestre. | 🟢 `ieducar/lib/App/Unificacao/Servidor.php:7-60` | 🟢 CONFIRMADO |
| Desfazimento de unificação de aluno só pode ser executado por usuário de nível escolar se a unificação original tiver sido realizada por usuário da mesma unidade escolar. | 🟢 `app/Services/StudentUnificationService.php:80-88` | 🟢 CONFIRMADO |
| Unificação já revertida (`active = false`) não pode sofrer nova reversão (`UndoInactiveUnification`). | 🟢 `app/Services/StudentUnificationService.php:42-44` | 🟢 CONFIRMADO |
| No legado, a reversão de unificação de pessoa física não está implementada na interface web (`PersonLogUnificationController::undo` inexistente), tornando a fusão de pessoa irreversível. | 🟢 `app/Http/Controllers/PersonLogUnificationController.php:1-48` | 🟢 CONFIRMADO |
| A rotina desabilita gatilhos usando `ALTER TABLE ... DISABLE TRIGGER ALL`, o que exige privilégios de superusuário no PostgreSQL e ignora transações da aplicação. | 🟢 `ieducar/lib/App/Unificacao/Base.php:172` | 🟢 CONFIRMADO |
| Consultas de exclusão e atualização interpolam arrays de inteiros diretamente na instrução SQL sem bind parametrizado. | 🟢 `ieducar/lib/App/Unificacao/Base.php:65-80` | 🟢 CONFIRMADO |
| Durante a fusão de alunos, o aluno principal tem sua `data_exclusao` limpa (`NULL`) para reativação imediata. | 🟢 `ieducar/lib/App/Unificacao/Aluno.php:40` | 🟢 CONFIRMADO |
| Snapshots anteriores são salvos individualmente linha por linha em `pmieducar.log_unificacao_old_data` antes das mutações. | 🟢 `ieducar/lib/App/Unificacao/Base.php:205-221`, `Aluno.php:62-100` | 🟢 CONFIRMADO |

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|---|---|---|---|
| UNF-01 | Unificação atômica de registros duplicados de pessoas físicas com repontuação de 45 tabelas dependentes. | Must | 🟢 `App_Unificacao_Pessoa`, `Base.php` |
| UNF-02 | Unificação de alunos com reordenação sequencial de históricos escolares e transferência integral de matrículas. | Must | 🟢 `App_Unificacao_Aluno.php:10-45` |
| UNF-03 | Gravação obrigatória de snapshot prévio em formato JSON para auditoria e suporte a rollback. | Must | 🟢 `UnificationService.php:9-19` |
| UNF-04 | Reversão transacional completa de unificação de alunos (`undo`) com validação de alçada de usuário. | Must | 🟢 `StudentUnificationService.php:27-51` |
| UNF-05 | Reversão transacional de unificação de pessoas físicas com restauração de integridade civil e familiar. | Must (Alvo) | 🔴 Ausente no legado; obrigatório no alvo |
| UNF-06 | Bloqueio impeditivo de unificação de pessoas com alunos múltiplos ativos sem unificação prévia dos discentes. | Must | 🟢 `Pessoa.php:220-228` |
| UNF-07 | Tela de consulta e filtragem do log de unificações por nome, CPF e escola com visão dos dados alterados. | Should | 🟢 `StudentLogUnificationController`, `PersonLogUnificationController` |
| UNF-08 | Transação atômica em nível de isolamento estrito sem emissão de comandos DDL de desativação de triggers. | Must (Alvo) | 🟢 Diretriz ADR-003 |

---

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|---|---|---|---|
| Segurança | Bloqueio de injeção SQL substituindo interpolação de strings por prepared statements com bindings. | 🟢 `Base.php:65-80` | 🟡 |
| Atomicidade | A unificação deve ocorrer 100% dentro de `DB::transaction`; falhas em qualquer tabela revertem toda a operação. | 🟢 `Base.php:42-55` | 🟡 |
| Auditoria | Registro indelével do usuário responsável, data/hora, IP e snapshot completo diferencial. | 🟢 `LogUnification.php` | 🟢 |
| Desempenho | O processo de unificação percorre dezenas de tabelas sequencialmente; no alvo deve executar sob timeout seguro e sem table locks prolongados. | 🟢 `Base.php:57-146` | 🟡 |
| Integridade | O desfazimento da unificação não pode quebrar chaves estrangeiras caso novos registros tenham sido inseridos após a fusão. | 🔴 Risco estrutural no legado | 🔴 |

---

## Critérios de Aceitação

```gherkin
Cenário: Fusão de alunos duplicados com reordenação de histórico
  Dado que o aluno A (principal) possui histórico escolar com sequencial 1 e 2
  E o aluno B (duplicado) possui histórico escolar com sequencial 1 e 2
  Quando for executada a unificação do aluno B no aluno A
  Então o aluno A deve passar a deter os históricos de B com sequenciais 3 e 4
  E as matrículas de B devem apontar para o aluno A
  E o aluno B deve ser inativado com data_exclusao preenchida
  E o log de auditoria deve conter o snapshot dos dados originais de B.

Cenário: Tentativa de reversão de unificação por usuário sem permissão de alçada
  Dado que a unificação foi realizada por um gestor da Escola Municipal Norte
  Quando um secretário da Escola Municipal Sul tentar reverter a unificação
  Então a operação deve ser rejeitada com erro WithoutPermission
  E o status da unificação deve permanecer inalterado como ativo.

Cenário: Bloqueio de unificação de pessoa com múltiplos alunos ativos
  Dado que a pessoa civil X está associada ao aluno ativo 10
  E a pessoa civil Y está associada ao aluno ativo 20
  Quando o operador tentar unificar a pessoa Y na pessoa X
  Então o sistema deve recusar a operação antes de efetuar qualquer alteração
  E exibir mensagem orientando a unificar os alunos 10 e 20 previamente.
```

---

## Prioridade (MoSCoW)

| Item | Prioridade | Justificativa |
|---|---|---|
| Unificação Transacional de Alunos | Must | Resolve a inconsistência mais crítica das escolas e viabiliza emissão de histórico unificado. |
| Reversão com Alçada de Acesso (Undo) | Must | Mecanismo de segurança essencial para desfazer fusões indevidas executadas por engano. |
| Gravação de Snapshot JSON de Auditoria | Must | Base documental para rollback e conformidade de integridade do banco. |
| Unificação de Pessoa Física e Servidor | Must | Elimina homônimos e duplicidades no cadastro corporativo municipal. |
| Reversão de Unificação de Pessoa | Should | Lacuna grave do legado que deve ser sanada no modelo canônico novo. |
| Interface Visual Comparativa de Diferenças | Should | Permite ao gestor visualizar lado a lado os dados conflitantes antes de bater o martelo. |

---

## Rastreabilidade de Código

| Arquivo Legado | Classe / Função Principal | Escopo / Cobertura |
|---|---|---|
| `ieducar/lib/App/Unificacao/Base.php` | `App_Unificacao_Base` | Mecanismo genérico de processamento de chaves, desativação de triggers e captura de snapshots. |
| `ieducar/lib/App/Unificacao/Pessoa.php` | `App_Unificacao_Pessoa` | Catálogo de 45 tabelas da pessoa física, validação de alunos múltiplos e precedência de servidor. |
| `ieducar/lib/App/Unificacao/Aluno.php` | `App_Unificacao_Aluno` | Deslocamento de sequencial de histórico escolar, repontuação de matrículas e inativação de duplicados. |
| `ieducar/lib/App/Unificacao/Servidor.php` | `App_Unificacao_Servidor` | Repontuação de alocações, faltas, afastamentos e funções docentes de servidores duplicados. |
| `app/Services/UnificationService.php` | `UnificationService::storeLogOldData` | Gravação de registros de snapshot em `pmieducar.log_unificacao_old_data`. |
| `app/Services/StudentUnificationService.php` | `StudentUnificationService::undo` | Validações de alçada de escola e execução do rollback da unificação de aluno. |
| `app/Models/LogUnification.php` | `LogUnification` (Eloquent Model) | Registro mestre polimórfico de unificações realizadas no sistema. |
| `app/Models/LogUnificationOldData.php` | `LogUnificationOldData` | Armazenamento de payloads em formato JSON para reversão. |
| `app/Http/Controllers/StudentLogUnificationController.php` | `StudentLogUnificationController` | Interface web para listagem, visualização de detalhes e acionamento de reversão de alunos. |
| `app/Http/Controllers/PersonLogUnificationController.php` | `PersonLogUnificationController` | Interface web para visualização de unificações de pessoas físicas. |
