# Design — Unification (i-Educar legado)

> Arquitetura, estrutura de classes, fluxo de dados e decisões de design do motor de unificação e reversão.
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

---

## Interface

### Entidades do Domínio Legado

- **`LogUnification` (`pmieducar.log_unificacao`):** Registro mestre da operação de unificação. Campos: `id` (serial/PK), `main_id` (inteiro referenciando aluno ou pessoa principal), `duplicates_id` (varchar/text de IDs unificados), `duplicates_name` (string descritiva), `type` (polimórfico: `App\Models\Student` ou `App\Models\Individual`), `created_by` (FK do usuário executor), `updated_by` (FK do usuário que executou rollback), `active` (booleano, 1 = unificação em vigor, 0 = revertida), `created_at`, `updated_at`.
- **`LogUnificationOldData` (`pmieducar.log_unificacao_old_data`):** Snapshot dos dados anteriores. Campos: `id` (serial/PK), `unification_id` (FK `log_unificacao`), `table` (nome completo com schema da tabela modificada), `keys` (JSON com as chaves primárias dos registros), `old_data` (JSON contendo o snapshot linha a linha dos campos antes do update/delete).

### Endpoints HTTP e Interfaces Web

| Rota / Arquivo Legado | Método | Parâmetros | Finalidade / Ação |
|---|---|---|---|
| `GET /unificacao-aluno` | GET | `name`, `ref_cod_escola` | Listagem paginada de unificações de alunos com filtros por escola e nome. |
| `GET /unificacao-aluno/{unification}` | GET | `unification` (ID) | Exibição de detalhes da unificação de aluno e relação de dados anteriores. |
| `POST /unificacao-aluno/{unification}/desfazer` | POST | `unification` (ID) | Execução do desfazimento (`undo`) da unificação de aluno pelo serviço. |
| `GET /unificacao-pessoa` | GET | `name`, `cpf` | Listagem paginada de unificações de pessoas físicas com busca por CPF. |
| `GET /unificacao-pessoa/{unification}` | GET | `unification` (ID) | Detalhe da unificação de pessoa física e dados mesclados. |
| `GET /module/Api/Pessoa?dadosUnificacaoPessoa` | GET | `pessoas_ids` | Endpoint AJAX que compara atributos das pessoas antes da confirmação da fusão. |

### Funções e Classes Principais

- **`App_Unificacao_Base`:** Classe base abstrata/concreta que gerencia desativação de triggers, iteração sobre conjuntos de chaves e chamada ao serviço de logs. 🟢 `Base.php:7-55`
- **`App_Unificacao_Pessoa`:** Especialização para pessoa física; cataloga 45 tabelas associadas em três categorias de manipulação. 🟢 `Pessoa.php:3-230`
- **`App_Unificacao_Aluno`:** Procedimento estático que reordena sequenciais do histórico, transfere matrículas e desativa duplicatas. 🟢 `Aluno.php:8-45`
- **`StudentUnificationService`:** Serviço Laravel com controle de permissão e chamada ao adaptador para reversão de aluno. 🟢 `StudentUnificationService.php:12-40`

---

## Fluxo Principal

```
1. Seleção e Comparação Prévia:
   [Operador] -> Seleciona o cadastro principal e um ou mais cadastros duplicados.
   -> API /module/Api/Pessoa?dadosUnificacaoPessoa retorna comparativo de filiação, CPF e dados escolares.

2. Disparo da Operação de Unificação:
   [Controller / Script] -> Instancia App_Unificacao_Pessoa ou App_Unificacao_Aluno.
   -> Valida parâmetros (código principal, lista de duplicados, usuário logado).
   -> Verifica restrições: se houver múltiplos alunos ativos vinculados, aborta imediatamente.

3. Gravação de Snapshots:
   -> Antes de qualquer mutação física, UnificationService::storeLogOldData lê os registros
      existentes e grava em pmieducar.log_unificacao_old_data com serialização JSON.

4. Repontuação Relacional:
   -> Para Alunos: Calcula MAX(sequencial) e desloca o sequencial do histórico escolar
      (historico_escolar e historico_disciplinas). Transfere matrículas para o aluno principal.
   -> Para Pessoas: Executa unificação de servidor prévia (se aplicável), remove duplicados
      em tabelas de propriedade exclusiva e atualiza chaves estrangeiras em tabelas de referência.

5. Encerramento:
   -> Desativa os cadastros duplicados (ativo = 0, data_exclusao = NOW()).
   -> Garante a reativação do cadastro principal (data_exclusao = NULL).
   -> Grava cabeçalho em pmieducar.log_unificacao com status active = 1.
```

---

## Fluxos Alternativos

