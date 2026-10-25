# Inventário Consolidado de Lacunas e Fragilidades (Gaps & Architectural Debt)

> **Documento Gerado pelo Revisor (`reversa-reviewer`) — Reversa Framework**  
> **Sistema:** i-Educar legado → SYSGOV (`SYS-Educa`)  
> **Status:** 🔴 Auditado e Classificado por Severidade  
> **Data:** 2026-10-22

---

## 1. Classificação por Nível de Severidade

| Severidade | Descrição | Quantidade Mapeada |
|---|---|---|
| **Crítica** | Vulnerabilidades de segurança, riscos de corrupção massiva de dados e execução arbitrária de código. | 4 |
| **Alta** | Inconsistências de regras de negócio, quebra de conformidade legal (MEC, INEP, LGPD, Lei do Piso). | 6 |
| **Média** | Débitos técnicos de modelagem, concorrência sem lock pessimista e performance subótima. | 8 |
| **Baixa** | Questões cosméticas, ausência de padronização de mensagens de erro e duplicação de enums. | 5 |

---

## 2. Lacunas Críticas (Ação Imediata Obrigatória na Arquitetura Nova)

### GAP-01: Execução de Fórmulas Matemáticas de Avaliação com `eval()`
- **Origem:** `ieducar/modules/FormulaMedia/Model/Formula.php:122-128`
- **Severidade:** 🔴 Crítica
- **Impacto:** Execução remota de código arbitrário em tempo de execução via campo textual configurável de cadastro de regras de avaliação. Se um operador com perfil institucional injetar código malicioso na fórmula, ele pode assumir controle do servidor backend.
- **Resolução Canônica SYSGOV:** Adoção obrigatória do ADR-002: substituição de `eval()` por motor modular baseado em AST / parser matemático seguro (ex.: Symfony ExpressionLanguage ou MathParser isolado com allowlist estrita de variáveis).

### GAP-02: Desativação Global de Triggers via DDL fora de Transação na Unificação
- **Origem:** `ieducar/lib/App/Unificacao/Base.php:167-185`
- **Severidade:** 🔴 Crítica
- **Impacto:** O método `desabilitaTodasTriggers` emite `ALTER TABLE ... DISABLE TRIGGER ALL` em 45 tabelas. Como comandos DDL de trigger no PostgreSQL alteram metadados fora do controle transacional da aplicação, qualquer timeout de PHP, falha de rede ou exceção deixa todas as triggers do banco desligadas permanentemente.
- **Resolução Canônica SYSGOV:** Adoção do ADR-003: unificação 100% transacional via `DB::transaction` sem nenhuma emissão de DDL, utilizando integridade referencial diferida (`DEFERRABLE INITIALLY DEFERRED`) e updates ordenados em topologia de árvore.

### GAP-03: Irreversibilidade da Unificação Civil de Pessoas Físicas
- **Origem:** `app/Http/Controllers/PersonLogUnificationController.php` (método `undo` inexistente)
- **Severidade:** 🔴 Crítica
- **Impacto:** Fusões indevidas de pessoas físicas homônimas são permanentes na aplicação. Caso um operador funda por engano dois cidadãos homônimos, todas as referências de 45 tabelas são mescladas sem possibilidade de rollback automático pelo sistema.
- **Resolução Canônica SYSGOV:** Criação do `PersonUnificationRollbackService` no SYSGOV Core, consumindo snapshots diferenciais (`before_state` JSON) para reverter pontualmente as chaves estrangeiras afetadas.

### GAP-04: Servidor Legado de Transporte Escolar Ausente do Repositório
- **Origem:** `_reversa_sdd/Transport/requirements.md:18`
- **Severidade:** 🔴 Crítica
- **Impacto:** O backend do subsistema de rotas e transporte não está no código do i-Educar; restam apenas telas de cadastro e chamadas REST para um microsserviço proprietário descontinuado.
- **Resolução Canônica SYSGOV:** Implementação completa da spec canônica `_reversa_sdd/sdd/rotas-itinerarios.md` e `alocacao-alunos-transporte.md` (score 100/100).

---

## 3. Lacunas de Alta Severidade (Regulatórias e de Negócio)

