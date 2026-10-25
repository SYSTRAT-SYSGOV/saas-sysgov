# Matriz de Impacto e Rastreabilidade Cruzada — 27 Módulos

> **Documento Gerado pelo Agente Architect (`reversa-architect`) — Reversa Framework**  
> **Sistema Alvo:** SYSGOV — Gestão Educacional Municipal (`SYS-Educa`)  
> **Sistema Legado:** Portabilis i-Educar  
> **Finalidade:** Mapeamento de interdependências, impacto de alterações, propagação de eventos e conformidade regulatória entre todos os 27 módulos mapeados na engenharia reversa.  
> **Status de Confiança:** 🟢 CONFIRMADO

---

## 1. Visão Geral e Níveis de Criticidade

Qualquer modificação em um sistema de gestão educacional público acarreta potenciais efeitos colaterais em cascata. Para garantir a segurança durante a evolução e refatoração do software, os 27 módulos são classificados por nível de risco de regressão sistêmica:

| Nível de Risco | Quantidade | Módulos | Critério de Classificação |
| :--- | :---: | :--- | :--- |
| **Crítico (P1)** | 7 | `People`, `AcademicYear`, `SchoolClass`, `Enrollments`, `Avaliacao`, `DailyRecord`, `Educacenso` | Alterações quebram integridade transacional de notas, matrícula, histórico ou validação de repasse financeiro federal (FUNDEB/INEP). |
| **Alto (P2)** | 7 | `School`, `Stages`, `ComponenteCurricular`, `EvaluationRules`, `FormulaMedia`, `HistoricoEscolar`, `Usuario` | Alterações afetam diretamente a estrutura curricular, regras de promoção escolar ou segurança institucional. |
| **Médio (P3)** | 7 | `Addressing`, `Cadastro`, `Calendario`, `RegraAvaliacao`, `TabelaArredondamento`, `Reports`, `Unification` | Alterações impactam parametrizações, arredondamentos matemáticos, unificação cadastral ou formatação de documentos oficiais. |
| **Baixo (P4)** | 6 | `Configuracao`, `Servidores`, `Transport`, `ErrorTracking`, `Navigation`, `Notifications` | Alterações com baixo acoplamento direto no ciclo acadêmico central, operando como serviços de suporte ou logística periférica. |

---

## 2. Matriz Detalhada por Módulo

### 2.1. Módulos Críticos (P1)

#### 1. `People` (Pessoas Físicas e Jurídicas)
- **Dependências Upstream (Do que depende):** `Addressing`, `Configuracao`.
- **Dependências Downstream (O que depende dele):** `Enrollments`, `DailyRecord`, `Avaliacao`, `HistoricoEscolar`, `Servidores`, `Usuario`, `Transport`, `Educacenso`, `Unification`.
- **Eventos Disparados:** `PersonCreated`, `PersonUpdated`, `PersonMerged`.
- **Impacto Regulatório:** LGPD (Titular de Dados, Consentimento e Mascaramento de Menores), Validação de CPF (Receita Federal) e Certidão de Nascimento (Conselho Nacional de Justiça).
- **Risco de Alteração:** **Crítico**. Qualquer mudança no identificador ou deduplicação afeta imediatamente todos os módulos da plataforma.

#### 2. `AcademicYear` (Ano e Período Letivo)
- **Dependências Upstream:** `School`, `Calendario`, `Configuracao`.
- **Dependências Downstream:** `SchoolClass`, `Enrollments`, `DailyRecord`, `Avaliacao`, `HistoricoEscolar`, `Educacenso`, `Reports`.
- **Eventos Disparados:** `AcademicYearOpened`, `AcademicPeriodClosed`, `AcademicYearFinished`.
- **Impacto Regulatório:** LDB art. 24 (Cumprimento compulsório de mínimo de 200 dias letivos e 800 horas anuais).
- **Risco de Alteração:** **Crítico**. O fechamento de períodos trava lançamentos de diário e dispara recálculos de médias e frequência.