- **Reversão de Unificação de Aluno (`Undo`):**
  1. Operador acessa a visualização da unificação em `/unificacao-aluno/{id}` e aciona "Desfazer".
  2. `StudentUnificationService` valida se a unificação está ativa e verifica a alçada hierárquica do operador (mesma escola ou nível institucional).
  3. O adaptador lê os snapshots de `log_unificacao_old_data` e restaura as foreign keys originais das matrículas e históricos.
  4. Os alunos duplicados são reativados com `ativo = 1` e `data_exclusao = NULL`.
  5. O registro de unificação tem `active` alterado para `false` e `updated_by` preenchido.
- **Falha de Validação de Alunos Múltiplos:**
  1. O operador tenta unificar duas pessoas físicas que possuem alunos ativos distintos.
  2. `App_Unificacao_Pessoa::validaParametros` detecta `numero_alunos > 1`.
  3. A transação é abortada sem tocar no banco, emitindo exceção amigável instruindo a unificar os alunos primeiro.

---

## Dependências

| Módulo / Camada | Dependência | Tipo de Relação |
|---|---|---|
| `People` (`cadastro.*`) | Alvo principal de desduplicação civil e repontuação de documentos e endereços. | Fonte / Destino |
| `Servidores` (`pmieducar.servidor*`) | Executada preliminarmente para garantir a integridade da carreira docente. | Subordinada |
| `Enrollments` (`pmieducar.matricula`) | Transferência de histórico e enturmações escolares do aluno. | Subordinada |
| `Storage / Database` | Dependência direta de permissões DDL no PostgreSQL para comandos de trigger. | Infraestrutura |

---

## Decisões de Design Identificadas

| Decisão | Evidência no Código | Confiança |
|---|---|---|
| Categorização de tabelas em três grupos operacionais: exclusão de duplicatas, primeiro vínculo e todos os vínculos. | 🟢 `Base.php:9-15` | 🟢 CONFIRMADO |
| Deslocamento do sequencial do histórico escolar por adição do `MAX(sequencial)` mestre, prevenindo colisão de índices únicos compostos. | 🟢 `Aluno.php:27, 35` | 🟢 CONFIRMADO |
| Desativação global de triggers via comando DDL (`ALTER TABLE ... DISABLE TRIGGER ALL`) durante a execução da unificação. | 🟢 `Base.php:172` | 🟢 CONFIRMADO |
| Persistência de snapshots em formato JSON por linha e tabela para permitir auditoria e rollback. | 🟢 `UnificationService.php:14-16` | 🟢 CONFIRMADO |
| Controle de permissão de reversão restrito à mesma escola de origem ou nível institucional superior. | 🟢 `StudentUnificationService.php:80-99` | 🟢 CONFIRMADO |
| Assimetria na reversão: unificação de aluno é reversível, enquanto unificação de pessoa física não possui método de reversão na UI. | 🟢 `PersonLogUnificationController` vs `StudentLogUnificationController` | 🟢 CONFIRMADO |

---

## Estado Interno

- **`pmieducar.log_unificacao.active`:** `1` (unificação consolidada e em vigor), `0` (unificação desfeita por operação de rollback).
- **`pmieducar.aluno.ativo` (Duplicado):** Transicionado para `0` com preenchimento de `data_exclusao = NOW()` e `ref_usuario_exc`.
- **`pmieducar.aluno.ativo` (Principal):** Mantido em `1` com limpeza forçada de `data_exclusao = NULL`.

---

## Observabilidade

- Cada operação de unificação gera registro permanente em `pmieducar.log_unificacao` identificando o usuário criador (`created_by`), data de execução e os IDs serializados. 🟢 `LogUnification.php`
- Operações de reversão registram o usuário responsável pelo desfazimento em `updated_by` e o timestamp da reversão em `updated_at`. 🟢 `StudentUnificationService.php:36`
- Snapshots detalhados em `pmieducar.log_unificacao_old_data` permitem auditoria forense campo a campo das mutações realizadas no banco. 🟢 `LogUnificationOldData.php`

---

## Riscos e Lacunas

- 🔴 **Comandos DDL fora de transação atômica:** A desativação de triggers com `DISABLE TRIGGER ALL` não é transacional no PostgreSQL. Caso o processo seja interrompido por timeout de PHP ou queda de conexão, as triggers de integridade do banco permanecerão desabilitadas indefinidamente.
- 🔴 **Injeção SQL por interpolação de identificadores:** O código legado interpola strings de IDs concatenados (`WHERE coluna IN ({$stringCodigosDuplicados})`), criando vulnerabilidade grave se os parâmetros não forem estritamente sanitizados.
- 🔴 **Irreversibilidade da unificação de pessoas civis:** O sistema não possui rotina implementada para desfazer a fusão de pessoas físicas, o que significa que uma unificação errônea de dois cidadãos homônimos exige intervenção manual de banco de dados para correção.
- 🟡 **Ausência de bloqueio pessimista:** A ausência de `SELECT ... FOR UPDATE` nas pessoas/alunos durante a unificação permite que novas matrículas ou alterações cadastrais sejam inseridas em paralelo enquanto a migração das chaves está em curso.
