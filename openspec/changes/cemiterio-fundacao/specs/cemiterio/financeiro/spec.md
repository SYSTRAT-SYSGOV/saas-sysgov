# Spec Delta

## Purpose

Define a tabela de preços dos serviços cemiteriais, seu reajuste anual pelo IPCA, a emissão de guias de
cobrança próprias (em lote e avulsas), a segunda via, a baixa manual de pagamentos e o controle de
inadimplência. Não há integração com ERP municipal na v1 (premissa P03 falsa: RF-24 fora do escopo).

## ADDED Requirements

### Requirement: Tabela de preços parametrizável
<!-- rastreabilidade: RF-20 -->
O sistema SHALL manter, por tenant, a tabela de preços por tipo de serviço (concessão temporária, concessão
perpétua, renovação, inumação, exumação, trasladação, taxa anual de manutenção, alvará de obra, entre outros),
com valor em centavos inteiros e período de vigência. Uma alteração SHALL criar nova vigência sem sobrescrever a
anterior, e toda cobrança SHALL registrar o preço vigente aplicado.

#### Scenario: Cobrança usa preço vigente
- **WHEN** a inumação é solicitada em 10/03 e o preço mudou em 01/03
- **THEN** a guia usa o preço vigente desde 01/03

#### Scenario: Valor fracionário inválido
- **WHEN** o valor é enviado com mais de duas casas decimais
- **THEN** o sistema rejeita com erro de validação

### Requirement: Reajuste anual automático pelo IPCA
<!-- rastreabilidade: RF-21 -->
O sistema SHALL, uma vez por ano e antes da geração das guias de 1º de janeiro, obter de fonte oficial pública o
IPCA acumulado dos últimos 12 meses e aplicá-lo a todos os itens da tabela, criando nova vigência a partir de
1º de janeiro com arredondamento ao centavo (meio para cima). O reajuste SHALL registrar índice, competência,
percentual e origem (automática ou manual), SHALL ser auditado e SHALL NOT ser aplicado duas vezes à mesma
competência. Se a fonte estiver indisponível, o sistema SHALL notificar o perfil Financeiro, que SHALL poder
informar o percentual manualmente.

#### Scenario: Reajuste de 4,5%
- **WHEN** o IPCA acumulado obtido é 4,5% e o item custa R$ 100,00
- **THEN** a nova vigência do item, a partir de 1º de janeiro, é R$ 104,50

#### Scenario: Fonte indisponível
- **WHEN** a consulta do índice falha
- **THEN** nenhum preço é alterado, o Financeiro é notificado e pode aplicar o percentual manualmente

#### Scenario: Reajuste duplicado
- **WHEN** há nova tentativa de reajuste para a mesma competência
- **THEN** o sistema recusa a operação

### Requirement: Guia de recolhimento própria
<!-- rastreabilidade: RF-22, RF-23; premissa P03 -->
O sistema SHALL emitir guias de recolhimento em PDF com número único por tenant, dados do contribuinte, serviço,
valor, vencimento e as instruções de pagamento parametrizadas pelo município (texto e chave PIX opcional). As
guias SHALL ter as situações Emitida, Paga e Cancelada; uma guia Emitida com vencimento passado SHALL ser
tratada como vencida.

#### Scenario: PDF da guia
- **WHEN** uma guia é emitida
- **THEN** o PDF contém número, valor, vencimento e as instruções de pagamento vigentes do município

### Requirement: Guias em lote no início do exercício
<!-- rastreabilidade: RF-22 -->
O sistema SHALL gerar, em 1º de janeiro de cada ano, uma guia da taxa anual de manutenção para cada concessão
vigente sujeita à taxa, com o preço vigente naquela data. A geração SHALL ser idempotente por concessão e
exercício e SHALL produzir relatório com totais gerados e falhas.

#### Scenario: Reprocessamento do lote
- **WHEN** o lote de 2027 é executado novamente após falha parcial
- **THEN** somente as concessões sem guia de 2027 recebem guia

### Requirement: Segunda via
<!-- rastreabilidade: RF-23 -->
O sistema SHALL emitir segunda via de guia não paga, pelo painel do órgão ou pelo portal do concessionário
titular, com novo vencimento, mantendo vínculo com a guia original, que passa a Cancelada.

#### Scenario: Guia já paga
- **WHEN** é solicitada segunda via de uma guia Paga
- **THEN** o sistema recusa informando que a guia está quitada

### Requirement: Baixa manual de pagamento e inadimplência
<!-- rastreabilidade: RF-24 substituído (premissa P03 falsa); DRS §3.1 (inadimplência) -->
O perfil Financeiro SHALL registrar a baixa de pagamento de uma guia informando data, valor pago e comprovante
anexado; a guia passa a Paga e a baixa é auditada. O sistema SHALL oferecer relatório de inadimplência com as
guias vencidas não pagas, filtrável por cemitério, serviço e exercício.

#### Scenario: Baixa com comprovante
- **WHEN** o Financeiro registra o pagamento de uma guia com comprovante anexado
- **THEN** a guia passa a Paga com data e valor registrados e sai do relatório de inadimplência

#### Scenario: Baixa sem comprovante
- **WHEN** a baixa é enviada sem comprovante
- **THEN** o sistema rejeita com erro de validação
