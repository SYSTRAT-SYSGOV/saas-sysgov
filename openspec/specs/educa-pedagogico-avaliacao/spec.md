# educa-pedagogico-avaliacao Specification

## Purpose
Governa as regras de avaliação escolar, lançamento de notas e conceitos por etapa letiva, arredondamento oficial e cálculo de médias por motor declarativo sem execução de código dinâmico.

## Requirements

### Requirement: Regras e tipos de avaliação parametrizáveis
O sistema SHALL permitir configurar regras de avaliação associadas aos cursos e séries, especificando se o instrumento avaliativo adota notas numéricas decimais (0 a 10), conceitos alfabéticos (A, B, C, D) ou relatórios de parecer descritivo.

#### Scenario: Definição de regra de notas numéricas
- **WHEN** o gestor configura a regra de avaliação do Ensino Fundamental com escala de 0.0 a 10.0 e média de aprovação 6.0
- **THEN** a regra é ativada e associada aos cursos e séries selecionados

### Requirement: Cálculo declarativo de médias sem eval
O sistema SHALL calcular médias de etapas, médias anuais e exames finais através de analisador e interpretador de expressões aritméticas declarativo (AST), proibindo o uso de funções inseguras de execução de código como `eval()`.

#### Scenario: Apuração de média aritmética bimestral
- **WHEN** o sistema calcula a média de um estudante a partir das notas dos quatro bimestres com pesos iguais
- **THEN** o resultado aritmético é apurado de forma segura e determinística pelo interpretador de expressões

### Requirement: Aplicação de tabela de arredondamento
O sistema SHALL aplicar a tabela oficial de arredondamento decimal cadastrada pela rede (critérios de piso, teto ou ponto médio) sobre as médias apuradas antes da consolidação final no boletim.

#### Scenario: Arredondamento de nota fracionária
- **WHEN** a média calculada resulta em 5.76 e a regra de arredondamento define salto para 5.8
- **THEN** a nota final consolidada é ajustada para 5.8 com registro do valor original
