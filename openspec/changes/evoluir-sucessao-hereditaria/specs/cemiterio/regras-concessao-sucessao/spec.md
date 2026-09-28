# Spec Delta

## MODIFIED Requirements

### Requirement: Bloqueio de sepultamento de terceiros em jazigo com titular falecido sem sucessão

O sistema SHALL bloquear a realização de novos sepultamentos (inumações) de terceiros em jazigos concedidos cujo titular concessionário esteja registrado com óbito (`titular_falecido`), exigindo a comprovação de regularização de sucessão hereditária através de processo administrativo municipal ou alvará judicial.

#### Scenario: Impedir sepultamento de terceiro sem sucessão regularizada
- **WHEN** um operador tenta cadastrar uma nova inumação de pessoa não autorizada em jazigo cujo concessionário titular possui flag de falecido sem partilha/sucessão formalizada (processo não está em `Sucedida`)
- **THEN** o sistema impede a confirmação do sepultamento com erro de regra de negócio indicando que a concessão possui sucessão hereditária pendente
- **THEN** a mensagem de erro referencia o processo sucessório pendente (ID e estado atual)

#### Scenario: Permitir sepultamento do próprio titular falecido
- **WHEN** o sepultamento sendo realizado for do próprio titular concessionário da concessão
- **THEN** o sistema autoriza a inumação na gaveta livre do jazigo
- **THEN** registra o status de titular falecido para futuras movimentações
- **THEN** dispara automaticamente a sugestão de abertura de processo sucessório se não houver nenhum em andamento

### Requirement: Vinculação obrigatória de processo administrativo municipal à concessão

O sistema SHALL vincular obrigatoriamente a toda concessão cemiterial o número do Processo Administrativo Municipal correspondente, distinguindo concessões de tipo comum/temporário (terra com prazo de vigência determinado) de concessões perpétuas (gaveta/concreto com direito perpétuo de aforamento).

#### Scenario: Nova concessão requer processo administrativo
- **WHEN** uma nova concessão é emitida pelo operador
- **THEN** o sistema armazena e valida o número do processo administrativo municipal
- **THEN** define o prazo de validade conforme a modalidade temporária ou perpétua

#### Scenario: Renovação de concessão temporária
- **WHEN** uma concessão temporária é renovada ou revalidada
- **THEN** o sistema registra o novo processo administrativo de renovação
- **THEN** atualiza a data limite de vigência da concessão

#### Scenario: Concessão sucedida mantém rastreabilidade do processo original
- **WHEN** a concessão transita para `Sucedida` via processo sucessório
- **THEN** o processo administrativo original permanece vinculado
- **THEN** o novo titular herda o vínculo com o processo administrativo originário