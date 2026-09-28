# Spec Delta

## Purpose

Rege as operações sobre restos mortais — inumação, exumação e trasladação — aplicando as regras legais de prazo,
a exceção judicial auditada, a digitalização de registros históricos e a emissão de ordens de serviço.

## ADDED Requirements

### Requirement: Registro de falecido
<!-- rastreabilidade: RF-06; RN-04, RN-06 -->
O sistema SHALL registrar o falecido com nome completo, data de nascimento, data de falecimento, número da
certidão de óbito, cartório emissor e, opcionalmente, causa da morte e documentos médicos. A idade na data do
óbito SHALL ser calculada a partir das datas informadas. Causa da morte e documentos médicos SHALL seguir as
regras de acesso restrito da capacidade `cemiterio/privacidade-auditoria`.

#### Scenario: Data de falecimento anterior ao nascimento
- **WHEN** o usuário informa data de falecimento anterior à data de nascimento
- **THEN** o sistema rejeita o registro com erro de validação

### Requirement: Inumação com validação de certidão de óbito
<!-- rastreabilidade: RF-06, RF-07; UC-01; CA-01 -->
O sistema SHALL permitir registrar inumação com dados do falecido e do sepultamento (jazigo, tipo, data/hora)
somente com certidão de óbito informada (número, cartório e arquivo anexado) e em jazigo que aceite
sepultamento: Concedido, Ocupado com ocupação abaixo da capacidade, ou cova pública Disponível. O número da
certidão SHALL ser único por tenant entre inumações não canceladas. Na confirmação do registro, o sistema SHALL
incrementar a ocupação, atualizar o estado do jazigo (Ocupado ou Capacidade Máxima), iniciar a contagem da
carência de exumação a partir da data do sepultamento e emitir a ordem de serviço. O cancelamento da inumação
SHALL desfazer a ocupação e o estado.

#### Scenario: Inumação sem certidão
- **WHEN** a solicitação de inumação não traz a certidão de óbito anexada
- **THEN** o sistema rejeita com erro de validação e nenhuma ordem de serviço é emitida

#### Scenario: Certidão já usada
- **WHEN** a certidão informada já está vinculada a outra inumação não cancelada do mesmo tenant
- **THEN** o sistema rejeita indicando duplicidade

#### Scenario: Confirmação ocupa o jazigo
- **WHEN** a inumação é confirmada com certidão anexada em jazigo Concedido
- **THEN** o jazigo passa a Ocupado imediatamente, a carência começa a contar e a ordem de serviço é emitida

### Requirement: Lançamento de inumação histórica
<!-- rastreabilidade: objetivo O1; DRS §13 (dados históricos de livros físicos) -->
O sistema SHALL permitir, a usuário com permissão específica, lançar inumações anteriores à implantação a partir
de livros físicos, com data do sepultamento no passado, certidão de óbito opcional e referência ao livro/folha.
Esses registros SHALL NOT gerar ordem de serviço, SHALL atualizar ocupação e estado do jazigo e SHALL ficar
marcados como "pendente de revisão" até que um usuário autorizado os valide.

#### Scenario: Registro de livro sem certidão
- **WHEN** o operador lança um sepultamento de 1998 sem certidão, informando livro e folha
- **THEN** o registro é aceito como pendente de revisão, sem ordem de serviço, e a ocupação do jazigo é atualizada

### Requirement: Ordem de serviço
<!-- rastreabilidade: RF-07; DRS §4 (Coveiro/Operacional) -->
Toda inumação, exumação, trasladação e demolição deferida SHALL gerar uma ordem de serviço com número sequencial
por tenant e ano, data/hora agendada, jazigo de origem e/ou destino, equipe responsável e situação (Emitida, Em
Execução, Concluída, Suspensa, Cancelada). A ordem SHALL poder ser baixada em PDF, e a equipe operacional SHALL
confirmar a execução pelo sistema.

#### Scenario: Numeração por município
- **WHEN** os tenants A e B emitem a primeira ordem de 2027
- **THEN** ambas recebem o número 1/2027 em seus respectivos tenants

