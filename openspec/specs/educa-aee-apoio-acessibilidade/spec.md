# educa-aee-apoio-acessibilidade Specification

## Purpose
Dimensionamento, alocação e supervisão de profissionais de apoio escolar (cuidadores, intérpretes de Libras), gestão de salas de recursos multifuncionais e inventário de recursos de tecnologia assistiva.

## Requirements

### Requirement: Alocação e Supervisão de Profissionais de Apoio Escolar
O sistema DEVE (SHALL) gerenciar a alocação de profissionais de apoio à inclusão (cuidadores de alimentação/higiene/locomoção, tradutores/intérpretes de Libras e guias-intérpretes) por turma e aluno assistido.

#### Scenario: Alocação de cuidador com limite de atendimento
- **WHEN** a Secretaria de Educação aloca um cuidador para atender alunos dependentes de locomoção e higiene
- **THEN** o sistema valida que o limite regulamentar municipal de estudantes por profissional não seja ultrapassado

#### Scenario: Substituição temporária por ausência
- **WHEN** um profissional de apoio registra falta justificada ou licença
- **THEN** o sistema emite alerta imediato de vulnerabilidade de atendimento e sugere alocação de profissional volante substituto

### Requirement: Inventário de Tecnologia Assistiva e Recursos Adaptados
O sistema DEVE (SHALL) catalogar e rastrear a distribuição de recursos de tecnologia assistiva, mobiliário adaptado, livros em Braille e lupas eletrônicas para unidades escolares e estudantes.

#### Scenario: Cautela de recurso de tecnologia assistiva para aluno
- **WHEN** a escola entrega um teclado adaptado ou software leitor de tela para uso do aluno com baixa visão
- **THEN** o sistema gera termo de cautela patrimonial e vincula o equipamento ao plano individual do estudante
