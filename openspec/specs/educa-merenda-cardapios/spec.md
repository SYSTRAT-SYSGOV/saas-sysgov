# educa-merenda-cardapios Specification

## Purpose

Gerenciamento de cardápios alimentares escolares por etapa e turno, cálculo nutricional de macronutrientes/calorias e homologação técnica por Nutricionista Responsável Técnico (CRN).

## Requirements

### Requirement: Elaboração de Cardápio por Etapa de Ensino e Turno
O sistema DEVE (SHALL) permitir criar cardápios semanais ou mensais vinculados ao ano letivo, etapa de ensino (Creche, Pré-escola, Ensino Fundamental, EJA) e turno escolar (Matutino, Vespertino, Noturno ou Integral).

#### Scenario: Cadastro de cardápio semanal para anos iniciais
- **WHEN** o nutricionista cadastra um cardápio para o Ensino Fundamental matutino para o mês de Março
- **THEN** o sistema gera a grade de 5 dias úteis com os itens de refeição, ingredientes e estimativa calórica

#### Scenario: Bloqueio de publicação sem aprovação técnica do CRN
- **WHEN** um operador sem perfil de nutricionista habilitado tenta publicar o cardápio oficial para a rede escolar
- **THEN** o sistema rejeita a publicação e exige homologação por usuário com número de registro no CRN válido

### Requirement: Ficha Técnica de Preparação e Estimativa Nutricional
O sistema DEVE (SHALL) calcular o valor calórico total (kcal) e a distribuição percentual de macronutrientes (carboidratos, proteínas, lipídios e fibras) de cada preparação culinária informada no cardápio.

#### Scenario: Validação de diretrizes nutricionais mínimas do FNDE
- **WHEN** a preparação cadastrada não atinge os parâmetros nutricionais mínimos recomendados para a respectiva faixa etária
- **THEN** o sistema exibe alerta visual de não conformidade nutricional orientando o ajuste de porcionamento

#### Scenario: Cálculo automático por porção/aluno
- **WHEN** o nutricionista insere os ingredientes e gramatura per capita da refeição
- **THEN** o sistema calcula automaticamente a quantidade total de insumos necessários multiplicando pelo número de alunos matriculados nas turmas atendidas
