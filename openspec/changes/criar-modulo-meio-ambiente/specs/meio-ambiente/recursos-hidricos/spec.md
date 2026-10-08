# Spec Delta: Recursos Hídricos

## Purpose

Gestão de outorgas municipais de uso da água (poço ou captação superficial) e de licenças de lançamento
de efluentes, com controle de vazão, finalidade, parâmetros de qualidade e alerta de vencimento.

## ADDED Requirements

### Requirement: Cadastro de outorga de uso da água
<!-- entities: OutorgaAgua -->

O sistema SHALL permitir o cadastro de outorgas de uso da água vinculadas a um empreendimento, indicando
o tipo de captação (`poço` ou `captacao_superficial`), a vazão outorgada e a finalidade de uso
(abastecimento, irrigação, industrial ou outra).

#### Scenario: Cadastro de outorga de poço para uso industrial
- **GIVEN** um empreendimento industrial cadastrado
- **WHEN** `cadastrarOutorga()` recebe `tipo_captacao = 'poco'`, `vazao_m3_hora = 10` e `finalidade = 'industrial'`
- **THEN** a outorga é persistida vinculada ao empreendimento, com data de validade calculada conforme o prazo configurado

### Requirement: Licença de lançamento de efluentes
<!-- entities: LicencaLancamentoEfluente -->

O sistema SHALL permitir o cadastro de licenças de lançamento de efluentes vinculadas a um empreendimento,
com registro dos parâmetros de qualidade exigidos (ex.: DBO, pH, temperatura) e seus limites regulatórios.

#### Scenario: Cadastro de licença com parâmetros de qualidade
- **GIVEN** um empreendimento com outorga de uso da água já cadastrada
- **WHEN** `cadastrarLicencaEfluente()` recebe os parâmetros `pH` com limite `6 a 9` e `DBO` com limite `até 60 mg/L`
- **THEN** a licença é persistida com os parâmetros e limites informados

#### Scenario: Registro de medição fora do limite regulatório é sinalizado
- **GIVEN** uma licença de lançamento de efluente com limite de `pH` entre 6 e 9
- **WHEN** uma medição de `pH = 10.5` é registrada para essa licença
- **THEN** a medição é persistida e a licença passa a exibir alerta de não conformidade

### Requirement: Alerta de vencimento de outorgas e licenças
<!-- entities: OutorgaAgua, LicencaLancamentoEfluente -->

O sistema SHALL gerar alerta automático a partir de 90, 30 e 7 dias antes do vencimento de outorgas de uso
da água e de licenças de lançamento de efluentes, visível aos usuários com permissão de gestão de recursos
hídricos.

#### Scenario: Alerta gerado 90 dias antes do vencimento da outorga
- **GIVEN** uma outorga de uso da água com validade em 90 dias a partir da execução do job de verificação
- **WHEN** o job diário de verificação de prazos de recursos hídricos é executado
- **THEN** um alerta de vencimento em 90 dias é registrado e fica visível na listagem de outorgas do empreendimento
