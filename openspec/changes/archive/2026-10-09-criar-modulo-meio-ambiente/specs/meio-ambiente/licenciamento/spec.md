# Spec Delta: Licenciamento Ambiental

## Purpose

Processo de licenciamento ambiental de atividades potencialmente poluidoras por fases (Licença Prévia,
Licença de Instalação, Licença de Operação, renovação e correção), com controle de prazo de validade,
condicionantes, documentos técnicos exigidos e vistorias, emitindo alertas de vencimento.

## ADDED Requirements

### Requirement: Abertura de processo de licenciamento por fase
<!-- entities: ProcessoLicenciamento -->

O sistema SHALL permitir abrir um processo de licenciamento para um empreendimento cadastrado, indicando a
fase (`LP`, `LI`, `LO`, `renovacao`, `correcao`), com numeração sequencial única por exercício e situação
inicial `em_analise`.

#### Scenario: Abertura de processo de Licença Prévia
- **GIVEN** um empreendimento com responsável técnico vinculado
- **WHEN** `abrirProcesso()` recebe `empreendimento_id` e `fase = 'LP'`
- **THEN** o processo é criado com `status = 'em_analise'`, numeração sequencial do exercício atual e registro de auditoria

#### Scenario: Renovação exige licença de operação vigente ou vencida há menos de 120 dias
- **GIVEN** um empreendimento cuja última Licença de Operação venceu há 200 dias
- **WHEN** `abrirProcesso()` recebe `fase = 'renovacao'` para esse empreendimento
- **THEN** lança `DomainException` "Prazo de renovação expirado — novo licenciamento completo é necessário" e o controller responde HTTP 422

### Requirement: Documentos técnicos exigidos por fase
<!-- entities: DocumentoLicenciamento -->

O sistema SHALL permitir anexar os documentos técnicos exigidos para cada fase do licenciamento (incluindo
Estudo de Impacto Ambiental e Relatório de Impacto Ambiental — EIA/RIMA, quando exigidos pela fase ou
porte do empreendimento), bloqueando o deferimento do processo enquanto houver documento obrigatório
pendente.

#### Scenario: Deferimento bloqueado por documento obrigatório pendente
- **GIVEN** um processo de Licença Prévia de empreendimento de porte `grande` que exige EIA/RIMA
- **WHEN** `deferir()` é chamado sem o documento `EIA_RIMA` anexado
- **THEN** lança `DomainException` "Documento obrigatório pendente: EIA/RIMA" e o controller responde HTTP 422

#### Scenario: Anexação de EIA/RIMA libera o deferimento
- **GIVEN** o mesmo processo do cenário anterior
- **WHEN** o documento `EIA_RIMA` é anexado e `deferir()` é chamado novamente
- **THEN** o processo é deferido com sucesso

### Requirement: Condicionantes da licença
<!-- entities: Condicionante -->

O sistema SHALL permitir registrar condicionantes vinculadas a uma licença deferida, cada uma com
descrição, prazo de cumprimento e situação (`pendente`, `cumprida`, `vencida`), impedindo a emissão de
licença de fase subsequente enquanto houver condicionante vencida e não cumprida.

#### Scenario: Condicionante vencida bloqueia fase subsequente
- **GIVEN** uma Licença de Instalação com uma condicionante vencida e não cumprida
- **WHEN** `abrirProcesso()` é chamado com `fase = 'LO'` para o mesmo empreendimento
- **THEN** lança `DomainException` "Condicionante pendente impede avanço de fase" e o controller responde HTTP 422

### Requirement: Vistoria técnica vinculada ao processo de licenciamento
<!-- entities: VistoriaTecnicaLicenciamento -->

O sistema SHALL permitir registrar o resultado de vistoria técnica (favorável ou desfavorável, com
parecer) vinculada a um processo de licenciamento, como subsídio à decisão de deferimento ou indeferimento.

#### Scenario: Vistoria desfavorável impede deferimento automático
- **GIVEN** um processo de licenciamento com vistoria técnica registrada como `desfavoravel`
- **WHEN** `deferir()` é chamado para esse processo
- **THEN** lança `DomainException` "Parecer técnico desfavorável — deferimento requer justificativa expressa" e o controller responde HTTP 422

### Requirement: Validade da licença e alerta de vencimento
<!-- entities: Licenca -->

O sistema SHALL calcular a data de validade da licença emitida a partir da fase e do prazo definido no
deferimento, e SHALL gerar alerta automático a partir de 90, 30 e 7 dias antes do vencimento, visível aos
usuários com permissão de gestão do licenciamento.

#### Scenario: Alerta gerado 30 dias antes do vencimento
- **GIVEN** uma Licença de Operação com validade em 30 dias a partir da execução do job de verificação
- **WHEN** o job diário de verificação de prazos de licenciamento é executado
- **THEN** um alerta de vencimento em 30 dias é registrado e fica visível na listagem de licenças do empreendimento

#### Scenario: Licença vencida sem renovação em andamento é marcada como irregular
- **GIVEN** uma Licença de Operação vencida há 10 dias sem processo de renovação aberto
- **WHEN** o job diário de verificação de prazos de licenciamento é executado
- **THEN** o empreendimento passa a constar como `situacao_licenciamento = 'irregular'` nas consultas do módulo