#### 3. `SchoolClass` (Turmas e Enturmações)
- **Dependências Upstream:** `School`, `AcademicYear`, `Stages`, `Calendario`.
- **Dependências Downstream:** `Enrollments`, `DailyRecord`, `Avaliacao`, `Servidores` (alocação de docentes), `Transport`, `Educacenso`, `Reports`.
- **Eventos Disparados:** `SchoolClassCreated`, `SchoolClassCapacityChanged`, `SchoolClassClosed`.
- **Impacto Regulatório:** Censo Escolar INEP (código de turma, tipologia, multietapa, regular, AEE ou integral) e CACS-FUNDEB.
- **Risco de Alteração:** **Crítico**. A desativação ou alteração de capacidade de turma invalida filas de espera e enturmações ativas.

#### 4. `Enrollments` (Matrículas Escolares)
- **Dependências Upstream:** `People`, `SchoolClass`, `Stages`, `AcademicYear`.
- **Dependências Downstream:** `DailyRecord`, `Avaliacao`, `HistoricoEscolar`, `Transport`, `Educacenso`, `Reports`, `Notifications`.
- **Eventos Disparados:** `EnrollmentRequested`, `EnrollmentActivated`, `EnrollmentTransferred`, `EnrollmentAbandoned`, `EnrollmentCompleted`.
- **Impacto Regulatório:** LDB art. 5º e 6º (Obrigatoriedade escolar dos 4 aos 17 anos), Resolução CNE/CEB nº 2/2018 (Corte etário de 31 de março) e Censo Escolar (data de corte 31 de maio).
- **Risco de Alteração:** **Crítico**. Alteração de status bloqueia o diário de classe do aluno e reconfigura cotas de transporte e merenda.

#### 5. `Avaliacao` (Notas, Pareceres e Resultados)
- **Dependências Upstream:** `Enrollments`, `ComponenteCurricular`, `EvaluationRules`, `FormulaMedia`, `TabelaArredondamento`.
- **Dependências Downstream:** `HistoricoEscolar`, `Reports` (Boletins e Atas), `Educacenso`, `Notifications`.
- **Eventos Disparados:** `GradeRecorded`, `DescriptiveOpinionSaved`, `ExamScorePublished`, `StudentApproved`, `StudentRetained`.
- **Impacto Regulatório:** LDB art. 24, V (Prevalência dos aspectos qualitativos sobre os quantitativos e recuperação paralela compulsória).
- **Risco de Alteração:** **Crítico**. Erros no cálculo ou arredondamento geram reprovações indevidas com passivos jurídicos imediatos.

#### 6. `DailyRecord` (Diário de Classe, Frequência e Aulas)
- **Dependências Upstream:** `SchoolClass`, `Enrollments`, `ComponenteCurricular`, `Servidores`.
- **Dependências Downstream:** `Avaliacao` (total de faltas para promoção), `Reports`, `Educacenso`, `Notifications`.
- **Eventos Disparados:** `LessonPlanLogged`, `AttendanceRecorded`, `StudentAbsenceThresholdExceeded`.
- **Impacto Regulatório:** LDB art. 24, VI (Frequência mínima obrigatória de 75% para aprovação) e Lei da Busca Ativa Escolar (notificação de infrequência grave ao Conselho Tutelar).
- **Risco de Alteração:** **Crítico**. Modificações na contagem de faltas (por aula vs. por dia) afetam diretamente o percentual final de frequência.

#### 7. `Educacenso` (Censo Escolar da Educação Básica / INEP)
- **Dependências Upstream:** Consome dados de todos os 20 módulos acadêmicos e administrativos.
- **Dependências Downstream:** `Reports` (relatórios de divergência INEP), Painéis de Prestação de Contas.
- **Eventos Disparados:** `CensoValidationStarted`, `CensoBatchGenerated`, `InepIdImported`.
- **Impacto Regulatório:** Lei nº 14.113/2020 (FUNDEB): Repasses federais de recursos financeiros condicionados à exatidão dos registros declarados no Censo Escolar.
- **Risco de Alteração:** **Crítico**. Falhas de layout ou divergência cadastral geram glosa e perda de receita orçamentária para a prefeitura.

---

### 2.2. Módulos de Alto Risco (P2)

