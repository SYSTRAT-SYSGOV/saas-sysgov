# Spec: Frontend de Comunicação Familiar e Transporte Escolar

## ADDED Requirements

### Requirement: Mural de Comunicados e Confirmação de Leitura
A interface DEVE (MUST) fornecer mural de avisos da rede e da escola, permitindo a segmentação por público-alvo (escola, curso, turma) e exibindo o percentual de confirmação de ciência digital dos responsáveis.

#### Scenario: Gestão de comunicado com ciência requerida
- **GIVEN** um comunicado publicado exigindo confirmação de leitura
- **WHEN** o gestor visualiza o detalhe do aviso
- **THEN** o percentual de famílias que deram ciência é exibido em `JetBrains Mono` com lista de pendências

### Requirement: Painel de Transporte Escolar e Rotas
A interface DEVE (MUST) disponibilizar listagem de rotas, itinerários, veículos e condutores alocados com indicador de ocupação da lotação máxima do veículo.

#### Scenario: Visualização de ocupação do veículo escolar
- **GIVEN** um micro-ônibus escolar com capacidade para 22 estudantes
- **WHEN** a rota é exibida no painel
- **THEN** o total de alunos associados é exibido com indicador de lotação em `JetBrains Mono`
