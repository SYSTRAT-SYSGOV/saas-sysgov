# Perguntas e Lacunas — Unification (i-Educar legado)

> Inventário de dúvidas de negócio, fragilidades arquiteturais e inconsistências levantadas no código legado da Unificação.
> Todas as perguntas referenciam trechos literais de código (`arquivo.ext:linha`).

---

| # | Pergunta | Origem | Impacto | Dono | Prazo |
|---|---|---|---|---|---|
| 01 | Como substituir a desativação global de triggers via DDL (`DISABLE TRIGGER ALL`), que pode deixar o banco sem integridade se o processo falhar? | `ieducar/lib/App/Unificacao/Base.php:172` | Crítico (Integridade global do banco de dados) | Arquitetura | Sprint 1 |
| 02 | A unificação de pessoas físicas deve possuir suporte nativo a reversão (`undo`) no SYSGOV Core, superando a irreversibilidade do legado? | `app/Http/Controllers/PersonLogUnificationController.php:1-48` | Alto (Recuperação de falhas operacionais) | Produto / Arquitetura | Sprint 1 |
| 03 | Como tratar a unificação de alunos quando ambos possuem matrícula ativa no mesmo ano letivo, o que geraria um aluno matriculado duas vezes? | `ieducar/lib/App/Unificacao/Aluno.php:41` | Alto (Regra pedagógica e censo escolar) | Pedagógico | Sprint 1 |
| 04 | A interpolação direta de listas de IDs nas queries SQL deve ser completamente substituída por prepared statements com query builders tipados? | `ieducar/lib/App/Unificacao/Base.php:65-80` | Alto (Segurança contra SQL Injection) | Segurança | Sprint 1 |
| 05 | Qual deve ser o critério de prioridade de atributos na unificação de pessoa física quando houver divergência de data de nascimento, filiação ou CPF? | `ieducar/lib/App/Unificacao/Base.php:124-135` | Alto (Fidelidade do cadastro civil) | Jurídico / Negócio | Sprint 1 |
| 06 | Como gerenciar a reversão de aluno (`undo`) caso novos lançamentos de notas ou frequências tenham ocorrido no aluno principal após a unificação? | `app/Services/StudentUnificationService.php:31-35` | Alto (Consistência de dados acadêmicos) | Arquitetura / Pedagógico | Sprint 2 |
| 07 | O catálogo de 45 tabelas da unificação de pessoas físicas deve ser mantido fixo em código ou gerenciado por discovery automático de foreign keys? | `ieducar/lib/App/Unificacao/Pessoa.php:5-197` | Médio (Manutenibilidade a longo prazo) | Engenharia de Software | Sprint 2 |
| 08 | A unificação de alunos deve ser permitida entre escolas municipais distintas ou deve exigir aprovação formal da Secretaria de Educação? | `app/Services/StudentUnificationService.php:65-72` | Médio (Governança administrativa da rede) | Operações | Sprint 2 |
| 09 | Como tratar a repontuação de usuários do portal (`pmieducar.usuario`) quando a pessoa unificada possuir mais de uma conta de acesso ao sistema? | `ieducar/lib/App/Unificacao/Pessoa.php:43-45` | Médio (Segurança de login e permissões) | Segurança | Sprint 2 |
| 10 | Por que o legado apaga registros em `portal.funcionario` durante a unificação de pessoa em vez de mantê-los arquivados para auditoria trabalhista? | `ieducar/lib/App/Unificacao/Pessoa.php:199-204` | Médio (Auditoria trabalhista e folha) | Jurídico / RH | Sprint 2 |
| 11 | O deslocamento do sequencial do histórico escolar somando o máximo do principal é suficiente ou deve haver reordenação cronológica por ano letivo? | `ieducar/lib/App/Unificacao/Aluno.php:27, 35` | Médio (Legibilidade do histórico escolar oficial) | Pedagógico | Sprint 2 |
| 12 | Os snapshots armazenados em `log_unificacao_old_data` devem sofrer expurgo após determinado período ou precisam ser preservados perpetuamente? | `app/Models/LogUnificationOldData.php:9-20` | Médio (Crescimento de base e LGPD) | Infraestrutura / DPO | Sprint 3 |
| 13 | A tela de unificação deve exigir assinatura digital do operador ou autenticação em dois fatores para operações de fusão cadastral irreversíveis? | `app/Models/LogUnification.php:44-55` | Médio (Prevenção de fraude administrativa) | Segurança / Compliance | Sprint 2 |
| 14 | Na unificação de servidor, como tratar quando os dois servidores possuem avaliações ou registros divergentes no Censo Escolar do mesmo ano? | `ieducar/lib/App/Unificacao/Servidor.php:7-60` | Alto (Conformidade com o Educacenso) | Censo / Estatística | Sprint 2 |
| 15 | A validação que bloqueia unificação com múltiplos alunos ativos deve permitir exceção para alunos que possuam apenas matrículas encerradas/canceladas? | `ieducar/lib/App/Unificacao/Pessoa.php:224-225` | Médio (Flexibilidade operacional) | Negócio | Sprint 2 |
| 16 | Deve haver notificação automática por e-mail ou comunicado interno para os gestores escolares quando uma unificação de aluno for desfeita? | `app/Http/Controllers/StudentLogUnificationController.php:51-60` | Baixo (Comunicação operacional entre equipes) | Produto | Sprint 3 |
| 17 | Como assegurar o lock pessimista (`SELECT FOR UPDATE`) para garantir que os dois cadastros não sofram edição concorrente durante o processo de fusão? | `ieducar/lib/App/Unificacao/Base.php:42-55` | Alto (Prevenção de race condition) | Arquitetura | Sprint 1 |
