# Spec Delta

## Purpose

Controla os empreiteiros autorizados a executar obras funerárias nos cemitérios do município, seus alvarás, o
limite de obras simultâneas e o regime de penalidades até o cancelamento do cadastro.

## ADDED Requirements

### Requirement: Cadastro de empreiteiro com alvará anual
<!-- rastreabilidade: RF-29; RN-05 -->
O sistema SHALL cadastrar empreiteiros com CPF ou CNPJ válido (único por tenant), razão social/nome, responsável
técnico e contatos, e controlar o alvará anual de funcionamento (número, validade, documento). Empreiteiro sem
alvará anual vigente SHALL ser considerado inapto.

#### Scenario: Alvará anual vencido
- **WHEN** o alvará anual do empreiteiro vence
- **THEN** o empreiteiro passa a inapto e não pode receber novo alvará de obra

### Requirement: Alvará de obra funerária
<!-- rastreabilidade: RF-30; RN-08 -->
Toda obra em jazigo SHALL exigir alvará de obra emitido mediante solicitação, para empreiteiro apto, vinculado a
um jazigo com concessão vigente, com descrição, dimensões do projeto e prazo de execução. O sistema SHALL recusar
o alvará quando as dimensões do projeto excederem as dimensões máximas do túmulo parametrizadas.

#### Scenario: Projeto acima da dimensão
- **WHEN** o projeto informa 3,20 m × 2,10 m e o máximo parametrizado é 3,00 m × 2,10 m
- **THEN** o alvará de obra é recusado

### Requirement: Limite de obras simultâneas
<!-- rastreabilidade: RF-31; RN-09 -->
O sistema SHALL recusar a emissão de alvará de obra para empreiteiro que já possua, pendentes, a quantidade de
obras igual ao limite parametrizado (referência 2). Obras concluídas, canceladas ou vencidas SHALL NOT contar no
limite.

#### Scenario: Terceira obra simultânea
- **WHEN** o limite é 2 e o empreiteiro tem 2 obras pendentes
- **THEN** o novo alvará de obra é recusado informando o limite

#### Scenario: Vaga liberada
- **WHEN** uma das duas obras pendentes é concluída
- **THEN** o empreiteiro pode receber novo alvará

### Requirement: Penalidades e cancelamento
<!-- rastreabilidade: RF-32 -->
O sistema SHALL registrar penalidades (advertência e suspensão com período) com motivo e documento. Empreiteiro
suspenso SHALL ser inapto durante o período. Ao registrar a suspensão cujo número atinge o limite parametrizado
(referência: segunda suspensão), o cadastro SHALL ser cancelado automaticamente, com as obras pendentes
sinalizadas para providência da administração.

#### Scenario: Segunda suspensão
- **WHEN** o limite é 2 e o empreiteiro, já com uma suspensão, recebe a segunda
- **THEN** o cadastro passa a Cancelado e as obras pendentes ficam sinalizadas
