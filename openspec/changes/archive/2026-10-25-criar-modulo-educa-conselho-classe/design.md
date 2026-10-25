# Design Técnico: Submódulo de Conselho de Classe & Pré-Conselho

## Contexto (Context)

Consulte `proposal.md` para motivação e justificativa legal (LDB).
O módulo `Modules/Educa` possui o núcleo escolar (`EducaCore`), secretaria (`EducaSecretaria`), dados pedagógicos preliminares (`EducaClassDiary`, notas e frequências) e cadastro de turmas (`EducaSchoolClass`).
O presente design estrutura as entidades para pré-conselho disciplinar e deliberações colegiadas de conselho de classe, assegurando integridade referencial, isolamento multi-tenant estrito e imutabilidade após homologação.

## Objetivos e Não-Objetivos (Goals / Non-Goals)

**Objetivos:**
- Prover modelo de dados normalizado e multi-tenant com chaves primárias UUID e soft deletes para cronogramas, fichas de pré-conselho, atas e deliberações individuais.
- Implementar serviços de domínio com regras de negócio claras: validação de prazos de pré-conselho, obrigatoriedade de deliberação para 100% dos alunos da turma na finalização da ata e bloqueio estrito de edição após finalização.
- Integrar trilha de auditoria completa via `AuditLogger::record('educa', ...)` em todas as mutações e transições de estado.
- Disponibilizar interface React 19 no `apps/web-client` integrada ao Design System `@sysgov/ui` com tipografia técnica em `JetBrains Mono`.

**Não-Objetivos:**
- Reimplementar o diário de classe ou notas regulares (já existentes em `ClassDiaryService` e `educa_class_diaries`).
- Integração externa com sistemas de certificação de assinatura digital em nuvem externa (ICP-Brasil) nesta fase (as assinaturas são autenticadas por credenciais internas do tenant auditadas em banco).

## Decisões Técnicas e Arquiteturais (Decisions)

### 1. Modelo de Dados Normalizado e Entidades de Conselho
- **Tabelas**:
  - `educa_conselho_cronogramas`: Define os períodos avaliativos do ano letivo com janelas de abertura/fechamento do pré-conselho e data da sessão plenária.
  - `educa_conselho_pre_conselhos`: Ficha diagnóstica da turma submetida pelo professor por componente curricular (`school_class_id`, `curriculum_component_id`).
  - `educa_conselho_pre_conselho_alunos`: Detalhamento dos estudantes sinalizados com baixo rendimento ou atenção pedagógica urgente (`nivel_atencao`, `dificuldades`, `encaminhamentos`).
  - `educa_conselho_atas`: Ata formal da reunião da turma no período (`status`: `rascunho`, `em_revisao`, `finalizada`, `arquivada`), com resumo das deliberações coletivas.
  - `educa_conselho_deliberacoes_alunos`: Registro deliberativo individual de cada estudante (`resultado_deliberacao`: `progressao_plena`, `progressao_dependencia`, `recuperacao_intensiva`, `retencao`, parecer descritivo final e disciplinas com dependência).
  - `educa_conselho_membros`: Registro dos participantes da reunião colegiada (`user_id`, `cargo_funcao`, `presente`).
- *Alternativa descartada*: Guardar avaliações e deliberações em colunas JSON livres dentro de uma única tabela de ata. *Motivo*: Impede consultas agregadas, relatórios estatísticos da rede e auditoria granular.

### 2. Trava de Imutabilidade da Ata Finalizada
- Uma vez transicionada para `finalizada`, a ata e todas as deliberações individuais de alunos vinculadas tornam-se somente-leitura. Qualquer tentativa de `PUT` ou `DELETE` retorna `422 Unprocessable Entity` com código de erro específico `ata_bloqueada_para_edicao`.
- *Alternativa descartada*: Permitir edição contínua com sobrescrita. *Motivo*: Fragilidade jurídica perante órgãos de fiscalização e conselhos tutelares.

### 3. Nomenclatura de Parâmetros de Rota REST
- Seguindo o padrão validado nos demais módulos e evitando conflito com a regex global `Route::pattern('id', '[0-9]+')`, as rotas REST utilizarão parâmetros específicos `{cronogramaId}`, `{preConselhoId}` e `{ataId}`.

## Riscos e Mitigações (Risks / Trade-offs)

- **[Risco]** Professor tentar submeter diagnóstico após o encerramento do prazo do cronograma.  
  → **Mitigação:** Validação em `PreConselhoService::salvarFicha()` checando se a data atual excede `data_fim_pre_conselho` do cronograma, permitindo submissão tardia apenas com override expresso da Direção (`educa.conselho.admin`).
- **[Risco]** Finalização de ata com alunos da turma sem deliberação registrada.  
  → **Mitigação:** O método `ConselhoAtaService::finalizarAta()` verifica se todos os alunos com matrícula ativa na turma possuem registro em `educa_conselho_deliberacoes_alunos`. Caso contrário, recusa a transição com lista de pendências.
- **[Risco]** Vazamento de pareceres entre prefeituras distintas em ambiente multi-tenant.  
  → **Mitigação:** Utilização mandatória da trait `TenantAware` em todos os models Eloquent e escopo estrito via `tenant_id`.
