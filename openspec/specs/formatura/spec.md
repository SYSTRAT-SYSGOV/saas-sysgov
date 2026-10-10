# Spec: formatura

> Criada a partir da mudança `modulos-educacao-backend` (Fase 1 — backend dos módulos de educação), arquivada em 2026-09-27.
> Atualizada pela mudança `modulos-educacao-frontend` (Fase 2 — telas na API), arquivada em 2026-10-02.
> Fonte: apps/api/Modules/Formatura, docs/modules/formatura.md

## Purpose

Controla a arrecadação da formatura dos alunos do cadastro escolar — configuração de valores, adesão e
convidados de cada formando, pagamentos parcelados e relatórios financeiros — com todos os valores em centavos.

## Requirements

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
(`view` e `pagamentos.manage`). Os dois perfis SHALL incluir também `escola.view` (leitura do cadastro escolar).

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
máximo de parcelas (1 a 24), chaves Pix, formas de pagamento aceitas e as **turmas formandas** (turmas do cadastro
escolar do mesmo tenant e do mesmo ano letivo). Somente alunos das turmas formandas SHALL ser formandos; sem turmas
formandas, não há formandos.

#### Scenario: Parcelas fora do limite
- **WHEN** o usuário configura 30 parcelas
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Turma de outro ano letivo
- **WHEN** a configuração de 2026 informa como formanda uma turma de 2025
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Só alunos das turmas formandas
- **WHEN** a configuração de 2026 tem apenas a turma "3º A" como formanda e o ano tem também a turma "1º A"
- **THEN** a lista de formandos traz só os alunos do "3º A"

### Requirement: Participação dos formandos
O sistema SHALL registrar, por aluno de turma formanda, se participa da formatura, o número de convidados
(inteiro ≥ 0) e observações. Aluno sem participação registrada SHALL contar como não participante. O sistema SHALL
permitir marcar ou desmarcar a participação de todos os alunos de uma turma formanda numa única operação atômica. O
valor devido SHALL ser calculado no servidor:
- `por_pessoa`: valor por pessoa × (1 + convidados);
- `fixo_mais_convidados`: valor fixo + convidados × valor por convidado.
Um aluno que não participa SHALL ter valor devido zero. Aluno fora das turmas formandas SHALL ser rejeitado com
erro de validação.

#### Scenario: Cálculo por pessoa
- **WHEN** o tipo é `por_pessoa`, o valor por pessoa é 15000 centavos e o formando tem 3 convidados
- **THEN** o valor devido é 60000 centavos

#### Scenario: Cálculo fixo mais convidados
- **WHEN** o tipo é `fixo_mais_convidados`, o valor fixo é 50000, o valor por convidado é 8000 e há 3 convidados
- **THEN** o valor devido é 74000 centavos

#### Scenario: Marcar a turma inteira
- **WHEN** a comissão marca como participantes todos os alunos da turma formanda "3º A"
- **THEN** todos os alunos do "3º A" passam a participar, cada alteração é auditada e as demais turmas não mudam

#### Scenario: Aluno fora das turmas formandas
- **WHEN** a comissão tenta registrar a participação de um aluno do "1º A", que não é turma formanda
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Aluno transferido
- **WHEN** a comissão tenta marcar como participante, ou registrar pagamento para, um aluno transferido
- **THEN** o sistema rejeita com erro de validação, mas permite retirá-lo da formatura; aluno remanejado participa na turma de destino

### Requirement: Pagamentos
O sistema SHALL registrar pagamentos de um formando participante com número da parcela (1 até o máximo
configurado), data, valor em centavos (> 0), forma de pagamento (entre as aceitas na configuração), chave Pix quando
a forma for Pix e observação. Excluir um pagamento SHALL ser lógico e auditado. O sistema SHALL listar os pagamentos
ativos do ano letivo, opcionalmente num período de datas, com o nome e a turma do aluno.

#### Scenario: Forma de pagamento não aceita
- **WHEN** a configuração aceita apenas Pix e Dinheiro e o pagamento informa Boleto
- **THEN** o sistema rejeita com erro de validação

#### Scenario: Listagem do ano por período
- **WHEN** há pagamentos em 10/06 e 10/07 e o usuário lista de 01/07 a 31/07
- **THEN** só o pagamento de 10/07 aparece, com nome e turma do aluno, e pagamentos estornados não aparecem

### Requirement: Situação financeira do formando
O sistema SHALL informar, para cada formando, total pago, saldo devedor e situação: `quitado` (pago ≥ devido e
devido > 0), `parcial` (0 < pago < devido) ou `pendente` (nada pago).

