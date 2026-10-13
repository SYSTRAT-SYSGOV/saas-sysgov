# Spec Delta

## Purpose

CRM de campanha política no SYSGOV: campanhas por candidato com acesso por membro, base territorial pública
(IBGE/TSE) por UF, municípios trabalhados pela campanha, painel com mapa interativo e equipes de campo.

## ADDED Requirements

### Requirement: Permissões e perfis do módulo Campanha
O módulo SHALL declarar as permissões `campanha.view`, `campanha.gestao.manage` (campanhas, membros, candidato e
configuração), `campanha.municipios.manage` (dados do município na campanha) e `campanha.equipes.manage`
(coordenadores, cabos eleitorais, prefeitos e vereadores), e provisionar os perfis **Coordenação Geral de
Campanha** (todas, acessa todas as campanhas do tenant), **Coordenação de Campanha** (`view`, municípios e equipes,
só nas campanhas de que é membro) e **Consulta de Campanha** (`view`). Toda autorização SHALL ser feita no servidor.

#### Scenario: Consulta não altera
- **WHEN** um usuário com o perfil Consulta de Campanha tenta mudar a situação de um município
- **THEN** o sistema responde 403

#### Scenario: Módulo não habilitado
- **WHEN** um usuário de um tenant sem o módulo Campanha habilitado chama qualquer rota do módulo
- **THEN** o sistema responde 403

### Requirement: Campanhas e candidato
O tenant SHALL poder cadastrar várias campanhas (nome, ano da eleição, cargo, UF de atuação, meta global de votos e
status ativa/encerrada). Cada campanha SHALL ter um único candidato, identificado pelo CPF e ligado ao Cadastro de
Pessoas do tenant (a pessoa é encontrada ou criada pelo CPF), com nome de urna, partido, número, coligação, contatos,
redes sociais, biografia e votos/cargo da eleição anterior. O CPF SHALL ser válido e nunca SHALL ser devolvido
completo pela API. Campanha encerrada SHALL continuar consultável, mas não aceita alterações.

#### Scenario: Dois candidatos no mesmo tenant
- **WHEN** a Coordenação Geral cadastra a campanha "Deputado Estadual 2026" do candidato A e a campanha "Deputado
  Federal 2026" do candidato B
- **THEN** as duas campanhas existem no tenant, cada uma com seu candidato, seus municípios e suas equipes

#### Scenario: CPF inválido
- **WHEN** o candidato é cadastrado com um CPF de dígitos verificadores inválidos
- **THEN** o sistema recusa com mensagem de CPF inválido

#### Scenario: Campanha encerrada
- **WHEN** um usuário tenta alterar a meta de um município de uma campanha encerrada
- **THEN** o sistema responde 422 informando que a campanha está encerrada

### Requirement: Campanha de trabalho e acesso por membro
Toda rota de dados de campanha SHALL operar sobre uma campanha de trabalho, informada a cada requisição. O usuário
SHALL acessar apenas as campanhas de que é membro, salvo quem tem a Coordenação Geral (todas as do tenant). Os
membros SHALL ser escolhidos entre os usuários do tenant (Usuários & Acessos). Todo registro de campanha SHALL
pertencer a uma única campanha e nunca SHALL aparecer em outra.

#### Scenario: Usuário fora da campanha
- **WHEN** um coordenador membro só da campanha A pede os municípios da campanha B
- **THEN** o sistema responde 403

#### Scenario: Dados não cruzam campanhas
- **WHEN** a campanha A marca Curitiba como "consolidado" com meta de 5.000 votos
- **THEN** Curitiba na campanha B continua com a sua própria situação e meta

#### Scenario: Campanha de outro tenant
- **WHEN** a requisição informa uma campanha de outro tenant
- **THEN** o sistema responde como inexistente

### Requirement: Base territorial pública por UF
O sistema SHALL manter, por UF e compartilhada entre os tenants (só leitura para eles), a base de municípios com
código IBGE, nome, mesorregião, região intermediária e imediata, população estimada (com o ano de referência),
eleitorado, quantidade de zonas e de seções (com o ano de referência), prefeito e vice eleitos com partido e a
malha geográfica de cada município. A base SHALL ser carregada e atualizada por importação das fontes abertas
oficiais (IBGE e TSE), sem digitação, registrando a data da última atualização e os municípios que não puderam
ser associados entre as fontes. Atualizar a base SHALL não apagar nem alterar os dados que as campanhas registraram
sobre os municípios.

#### Scenario: Paraná carregado
- **WHEN** a importação do Paraná termina
- **THEN** a base tem os 399 municípios do PR, cada um com código IBGE, população, eleitorado e malha

#### Scenario: Atualização preserva a campanha
- **WHEN** a base do PR é importada de novo com a população atualizada
- **THEN** a população muda e a situação, a meta e o coordenador de cada município nas campanhas continuam iguais

#### Scenario: Município sem correspondência no TSE
- **WHEN** um município do IBGE não é encontrado nos dados do TSE durante a importação
- **THEN** ele fica na base sem eleitorado e aparece no relatório da importação como não associado

### Requirement: Municípios na campanha
Cada campanha SHALL trabalhar com todos os municípios da sua UF, com, por município: situação política
(`sem_atuacao`, `em_andamento`, `consolidado`, `prioritario`, `risco`; padrão `sem_atuacao`), meta de votos,
votos na eleição anterior, coordenador responsável (da própria campanha), potencial eleitoral, histórico e
observações. A lista SHALL permitir filtrar por situação, região e coordenador e buscar pelo nome.