### GAP-05: Tratamento de Dados Médicos Sensíveis e Atestados sem Cifragem (LGPD)
- **Origem:** `ieducar/intranet/educar_falta_atraso_cad.php`, `pmieducar.falta_atraso`
- **Severidade:** 🔴 Alta
- **Impacto:** Laudos médicos de alunos com deficiência (AEE) e atestados de servidores contendo CID (Classificação Internacional de Doenças) são armazenados em texto plano no banco de dados e em storage compartilhado, violando a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
- **Resolução Canônica SYSGOV:** Encriptação em repouso dos campos de CID e controle estrito de RBAC com download de anexos auditado por URL presignada temporária de curta duração (15 minutos).

### GAP-06: Concorrência e Race Condition no Sequencial de Afastamentos
- **Origem:** `app/Models/EmployeeWithdrawal.php:63`
- **Severidade:** 🔴 Alta
- **Impacto:** O cálculo de `sequencial = MAX(sequencial) + 1` sem bloqueio pessimista (`SELECT FOR UPDATE`) propicia colisão de chave lógica caso dois operadores emitam afastamento simultâneo para o mesmo servidor.
- **Resolução Canônica SYSGOV:** Chave primária nativa UUID v7 e restrição única composta no banco.

### GAP-07: Interpolação de Identificadores em Queries Dinâmicas na API
- **Origem:** `ieducar/modules/Api/Views/ServidorController.php:188`, `App_Unificacao_Base.php:65`
- **Severidade:** 🔴 Alta
- **Impacto:** Concatenação direta de strings de arrays em cláusulas `IN ({$escola})` sem bind de parâmetros via prepared statement, gerando risco de SQL Injection se as entradas sofrerem manipulação.
- **Resolução Canônica SYSGOV:** Uso exclusivo do Query Builder do Eloquent com bindings parametrizados obrigatórios.

### GAP-08: Inexistência de Trilha de Auditoria no Lançamento de Notas e Faltas
- **Origem:** `ieducar/modules/Avaliacao/`
- **Severidade:** 🔴 Alta
- **Impacto:** Alterações de notas em boletins escolares e retificações de faltas no diário não gravam usuário, IP e timestamp anterior no legado, impossibilitando identificar fraudes ou alterações indevidas em conselhos de classe.
- **Resolução Canônica SYSGOV:** Adoção do ADR-004: tabela imutável `daily_records_audit` com carimbo de tempo forense e assinatura do professor.

### GAP-09: Totalizadores do Registro 99 do Censo Escolar com Literais Estáticos
- **Origem:** `ieducar/modules/Api/Views/EducacensoExportController.php:150`
- **Severidade:** 🔴 Alta
- **Impacto:** O Registro 99 de encerramento do arquivo do Censo Escolar é gerado com literais `99|` sem cálculo dinâmico de totalizadores em determinadas versões do layout, arriscando rejeição na validação do INEP.
- **Resolução Canônica SYSGOV:** Adoção do ADR-005: cálculo atômico de totalizadores e hash de validação pré-exportação.

### GAP-10: Vínculo Precário de Substituição Docente no Quadro de Horários
- **Origem:** `pmieducar.quadro_horario_horarios.ref_servidor_substituto`
- **Severidade:** 🔴 Alta
- **Impacto:** O legado apenas sobrepõe a chave do professor substituto sem registrar o período histórico de vigência da licença do titular, perdendo a rastreabilidade de quem efetivamente ministrou as aulas daquele mês.
- **Resolução Canônica SYSGOV:** Tabela histórica `educa_teacher_substitutions` com intervalo de vigência fechado e vinculação automática com o diário de classe.

---

## 4. Plano de Mitigação na Arquitetura SYSGOV

1. **Sprint 1 (Segurança e Integridade):** Implementação dos ADRs 001, 002 e 003 — banimento de `eval()`, remoção de DDL de triggers e transações atômicas de unificação.
2. **Sprint 2 (Auditoria e LGPD):** Implementação do ADR-004 e ADR-006 — auditoria imutável de notas/frequência, encriptação de CID e RBAC de atestados.
3. **Sprint 3 (Conformidade Regulatória):** Implementação dos ADRs 005 e 007 — exportação determinística do Educacenso e mensageria de alertas pedagógicos.
