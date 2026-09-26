# Spec: cemiterio/regras-concessao-sucessao

## Purpose
Gerencia as regras de negócio municipais de concessão cemiterial, controle de processos administrativos, trava anti-sepultamento de terceiros para titulares falecidos e sucessão hereditária de titularidade.

## ADDED Requirements

### Requirement: Trava Anti-Sepultamento para Titular Falecido sem Regularização
O sistema SHALL bloquear a realização de novos sepultamentos (inumações) de terceiros em jazigos concedidos cujo titular concessionário esteja registrado com óbito (`titular_falecido`), exigindo a comprovação de regularização de sucessão hereditária através de processo administrativo municipal ou alvará judicial.

#### Scenario: Bloqueio de sepultamento de terceiro em lote com titular falecido
- **WHEN** um operador tenta cadastrar uma nova inumação de pessoa não autorizada em jazigo cujo concessionário titular possui flag de falecido sem partilha/sucessão formalizada
- **THEN** o sistema impede a confirmação do sepultamento com erro de regra de negócio indicando que a concessão possui sucessão hereditária pendente

#### Scenario: Liberação de sepultamento para o próprio titular falecido
- **WHEN** o sepultamento sendo realizado for do próprio titular concessionário da concessão
- **THEN** o sistema autoriza a inumação na gaveta livre do jazigo e registra o status de titular falecido para futuras movimentações

### Requirement: Gestão de Processo Administrativo e Modalidade da Concessão
O sistema SHALL vincular obrigatoriamente a toda concessão cemiterial o número do Processo Administrativo Municipal correspondente, distinguindo concessões de tipo comum/temporário (terra com prazo de vigência determinado) de concessões perpétuas (gaveta/concreto com direito perpétuo de aforamento).

#### Scenario: Cadastro de concessão com processo administrativo
- **WHEN** uma nova concessão é emitida pelo operador
- **THEN** o sistema armazena e valida o número do processo administrativo municipal e define o prazo de validade conforme a modalidade temporária ou perpétua

#### Scenario: Histórico de prorrogações e revalidações
- **WHEN** uma concessão temporária é renovada ou revalidada
- **THEN** o sistema registra o novo processo administrativo de renovação e atualiza a data limite de vigência da concessão