| Módulo | Upstream | Downstream | Eventos de Domínio | Impacto Regulatório / Negócio |
| :--- | :--- | :--- | :--- | :--- |
| **`School`** | `Addressing`, `Configuracao` | `AcademicYear`, `SchoolClass`, `Servidores`, `Educacenso` | `SchoolUpdated`, `SchoolDeactivated` | Código INEP da Unidade Escolar, infraestrutura sanitária e acessibilidade. |
| **`Stages`** | `Configuracao` | `SchoolClass`, `ComponenteCurricular`, `EvaluationRules` | `StageCreated`, `GradeLevelUpdated` | Resoluções CNE/CEB para Educação Infantil, Anos Iniciais/Finais do Fundamental e EJA. |
| **`ComponenteCurricular`** | `Stages` | `SchoolClass`, `DailyRecord`, `Avaliacao`, `HistoricoEscolar` | `CurriculumComponentAttached` | BNCC (Base Nacional Comum Curricular) e Parte Diversificada Regional. |
| **`EvaluationRules`** | `Stages` | `Avaliacao`, `FormulaMedia`, `TabelaArredondamento` | `EvaluationRuleAssigned` | Regimento Escolar Municipal aprovado pelo Conselho Municipal de Educação (CME). |
| **`FormulaMedia`** | `EvaluationRules` | `Avaliacao` | `FormulaCompiled` | Fórmulas de Média Aritmética, Ponderada e Recuperação Semestral/Anual. |
| **`HistoricoEscolar`** | `Enrollments`, `Avaliacao` | `Reports` | `HistoryEntryAdded`, `HistoryCertified` | Validade nacional de documentos de transferência escolar (LDB art. 24). |
| **`Usuario`** | `People`, `School` | Todos os módulos via RBAC | `UserAuthenticated`, `RoleAssigned` | Segurança cibernética, trilhas de auditoria e conformidade LGPD. |

---

### 2.3. Módulos de Médio e Baixo Risco (P3 e P4)

| Módulo | Classificação | Principais Relações | Impacto Sistêmico |
| :--- | :---: | :--- | :--- |
| **`Addressing`** | Médio (P3) | Fornece CEP, logradouro e coordenadas geográficas para `People`, `School` e `Transport`. | Roteirização de transporte e zoneamento de vagas escolares. |
| **`Cadastro`** | Médio (P3) | Suporte a tabelas auxiliares de etnia, tipo de deficiência e nacionalidade. | Mapeamento fidedigno de códigos da tabela unificada do Censo INEP. |
| **`Calendario`** | Médio (P3) | Fornece dias letivos, feriados e recessos para `AcademicYear` e `DailyRecord`. | Garantia da meta de 200 dias de efetivo trabalho escolar. |
| **`RegraAvaliacao`** | Médio (P3) | Alias / Especialização de tipos avaliativos numéricos, conceituais e parecer descritivo. | Flexibilidade metodológica pedagógica por etapa de ensino. |
| **`TabelaArredondamento`** | Médio (P3) | Define intervalos e regras de arredondamento e truncamento para `Avaliacao`. | Uniformidade matemática na atribuição de médias finais. |
| **`Reports`** | Médio (P3) | Consome dados de `Enrollments`, `DailyRecord`, `Avaliacao` e `HistoricoEscolar`. | Geração de PDFs de Boletim, Ficha Individual e Ata de Resultados Finais. |
| **`Unification`** | Médio (P3) | Opera exclusivamente sobre `People`, fundindo duplicidades em lote. | Integridade de chaves estrangeiras em todas as tabelas relacionadas a pessoas. |
| **`Configuracao`** | Baixo (P4) | Armazena preferências institucionais, brasão municipal e bloqueios temporais. | Customização da identidade visual do município e travas de calendário. |
| **`Servidores`** | Baixo (P4) | Vincula servidores a escolas, turmas e componentes para controle de ponto e diário. | Lotação de professores e dados de corpo docente declarados ao Educacenso. |
| **`Transport`** | Baixo (P4) | Vincula alunos a itinerários, pontos de parada e veículos terceirizados/próprios. | Prestação de contas do Programa Nacional de Transporte Escolar (PNATE). |
| **`ErrorTracking`** | Baixo (P4) | Monitoramento e captura de exceções em tempo de execução sem dependência de regras de negócio. | SLA e telemetria de observabilidade da infraestrutura. |
| **`Navigation`** | Baixo (P4) | Estruturação de árvores de menus da UI condicionadas a permissões do `Usuario`. | Experiência de navegação do usuário final no React SPA. |
| **`Notifications`** | Baixo (P4) | Disparo assíncrono de alertas acionados por eventos de `DailyRecord` e `Enrollments`. | Comunicação em tempo real com famílias via canais omnichannel. |

