# Matriz Global de Permissões e Perfis (RBAC) — SYS-Educa

> **Documento Gerado pelo Agente Detective (`reversa-detective`) — Reversa Framework**  
> **Nível de Documentação:** `completo`  
> **Sistema Alvo:** SYSGOV — Gestão Educacional Municipal (`SYS-Educa`)  
> **Status de Confiança:** 🟢 CONFIRMADO (regras RBAC unificadas a partir dos 27 módulos)

---

## 1. Perfis de Acesso Canônicos (Roles)

| Código do Papel | Nome Amigável | Escopo de Acesso | Descrição e Atribuições Principais |
| :--- | :--- | :--- | :--- |
| `ROLE_SUPER_ADMIN` | Administrador Geral TI | Global Mantenedora | Gestão técnica de tenants, auditoria global, configurações de infraestrutura e migrações. |
| `ROLE_SEMED_GESTOR` | Secretaria de Educação | Rede Municipal | Definição de regras curriculares, fórmulas de média, parâmetros municipais e exportação do Educacenso. |
| `ROLE_DIRETOR` | Diretor Escolar | Unidade Escolar | Gestão administrativa da escola, homologação de turmas, abertura de prazos de diário e conselho de classe. |
| `ROLE_SECRETARIO` | Secretário Escolar | Unidade Escolar | Efetivação de matrículas, transferências, emissão de históricos, boletins e atestados oficiais. |
| `ROLE_COORDENADOR` | Coordenador Pedagógico | Unidade Escolar | Acompanhamento do diário de classe, autorização de retificações de faltas, suporte a professores e conselho. |
| `ROLE_PROFESSOR` | Professor / Docente | Turmas Vinculadas | Registro diário de conteúdos ministrados, frequência de alunos, avaliações, notas e recuperações. |
| `ROLE_TRANSPORTE` | Operador de Transporte | Transporte Escolar | Gestão de rotas, itinerários, veículos, motoristas e vinculação de pontos de embarque de alunos. |
| `ROLE_RESPONSAVEL` | Aluno / Responsável | Apenas Próprio Aluno | Consulta ao boletim escolar, frequência em tempo real, comunicados e solicitação de documentos. |

---

## 2. Matriz de Permissões por Módulo e Entidade

> Convenção Canônica de Slugs: `modulo.entidade.acao`  
> Legenda: **[X]** Permitido | **[-]** Negado | **[*]** Permitido somente para registros do próprio escopo/vínculo