### Requirement: Bloqueio de exumação por prazo legal
<!-- rastreabilidade: RF-08; RN-01, RN-02; UC-02; CA-02 -->
O sistema SHALL recusar a exumação ordinária, com erro 422 e sem gerar ordem de serviço, enquanto não decorrido
o prazo mínimo vigente no tenant contado da data do sepultamento (ou do último reinício de carência): o prazo de
crianças quando a idade no óbito for inferior à idade-limite parametrizada, e o prazo de adultos nos demais
casos. A recusa SHALL informar a data a partir da qual a exumação é permitida.

#### Scenario: Adulto antes do prazo
- **WHEN** o tenant usa prazo de adultos de 3 anos e a exumação de um adulto sepultado há 2 anos e 11 meses é solicitada
- **THEN** o sistema recusa com 422, não emite ordem de serviço e informa a data de liberação

#### Scenario: Criança após o prazo infantil
- **WHEN** a idade-limite é 6 anos, o prazo de crianças é 2 anos e o falecido tinha 4 anos, sepultado há 2 anos e 1 dia
- **THEN** o sistema permite a exumação ordinária

#### Scenario: Adulto após o prazo
- **WHEN** o prazo de adultos já decorreu
- **THEN** o sistema defere a exumação e emite a ordem de serviço

### Requirement: Exumação por determinação judicial
<!-- rastreabilidade: RF-09; RN-03 -->
O sistema SHALL permitir exumação antes do prazo legal somente quando registrada como judicial, com número do
processo, juízo, data da decisão e arquivo do mandado anexado, por usuário com permissão específica de exceção
judicial. Cada exceção SHALL gerar registro de auditoria imutável contendo o prazo contornado, o fundamento e o
autor, e o registro SHALL NOT poder ser editado ou excluído.

#### Scenario: Exceção judicial válida
- **WHEN** um usuário com permissão registra exumação judicial com mandado anexado para um adulto sepultado há 1 ano
- **THEN** o sistema defere a exumação e grava o registro de auditoria da exceção

#### Scenario: Exceção sem permissão ou sem mandado
- **WHEN** a exumação judicial é enviada sem arquivo do mandado ou por usuário sem a permissão
- **THEN** o sistema recusa (422 ou 403) e nada é deferido

### Requirement: Suspensão da exumação em campo e reinício da carência
<!-- rastreabilidade: RF-10; RN-01, RN-02 -->
A equipe de campo SHALL poder suspender uma exumação em execução informando motivo obrigatório (por exemplo,
restos não decompostos), com registro de data, hora e autor. A suspensão SHALL manter os restos no jazigo, SHALL
NOT alterar a ocupação e SHALL reiniciar a carência: a nova data de liberação passa a ser a data da suspensão
somada ao prazo vigente aplicável ao falecido.

#### Scenario: Restos não decompostos
- **WHEN** a equipe suspende em 10/03/2027 a exumação de um adulto, com prazo de adultos de 3 anos
- **THEN** a ordem passa a Suspensa, a ocupação permanece inalterada e a nova data de liberação é 10/03/2030

### Requirement: Trasladação
<!-- rastreabilidade: DRS §3.1 (trasladações) -->
O sistema SHALL permitir trasladar restos entre jazigos do tenant ou para fora do município, exigindo que a
exumação de origem seja permitida (prazo legal ou exceção judicial) e, se o destino for interno, que o jazigo
de destino aceite sepultamento. Na conclusão, a ocupação da origem SHALL ser decrementada e a do destino
incrementada numa única transação.

#### Scenario: Destino lotado
- **WHEN** a trasladação aponta um jazigo de destino em Capacidade Máxima
- **THEN** o sistema recusa sem alterar a origem

#### Scenario: Trasladação para outro município
- **WHEN** o destino é externo e a documentação de destino é informada
- **THEN** o sistema conclui a saída, decrementa a ocupação da origem e registra o destino externo
