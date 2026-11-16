## ADDED Requirements

### Requirement: Turmas dos anos iniciais sobre o cadastro Escola
O módulo DEVE (MUST) usar as turmas e os alunos do cadastro Escola. Um gestor DEVE poder definir a série (1º ao 5º ano) de uma turma do Escola e as 8 funções da turma (regente, História e Geografia, Educação Física, Arte, Ensino Religioso, pedagogo, pedagogo RMD, diretor), cada uma ligada a um usuário do SYSGOV. Somente turmas com série definida DEVEM aparecer no módulo.

#### Scenario: Turma sem série não aparece
- **GIVEN** uma turma do Escola sem série definida no Parecer
- **WHEN** um gestor abre o início do módulo
- **THEN** a turma não aparece nos cards

#### Scenario: Aluno vem do Escola
- **GIVEN** um aluno ativo enturmado no Escola numa turma do 3º ano
- **WHEN** o professor abre Avaliar dessa turma
- **THEN** o aluno aparece com o número e o nome do cadastro Escola

### Requirement: Habilidades por série e matéria
O módulo DEVE (MUST) manter habilidades por série (1–5) e matéria (LP, MAT, CIE, HIS, GEO, EF, ART, ER), com ordem, descrição, código BNCC opcional, trimestres em que valem e situação ativa. Na ativação do tenant, as habilidades DEVEM ser carregadas a partir da lista de referência do PHP. A consulta à bncc.api.br só DEVE ser oferecida quando `BNCC_API_KEY` estiver configurada.

#### Scenario: Carga inicial
- **GIVEN** um tenant sem habilidades
- **WHEN** o seeder do módulo roda
- **THEN** as habilidades da lista de referência ficam disponíveis para as 5 séries

#### Scenario: Sem chave BNCC
- **GIVEN** que `BNCC_API_KEY` está vazia
- **WHEN** um gestor abre Conteúdos
- **THEN** a busca na BNCC fica indisponível, com aviso, e a lista local continua editável

### Requirement: Avaliação por conceito e observações
O professor DEVE (MUST) avaliar cada aluno em cada habilidade do trimestre com os conceitos A (Atingiu), EP (Em processo) ou NA (Não atingiu), com uma avaliação por (aluno, habilidade, trimestre). Também DEVE poder registrar uma observação por (aluno, trimestre, matéria).

#### Scenario: Reavaliar substitui
- **GIVEN** um aluno com EP numa habilidade no 1º trimestre
- **WHEN** o professor marca A
- **THEN** existe uma única avaliação, com A, e a mudança fica na auditoria

### Requirement: Acesso por função e perfil
Gestores (`parecer.gestor`) DEVE (MUST)M ver todas as turmas e matérias. Um professor (`parecer.professor`) DEVE ver apenas as turmas em que tem função e as matérias dessa função. O regente cobre LP, MAT, CIE e as matérias sem professor próprio. A regra DEVE ser aplicada no servidor.

#### Scenario: Professor de Arte
- **GIVEN** um usuário que é professor de Arte na turma 4º A
- **WHEN** ele tenta lançar uma avaliação de Matemática na 4º A
- **THEN** o servidor responde 403

#### Scenario: Isolamento de tenant
- **GIVEN** avaliações do tenant A
- **WHEN** um usuário do tenant B consulta o módulo
- **THEN** nenhum dado do tenant A é retornado

### Requirement: Parecer e impressão
O módulo DEVE (MUST) gerar o parecer em texto corrido, para cada matéria escolhida, no formato "Matéria: habilidades… . Observação." Isso vale por aluno ou para a turma toda (alunos ativos, em ordem), por trimestre ou os três (uma folha por trimestre), com o nome e o logo da escola e as assinaturas apenas das funções ligadas às matérias escolhidas, mais pedagogos e direção.

#### Scenario: Impressão da turma no 2º trimestre
- **GIVEN** uma turma com 20 alunos ativos e 1 transferido
- **WHEN** o gestor imprime o 2º trimestre de todas as matérias
- **THEN** saem 20 folhas, sem o aluno transferido

### Requirement: Notas, frequência e ocorrências próprias
O módulo DEVE (MUST) ter notas por matéria e trimestre com as regras por série (1º ano sem nota; 2º ano só no 3º trimestre; 3º ao 5º ano nos três; média 6,0), incluindo a importação por planilha. DEVE ter frequência diária por aluno (C/F, aulas com padrão 5 e faltas) e ocorrências com categoria do Escola. Esses dados não DEVEM ser compartilhados com o Pedagógico.

#### Scenario: Nota no 1º ano
- **GIVEN** uma turma do 1º ano
- **WHEN** alguém tenta lançar uma nota
- **THEN** o servidor rejeita com 422

### Requirement: Relatórios e auditoria
O módulo DEVE (MUST) oferecer os relatórios do PHP, filtrados por trimestre, série, turma e matéria e limitados ao escopo do usuário. Toda alteração DEVE ser registrada no `AuditLog`, e a tela de auditoria do módulo DEVE ficar restrita a `parecer.auditoria`.

#### Scenario: Auditoria restrita
- **GIVEN** um professor sem `parecer.auditoria`
- **WHEN** ele acessa a auditoria
- **THEN** recebe 403
