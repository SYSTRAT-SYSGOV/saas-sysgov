# Spec Delta: Integrações e API (Meio Ambiente)

## Purpose

Disponibilização de API REST/JSON aberta e documentada do módulo de Meio Ambiente, e integração
máquina-a-máquina para envio ou exportação de dados a órgãos estaduais e federais de controle ambiental
(IBAMA, INEA, CETESB, entre outros).

## ADDED Requirements

### Requirement: API REST/JSON documentada do módulo
<!-- entities: DocumentacaoApiMeioAmbiente -->

O sistema SHALL disponibilizar documentação da API do módulo de Meio Ambiente em formato OpenAPI, acessível
publicamente dentro do domínio do tenant, descrevendo os endpoints, parâmetros e esquemas de resposta
disponíveis para consumo por sistemas parceiros.

#### Scenario: Consulta da documentação OpenAPI do módulo
- **WHEN** um cliente HTTP acessa o endpoint de documentação do módulo de Meio Ambiente
- **THEN** recebe o documento OpenAPI (`openapi.yaml`) descrevendo os endpoints públicos do módulo

### Requirement: Integração máquina-a-máquina com órgãos de controle
<!-- entities: MeioAmbienteIntegracao -->

O sistema SHALL permitir que órgãos estaduais e federais (IBAMA, INEA, CETESB ou equivalente) consumam,
via credencial própria de integração, dados de licenças emitidas, autos de infração ambiental e
relatórios de resíduos do tenant correspondente, sem expor dados de outros tenants.

#### Scenario: Consulta de licenças emitidas com credencial válida
- **GIVEN** uma credencial de integração ativa mapeada para um tenant
- **WHEN** o órgão parceiro consulta o endpoint público de licenças emitidas apresentando essa credencial
- **THEN** recebe apenas as licenças emitidas pelo tenant correspondente à credencial

#### Scenario: Credencial ausente ou inválida é rejeitada
- **WHEN** o endpoint público de integração é chamado sem credencial ou com credencial inativa
- **THEN** o controller responde HTTP 401

### Requirement: Envio assíncrono de dados aos órgãos de controle
<!-- entities: MeioAmbienteIntegracao -->

O sistema SHALL enviar dados de forma assíncrona (nunca em chamada síncrona originada de controller) aos
órgãos de controle que exigirem envio ativo (push) em vez de consulta (pull), registrando o resultado do
envio para reprocessamento em caso de falha.

#### Scenario: Falha de envio é registrada para reprocessamento
- **GIVEN** um auto de infração ambiental marcado para envio ativo a um órgão de controle
- **WHEN** a tentativa de envio falha por indisponibilidade do órgão destinatário
- **THEN** a falha é registrada e o envio é reagendado para nova tentativa, sem bloquear a operação do usuário que originou o auto de infração
