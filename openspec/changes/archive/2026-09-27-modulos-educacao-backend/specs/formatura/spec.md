# Spec Delta

## Purpose

Controla a arrecadação da formatura dos alunos do cadastro escolar — configuração de valores, adesão e
convidados de cada formando, pagamentos parcelados e relatórios financeiros — com todos os valores em centavos.

## ADDED Requirements

### Requirement: Dependência do cadastro escolar e isolamento
O módulo SHALL depender do módulo Escola, usar os alunos e turmas do cadastro escolar do mesmo tenant e tratar
registros de outro tenant como inexistentes.

#### Scenario: Participação de aluno de outro tenant
- **WHEN** a requisição de participação aponta para um aluno de outro tenant
- **THEN** o sistema responde 404 (aluno inexistente para o tenant) e nada é gravado

#### Scenario: Pagamento para aluno de outro tenant
- **WHEN** o corpo do pagamento informa o id de um aluno de outro tenant
- **THEN** o sistema rejeita com erro de validação

### Requirement: Permissões e perfis do módulo Formatura
O módulo SHALL declarar `formatura.view`, `formatura.config.manage`, `formatura.formandos.manage` e
`formatura.pagamentos.manage`, e provisionar os perfis **Comissão de Formatura** (todas) e **Tesouraria**
(`view` e `pagamentos.manage`).

#### Scenario: Tesouraria não altera valores
- **WHEN** um usuário com o perfil Tesouraria tenta alterar o valor por pessoa
- **THEN** o sistema responde 403

### Requirement: Valores monetários em centavos
Todo valor monetário do módulo (valores de configuração, valores devidos, pagamentos e totais de relatório)
SHALL ser recebido, armazenado e devolvido como inteiro em centavos, sem casas decimais de ponto flutuante.

#### Scenario: Valor com fração
- **WHEN** a requisição informa um pagamento de `150.5`
- **THEN** o sistema rejeita com erro de validação exigindo um inteiro em centavos

### Requirement: Configuração da formatura
O sistema SHALL manter uma configuração por tenant e ano letivo com título, tipo de cálculo (`por_pessoa` ou
`fixo_mais_convidados`), valor base, valor por pessoa extra, quantidade padrão de convidados incluídos, número
máximo de parcelas (1 a 24), chaves Pix e formas de pagamento aceitas.

#### Scenario: Parcelas fora do limite
- **WHEN** o usuário configura 30 parcelas
- **THEN** o sistema rejeita com erro de validação

### Requirement: Participação dos formandos
O sistema SHALL registrar, por aluno, se participa da formatura, a quantidade de convidados incluídos, a
quantidade de convidados extras (inteiro ≥ 0) e observações. O valor devido SHALL ser calculado no servidor:
- `por_pessoa`: valor base × (1 + convidados incluídos + convidados extras);
- `fixo_mais_convidados`: valor base + convidados extras × valor por pessoa extra.
Um aluno que não participa SHALL ter valor devido zero.

#### Scenario: Cálculo por pessoa
- **WHEN** o tipo é `por_pessoa`, o valor base é 15000 centavos e o formando tem 2 convidados incluídos e 1 extra
- **THEN** o valor devido é 60000 centavos

#### Scenario: Cálculo fixo mais convidados
- **WHEN** o tipo é `fixo_mais_convidados`, o valor base é 50000, o valor por extra é 8000 e há 3 extras
- **THEN** o valor devido é 74000 centavos

### Requirement: Pagamentos
O sistema SHALL registrar pagamentos de um formando com número da parcela (1 até o máximo configurado), data,
valor em centavos (> 0), forma de pagamento (entre as aceitas na configuração), chave Pix quando a forma for Pix
e observação. Excluir um pagamento SHALL ser lógico e auditado.

#### Scenario: Forma de pagamento não aceita
- **WHEN** a configuração aceita apenas Pix e Dinheiro e o pagamento informa Boleto
- **THEN** o sistema rejeita com erro de validação

### Requirement: Situação financeira do formando
O sistema SHALL informar, para cada formando, total pago, saldo devedor e situação: `quitado` (pago ≥ devido e
devido > 0), `parcial` (0 < pago < devido) ou `pendente` (nada pago).

#### Scenario: Pagamento parcial
- **WHEN** o valor devido é 60000 e foram pagos 20000
- **THEN** a situação é `parcial` e o saldo devedor é 40000

### Requirement: Relatório financeiro
O sistema SHALL gerar o relatório com totais a receber, recebido, pendente, percentual arrecadado, total de
formandos e convidados, quantidades por situação, totais por forma de pagamento e o detalhamento por turma e por
aluno, calculados no servidor a partir dos pagamentos registrados.

#### Scenario: Totais conferem
- **WHEN** há pagamentos de 20000 em Pix e 10000 em Dinheiro
- **THEN** o total recebido é 30000 e o relatório por forma de pagamento soma 30000

### Requirement: Auditoria do módulo Formatura
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria e evento de domínio na outbox na
mesma transação.

#### Scenario: Pagamento auditado
- **WHEN** um pagamento é registrado
- **THEN** existe registro de auditoria do pagamento e um evento `formatura.pagamento.registrado` na outbox