| Slug da Permissão | Descrição da Ação | SUPER_ADMIN | SEMED_GESTOR | DIRETOR | SECRETARIO | COORDENADOR | PROFESSOR | TRANSPORTE | RESPONSAVEL |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Núcleo Institucional & Parâmetros** | | | | | | | | | |
| `institution.tenant.manage` | Configurar dados do tenant/prefeitura | [X] | [-] | [-] | [-] | [-] | [-] | [-] | [-] |
| `institution.config.edit` | Alterar tolerâncias, prazos e bloqueios | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `institution.school.create` | Criar nova unidade escolar na rede | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `institution.school.edit` | Editar dados cadastrais da escola | [X] | [X] | [X] | [-] | [-] | [-] | [-] | [-] |
| `academic_year.create` | Cadastrar novo ano letivo na rede | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `academic_year.close` | Homologar encerramento oficial do ano letivo | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `calendar.event.manage` | Gerenciar feriados, recessos e sábados letivos | [X] | [X] | [X] | [-] | [-] | [-] | [-] | [-] |
| **Estrutura Pedagógica & Currículo** | | | | | | | | | |
| `curriculum.course.manage` | Cadastrar cursos e etapas de ensino | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `curriculum.matrix.manage` | Definir matrizes curriculares e cargas horárias | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `curriculum.discipline.create` | Cadastrar novos componentes curriculares | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `school_class.create` | Criar turmas escolares no ano letivo | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `school_class.allocate_teacher` | Vincular professores a turmas e disciplinas | [X] | [X] | [X] | [X] | [X] | [-] | [-] | [-] |
| **Pessoas, Servidores e Unificação** | | | | | | | | | |
| `people.person.create` | Cadastrar pessoa física no sistema | [X] | [X] | [X] | [X] | [X] | [-] | [-] | [-] |
| `people.person.view_sensitive` | Visualizar dados sensíveis (saúde/renda) | [X] | [X] | [X] | [X] | [X] | [-] | [-] | [*] |
| `people.unification.execute` | Executar unificação de cadastros duplicados | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `employee.allocation.manage` | Alocação funcional de servidores em escolas | [X] | [X] | [X] | [-] | [-] | [-] | [-] | [-] |
| **Matrículas & Enturmação** | | | | | | | | | |
| `enrollment.registration.create` | Realizar nova matrícula de aluno | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `enrollment.class.assign` | Enturmar aluno com número de chamada | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `enrollment.transfer.execute` | Emitir guia e efetivar transferência | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `enrollment.cancel.batch` | Cancelar matrículas não confirmadas em lote | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `enrollment.abandonment.record`| Declarar situação de abandono / evasão | [X] | [X] | [X] | [X] | [X] | [-] | [-] | [-] |
| **Avaliação, Fórmulas e Notas** | | | | | | | | | |
| `evaluation.rule.manage` | Criar/editar regras e fórmulas de média | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `evaluation.rounding.manage` | Configurar tabelas de faixas de arredondamento | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `evaluation.grade.launch` | Lançar notas periódicas e recuperações | [X] | [-] | [-] | [-] | [-] | [*] | [-] | [-] |
| `evaluation.grade.rectify` | Retificar nota após prazo de fechamento | [X] | [X] | [X] | [-] | [X] | [-] | [-] | [-] |
| `evaluation.term.close` | Fechar etapa letiva (cálculo de médias) | [X] | [X] | [X] | [X] | [X] | [-] | [-] | [-] |
| `evaluation.council.promote` | Registrar aprovação por deliberação de conselho | [X] | [X] | [X] | [-] | [X] | [-] | [-] | [-] |
| **Diário de Classe & Frequência** | | | | | | | | | |
| `daily_record.lesson.create` | Registrar aula ministrada e conteúdos BNCC | [X] | [-] | [-] | [-] | [-] | [*] | [-] | [-] |
| `daily_record.attendance.launch`| Lançar presença e falta dos alunos | [X] | [-] | [-] | [-] | [-] | [*] | [-] | [-] |
| `daily_record.excuse.attach` | Anexar atestado e registrar falta justificada | [X] | [X] | [X] | [X] | [X] | [*] | [-] | [-] |
| `daily_record.audit.view` | Visualizar logs de auditoria de alterações | [X] | [X] | [X] | [-] | [X] | [-] | [-] | [-] |
| **Censo Escolar (Educacenso INEP)** | | | | | | | | | |
| `censo.audit.run` | Executar pré-validação de inconsistências | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `censo.export.generate` | Gerar e baixar lote oficial TXT para o INEP | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `censo.import.inep_id` | Importar códigos INEP atribuídos pelo MEC | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| **Histórico Escolar & Relatórios Oficiais** | | | | | | | | | |
| `report.boletim.view` | Visualizar boletim escolar | [X] | [X] | [X] | [X] | [X] | [*] | [-] | [*] |
| `report.ata_final.generate` | Emitir ata de resultados finais assinada | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `report.historico.issue` | Emitir e assinar histórico escolar oficial | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| `history.retroactive.edit` | Cadastrar notas de anos anteriores em outras redes | [X] | [X] | [X] | [X] | [-] | [-] | [-] | [-] |
| **Transporte Escolar** | | | | | | | | | |
| `transport.route.manage` | Criar e editar rotas e pontos de parada | [X] | [X] | [-] | [-] | [-] | [-] | [X] | [-] |
| `transport.vehicle.manage` | Cadastrar frotas, terceirizados e laudos | [X] | [X] | [-] | [-] | [-] | [-] | [X] | [-] |
| `transport.passenger.link` | Vincular alunos aos itinerários de ônibus | [X] | [X] | [X] | [X] | [-] | [-] | [X] | [-] |
| **Segurança, Notificações & Auditoria** | | | | | | | | | |
| `security.user.create` | Criar credenciais de usuários e atribuir roles | [X] | [X] | [X] | [-] | [-] | [-] | [-] | [-] |
| `security.mfa.reset` | Resetar autenticação de duplo fator de servidor | [X] | [X] | [-] | [-] | [-] | [-] | [-] | [-] |
| `notification.notice.publish` | Publicar comunicado urgente / obrigatório | [X] | [X] | [X] | [-] | [-] | [-] | [-] | [-] |
| `audit.log.view` | Inspecionar trilhas de auditoria e telemetria | [X] | [-] | [-] | [-] | [-] | [-] | [-] | [-] |

---

## 3. Políticas de Segurança de Dados e LGPD

1. **Minimização de Acesso por Contexto:**
   - Professores têm suas queries filtradas automaticamente pela tabela de alocação docente (`teacher_allocations`), impedindo qualquer acesso a turmas de outros professores.
2. **Anonimização de Exportações Não Oficiais:**
   - Relatórios estatísticos emitidos para órgãos externos têm dados de saúde, religião e CPF anonimizados automaticamente.
3. **Revogação Instantânea de Sessões:**
   - A inativação de um usuário ou alteração de seus papéis emite evento de broadcast que invalida as sessões ativas e tokens JWT em menos de 100ms via Redis.
