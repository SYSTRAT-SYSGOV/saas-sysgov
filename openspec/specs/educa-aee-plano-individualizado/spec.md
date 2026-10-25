# educa-aee-plano-individualizado Specification

## Purpose
Elaboração, pactuação colaborativa, registro de intervenções e acompanhamento periódico do Plano Educacional Individualizado (PEI) e do cronograma de atendimento no contraturno escolar em Salas de Recursos Multifuncionais (SRM).

## Requirements

### Requirement: Elaboração Colaborativa do Plano Educacional Individualizado
O sistema DEVE (SHALL) estruturar o Plano Educacional Individualizado (PEI) por ano letivo, contemplando habilidades atuais, metas pedagógicas semestrais, adaptações curriculares, flexibilizações avaliativas e estratégias de ensino.

#### Scenario: Criação de metas pedagógicas adaptadas para sala regular
- **WHEN** o professor especialista de AEE em conjunto com o docente da classe comum elabora o PEI para o semestre letivo
- **THEN** o sistema salva os objetivos de aprendizagem adaptados, recursos necessários e critérios flexibilizados de avaliação

#### Scenario: Parecer descritivo semestral de evolução
- **WHEN** encerra-se o bimestre ou semestre letivo
- **THEN** os docentes registram o parecer avaliativo de desenvolvimento sobre as metas estipuladas no PEI

### Requirement: Gestão do Atendimento Educacional no Contraturno
O sistema DEVE (SHALL) organizar a enturmação de AEE em Salas de Recursos Multifuncionais no contraturno escolar, com controle de dias, horários e frequência específica.

#### Scenario: Enturmação em Sala de Recursos Multifuncionais polo
- **WHEN** um aluno matriculado em escola regular sem SRM própria é encaminhado para a escola polo de atendimento
- **THEN** o sistema vincula o atendimento especializado no contraturno sem duplicar a matrícula de escolarização regular