#### Scenario: Município sem dados da campanha
- **WHEN** a campanha nunca registrou nada sobre um município
- **THEN** ele aparece como "sem atuação", meta zero e sem coordenador

#### Scenario: Coordenador de outra campanha
- **WHEN** a requisição atribui ao município um coordenador cadastrado em outra campanha
- **THEN** o sistema recusa com erro de validação

### Requirement: Mapa interativo da campanha
O painel SHALL exibir o mapa dos municípios da UF da campanha com três camadas selecionáveis:
**Situação Política** (cor da situação), **Apoio de Prefeito** (aliado, neutro, oposição ou sem informação) e
**Meta de Votos** (faixas de meta configuradas; meta zero como "sem meta"). Cada camada SHALL ter legenda. Ao
passar o mouse, o mapa SHALL mostrar o nome do município e os dados da camada (situação e coordenador; prefeito,
vice e relação; meta e coordenador). Ao clicar, SHALL abrir a ficha do município. O mapa SHALL refletir os dados
gravados, sem precisar recarregar a página depois de uma alteração feita na ficha.

#### Scenario: Camada de meta por faixas
- **WHEN** as faixas são "até 100", "até 250" e "acima de 250" e Londrina tem meta de 300 votos
- **THEN** na camada Meta de Votos Londrina aparece com a cor da faixa "acima de 250"

#### Scenario: Prefeito sem relação registrada
- **WHEN** a campanha não registrou a relação com o prefeito de um município
- **THEN** na camada Apoio de Prefeito o município aparece como "sem informação", com o nome do prefeito eleito na dica

#### Scenario: Clique abre a ficha
- **WHEN** o usuário clica em Rio Branco do Ivaí no mapa
- **THEN** abre a ficha de Rio Branco do Ivaí da campanha de trabalho

### Requirement: Ficha do município
A ficha SHALL reunir os dados públicos (IBGE/TSE, só leitura), os dados do município na campanha (editáveis por
quem tem `campanha.municipios.manage`), o prefeito e a relação com a campanha, os vereadores, os cabos eleitorais e
o coordenador. Os indicadores do painel SHALL contar municípios por situação, coordenadores, cabos eleitorais,
prefeitos aliados e vereadores aliados da campanha.

#### Scenario: Alterar a situação na ficha
- **WHEN** a Coordenação de Campanha muda a situação de Ponta Grossa para "prioritário" na ficha
- **THEN** a alteração é gravada com auditoria e Ponta Grossa aparece com a cor de "prioritário" no mapa

### Requirement: Coordenadores e cabos eleitorais
A campanha SHALL cadastrar coordenadores (estadual, regional ou municipal, com município ou região de atuação,
meta de votos e contatos) e cabos eleitorais (município, bairro, coordenador, votos estimados, área de atuação,
disponibilidade, veículo próprio, ajuda de custo em centavos, chave Pix e contatos). Pessoas com CPF SHALL ser
ligadas ao Cadastro de Pessoas; o CPF nunca SHALL ser devolvido completo. Excluir SHALL ser lógico; coordenador com
municípios ou cabos vinculados SHALL ter os vínculos desfeitos antes de sair.

#### Scenario: Cabo no município de outra UF
- **WHEN** a requisição cadastra um cabo eleitoral num município fora da UF da campanha
- **THEN** o sistema recusa com erro de validação

#### Scenario: Excluir coordenador com vínculos
- **WHEN** a requisição exclui um coordenador responsável por três municípios
- **THEN** o sistema recusa informando os municípios vinculados

### Requirement: Prefeitos e vereadores
A campanha SHALL registrar, por município, a relação com o prefeito (`aliado`, `neutro`, `oposicao`), a influência
(alta, média, baixa), contatos e observações — o nome, o vice e o partido vêm da base pública. A campanha SHALL
cadastrar vereadores por município (nome, partido, número, contatos, aliado, votos estimados, dobradinha e apoios
declarados a outros cargos). Os indicadores de "aliados" SHALL contar só os marcados como aliados.

#### Scenario: Prefeito aliado no mapa
- **WHEN** a campanha registra o prefeito de Maringá como aliado
- **THEN** Maringá aparece como "aliado" na camada Apoio de Prefeito e soma nos prefeitos aliados do painel

### Requirement: Configuração das cores e faixas
A campanha SHALL configurar a cor de cada situação política e até nove limites de faixa de meta de votos, em ordem
crescente, cada faixa com sua cor (a última faixa vale acima do último limite). Limites fora de ordem SHALL ser
recusados.

#### Scenario: Faixas fora de ordem
- **WHEN** a configuração informa os limites 250 e depois 100
- **THEN** o sistema recusa informando que os limites devem ser crescentes

### Requirement: Isolamento e auditoria do módulo Campanha
Todo dado de campanha SHALL pertencer a um tenant e a uma campanha; registros de outro tenant ou de outra campanha
SHALL responder como inexistentes. Toda alteração SHALL ser registrada na auditoria (antes/depois, usuário, IP) e
publicar um evento de domínio.

#### Scenario: Registro de outra campanha pela URL
- **WHEN** um usuário da campanha A pede pela URL um cabo eleitoral da campanha B
- **THEN** o sistema responde 404
