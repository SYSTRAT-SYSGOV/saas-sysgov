# educa-educacenso-auditoria Specification

## Purpose
Permite auditar previamente e de forma determinística os dados cadastrais escolares, identificando inconsistências impeditivas e avisos antes da exportação oficial para o Censo Escolar do INEP/MEC.

## Requirements

### Requirement: Validação de Data de Referência Institucional
O sistema DEVE (MUST) exigir a configuração prévia da data oficial de referência do Censo Escolar (última quarta-feira de maio do ano letivo) na instituição antes de executar a auditoria de consistência cadastral.

#### Scenario: Falha por falta de data de referência
- **WHEN** o usuário solicitar a auditoria de consistência de uma escola cujo ano letivo não possua data de referência do Censo
- **THEN** o sistema rejeita a operação com erro informando a ausência da data de referência e não executa a auditoria

#### Scenario: Auditoria iniciada com data de referência configurada
- **WHEN** o usuário solicitar a auditoria de consistência com a data de referência devidamente configurada
- **THEN** o sistema prossegue com a análise dos registros e devolve o sumário de validação

### Requirement: Auditoria de Identificação e Infraestrutura Escolar
O sistema DEVE (MUST) auditar os dados da escola (Registros 00 e 10), verificando obrigatoriedade do código INEP da escola, dados de endereço, situação de funcionamento e conformidade de infraestrutura.

#### Scenario: Escola sem código INEP cadastrado
- **WHEN** a auditoria for executada em uma escola que não possui código INEP válido com 8 dígitos
- **THEN** o sistema emite uma inconsistência impeditiva (bloqueante) indicando a necessidade de informar o código INEP

#### Scenario: Escola em atividade sem caracterização predial
- **WHEN** uma escola em atividade não possuir informação sobre água, esgoto ou energia
- **THEN** o sistema emite uma pendência do Registro 10 com link de navegação para a tela de infraestrutura da escola

### Requirement: Auditoria de Dados Pessoais e Papéis
O sistema DEVE (MUST) auditar os dados pessoais (Registro 30) de gestores, docentes e alunos, validando obrigatoriedade de CPF, data de nascimento coerente, raça/cor, nacionalidade e documentação civil.

#### Scenario: Docente ou gestor brasileiro sem CPF cadastrado
- **WHEN** a auditoria identificar um docente ou gestor sem CPF cadastrado na tabela de pessoas
- **THEN** o sistema emite uma inconsistência impeditiva para o Registro 30 apontando a pessoa e a função exercida

#### Scenario: Aluno de educação especial sem deficiência informada
- **WHEN** um aluno estiver enturmado em turma de AEE ou classe especial sem nenhuma deficiência informada
- **THEN** o sistema emite erro impeditivo exigindo a especificação de ao menos uma deficiência ou recurso de prova

### Requirement: Auditoria de Turmas, Lotação e Matrículas
O sistema DEVE (MUST) auditar turmas (Registro 20), vínculos docentes (Registro 50) e matrículas de alunos (Registro 60), verificando matriz curricular, horários, AEE e transporte público.

#### Scenario: Turma curricular sem componente ou docente vinculado
- **WHEN** uma turma de ensino regular não possuir componentes curriculares da BNCC ou não possuir docente alocado
- **THEN** o sistema sinaliza inconsistência do Registro 20/50 com apontamento da turma correspondente

#### Scenario: Aluno com transporte público sem especificação de veículo
- **WHEN** a matrícula registrar utilização de transporte público escolar sem marcar nenhuma tipologia de veículo
- **THEN** o sistema emite apontamento impeditivo no Registro 60 para a matrícula em questão
