# Spec Delta: Compensação Ambiental

## Purpose

Cálculo, cobrança e acompanhamento da compensação ambiental devida por empreendimentos com impacto
significativo, controlando valor devido, pagamentos, saldo e destinação dos recursos.

## ADDED Requirements

### Requirement: Cálculo do percentual de compensação devido
<!-- entities: CompensacaoAmbiental -->

O sistema SHALL calcular o valor devido de compensação ambiental como um percentual configurável
(parametrizado inicialmente em 0,5%) sobre o valor do empreendimento, para empreendimentos marcados como
de impacto ambiental significativo durante o licenciamento.

#### Scenario: Cálculo de compensação para empreendimento de impacto significativo
- **GIVEN** um empreendimento marcado como `impacto_significativo = true` com `valor_empreendimento_centavos = 100000000` (R$ 1.000.000,00)
- **WHEN** `calcularCompensacaoDevida()` é chamado com o percentual configurado de 0,5%
- **THEN** retorna `valor_devido_centavos = 500000` (R$ 5.000,00) vinculado ao processo de licenciamento do empreendimento

#### Scenario: Empreendimento sem impacto significativo não gera compensação
- **GIVEN** um empreendimento marcado como `impacto_significativo = false`
- **WHEN** o processo de licenciamento é deferido
- **THEN** nenhuma compensação ambiental é criada para esse empreendimento

### Requirement: Controle de pagamentos e saldo devedor
<!-- entities: PagamentoCompensacao -->

O sistema SHALL registrar pagamentos parciais ou totais da compensação ambiental devida, atualizando o
saldo devedor e impedindo a emissão da licença de operação definitiva enquanto houver saldo pendente,
salvo quando a Secretaria autorizar parcelamento.

#### Scenario: Pagamento parcial reduz o saldo devedor
- **GIVEN** uma compensação ambiental devida de R$ 5.000,00 sem pagamentos registrados
- **WHEN** `registrarPagamento()` recebe `valor_centavos = 200000` (R$ 2.000,00)
- **THEN** o saldo devedor passa a ser R$ 3.000,00 e o pagamento é registrado com data e comprovante

#### Scenario: Licença de operação bloqueada por saldo pendente
- **GIVEN** uma compensação ambiental com saldo devedor de R$ 3.000,00 e sem parcelamento autorizado
- **WHEN** o processo de Licença de Operação do mesmo empreendimento é submetido a deferimento
- **THEN** lança `DomainException` "Compensação ambiental com saldo pendente impede emissão da licença" e o controller responde HTTP 422

### Requirement: Destinação dos recursos de compensação
<!-- entities: DestinacaoCompensacao -->

O sistema SHALL permitir registrar a destinação dos valores pagos de compensação ambiental (fundo
municipal de meio ambiente ou unidade de conservação específica), mantendo o total destinado sempre igual
ao total efetivamente pago.

#### Scenario: Destinação integral ao fundo municipal
- **GIVEN** uma compensação ambiental com R$ 5.000,00 totalmente pagos e sem destinação registrada
- **WHEN** `registrarDestinacao()` recebe `destino = 'fundo_municipal'` e `valor_centavos = 500000`
- **THEN** a destinação é registrada e o total destinado passa a corresponder ao total pago

#### Scenario: Destinação acima do valor pago é rejeitada
- **GIVEN** uma compensação ambiental com R$ 3.000,00 pagos e nenhuma destinação ainda registrada
- **WHEN** `registrarDestinacao()` recebe `valor_centavos = 400000` (R$ 4.000,00)
- **THEN** lança `DomainException` "Destinação não pode exceder o valor pago" e o controller responde HTTP 422