#### Scenario: Pagamento parcial
- **WHEN** o valor devido é 60000 e foram pagos 20000
- **THEN** a situação é `parcial` e o saldo devedor é 40000

### Requirement: Relatório financeiro
O sistema SHALL gerar o relatório com totais a receber, recebido, pendente, percentual arrecadado, total de
formandos e convidados, quantidades por situação, totais por forma de pagamento e o detalhamento por turma e por
aluno, calculados no servidor a partir dos pagamentos registrados. Quando informado um período de datas, o período
SHALL restringir apenas o recebido no período e os totais por forma de pagamento; valor devido, total pago, saldo e
situação de cada formando SHALL continuar calculados sobre o ano inteiro.

#### Scenario: Totais conferem
- **WHEN** há pagamentos de 20000 em Pix e 10000 em Dinheiro
- **THEN** o total recebido é 30000 e o relatório por forma de pagamento soma 30000

#### Scenario: Período não altera a situação
- **WHEN** um formando pagou 60000 de 60000 em junho e o relatório é pedido para julho
- **THEN** o recebido no período é 0 e o formando continua `quitado`

### Requirement: Auditoria do módulo Formatura
Toda criação, alteração e exclusão no módulo SHALL gerar registro de auditoria e evento de domínio na outbox na
mesma transação.

#### Scenario: Pagamento auditado
- **WHEN** um pagamento é registrado
- **THEN** existe registro de auditoria do pagamento e um evento `formatura.pagamento.registrado` na outbox

### Requirement: Telefone do formando mantido no cadastro escolar
A ficha do formando SHALL exibir o contato principal do aluno no cadastro escolar e permitir alterá-lo a quem tem
`formatura.formandos.manage`. A alteração SHALL ser gravada no cadastro escolar (contato principal do aluno),
preservando os demais contatos, e auditada no módulo Escola. Os perfis da Formatura SHALL continuar sem permissão de
editar os demais dados do aluno.

#### Scenario: Telefone alterado na Formatura aparece no Escola
- **WHEN** a comissão altera o telefone de um formando que tem dois contatos
- **THEN** o contato principal do aluno no cadastro escolar passa a ter o novo telefone e o segundo contato não muda

#### Scenario: Tesouraria não altera telefone
- **WHEN** um usuário com o perfil Tesouraria tenta alterar o telefone de um formando
- **THEN** o sistema responde 403

### Requirement: Telas da Formatura persistem no servidor
As telas do módulo Formatura SHALL ler e gravar exclusivamente pela API (configuração, formandos, pagamentos e
relatórios), por ano letivo escolhido no cabeçalho, exibindo valores monetários a partir de centavos inteiros e
enviando-os em centavos. As telas de turmas e alunos SHALL ser somente consulta das turmas formandas do cadastro
escolar, com atalho para o Cadastro Escolar. As telas SHALL usar os componentes de `@sysgov/ui`.

#### Scenario: Pagamento em reais convertido para centavos
- **WHEN** o usuário registra pela tela um pagamento de R$ 150,50
- **THEN** a API recebe `valor_centavos = 15050` e a tela volta a exibir R$ 150,50

#### Scenario: Turma não é criada pela Formatura
- **WHEN** o usuário abre a aba de turmas da Formatura
- **THEN** vê as turmas formandas do cadastro escolar, sem botão de criar turma, e um atalho para o Cadastro Escolar

#### Scenario: Ano sem configuração
- **WHEN** o usuário escolhe um ano letivo que ainda não tem configuração da formatura
- **THEN** a tela orienta a configurar a formatura daquele ano, sem exibir dados fictícios

### Requirement: Ficha do formando com prévia e simulação de parcelas
Ao marcar um aluno como participante, a tela SHALL abrir a ficha do formando. A ficha SHALL mostrar o valor devido
atualizado ao alterar o número de convidados e SHALL simular o pagamento do saldo em 1 até o número máximo de
parcelas da configuração, em centavos inteiros, com os centavos restantes na última parcela.

#### Scenario: Simulação de parcelas
- **WHEN** o saldo é R$ 1.000,00 e o usuário simula 3 parcelas
- **THEN** a ficha mostra 2 parcelas de R$ 333,33 e 1 de R$ 333,34

#### Scenario: Marcar participação abre a ficha
- **WHEN** o usuário liga "Participa" de um aluno na lista de formandos ou na relação de alunos
- **THEN** a participação é gravada e a ficha do formando abre para preencher convidados, telefone e observações