---

## 3. Matriz de Adjacência e Dependência Cruzada (27 x 27)

A tabela abaixo exibe a relação direta onde a linha **(Origem)** influencia diretamente a coluna **(Destino)** com relação ativa (`X`):

| Origem \ Destino | Peo | Aca | Sch | Stg | Cur | Cla | Enr | Eva | Dai | Cen | His | Usr | Rpt | Trn | Not |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **People (Peo)** | - | | | | | | **X** | | **X** | **X** | **X** | **X** | **X** | **X** | **X** |
| **AcademicYear (Aca)** | | - | | | | **X** | **X** | **X** | **X** | **X** | **X** | | **X** | | |
| **School (Sch)** | | **X** | - | | | **X** | **X** | | | **X** | | **X** | **X** | **X** | |
| **Stages (Stg)** | | | | - | **X** | **X** | **X** | **X** | | **X** | **X** | | **X** | | |
| **ComponenteCurricular (Cur)** | | | | | - | **X** | | **X** | **X** | **X** | **X** | | **X** | | |
| **SchoolClass (Cla)** | | | | | | - | **X** | **X** | **X** | **X** | | | **X** | **X** | |
| **Enrollments (Enr)** | | | | | | | - | **X** | **X** | **X** | **X** | | **X** | **X** | **X** |
| **Avaliacao (Eva)** | | | | | | | | - | | **X** | **X** | | **X** | | **X** |
| **DailyRecord (Dai)** | | | | | | | | **X** | - | **X** | | | **X** | | **X** |
| **Educacenso (Cen)** | | | | | | | | | | - | | | **X** | | |
| **HistoricoEscolar (His)** | | | | | | | | | | | - | | **X** | | |
| **Usuario (Usr)** | | | | | | | | | | | | - | | | |
| **Reports (Rpt)** | | | | | | | | | | | | | - | | |
| **Transport (Trn)** | | | | | | | | | | **X** | | | **X** | - | |
| **Notifications (Not)** | | | | | | | | | | | | | | | - |

*(Nota: Módulos de apoio `Addressing`, `Cadastro`, `Calendario`, `Configuracao`, `EvaluationRules`, `FormulaMedia`, `RegraAvaliacao`, `TabelaArredondamento`, `Servidores`, `Unification`, `ErrorTracking` e `Navigation` conectam-se estritamente aos seus módulos âncora conforme detalhado na Seção 2).*

---

## 4. Recomendações para a Ordem de Implementação (Forward / Reconstructor)

Com base nas análises de acoplamento e criticidade, a reconstrução e evolução da plataforma deve seguir estritamente as seguintes ondas de implementação sequencial:

1. **Onda 0 (Fundação e Segurança):** `Configuracao`, `Addressing`, `Cadastro`, `People`, `Usuario`, `ErrorTracking`.
2. **Onda 1 (Estrutura Organizacional e Matriz):** `School`, `Stages`, `ComponenteCurricular`, `Calendario`, `AcademicYear`.
3. **Onda 2 (Regras de Negócio de Turmas e Avaliação):** `SchoolClass`, `EvaluationRules`, `FormulaMedia`, `TabelaArredondamento`, `RegraAvaliacao`.
4. **Onda 3 (Ciclo de Vida do Aluno):** `Enrollments`, `DailyRecord`, `Avaliacao`, `Notifications`.
5. **Onda 4 (Conclusão e Registro Histórico):** `HistoricoEscolar`, `Reports`, `Transport`, `Servidores`, `Unification`.
6. **Onda 5 (Integração e Conformidade Externa):** `Educacenso` (Pipelines INEP, validações em lote e exportações TXT).
