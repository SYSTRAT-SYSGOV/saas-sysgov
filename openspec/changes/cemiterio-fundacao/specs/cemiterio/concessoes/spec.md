# Spec Delta

## Purpose

Controla o direito de uso de jazigos por concessionários — concessões temporárias e perpétuas — incluindo
vigência, expiração automática, renovação e notificação prévia do término.

## ADDED Requirements

### Requirement: Cadastro de concessionário
<!-- rastreabilidade: RF-11; RN-05 -->
O sistema SHALL cadastrar concessionários com nome, CPF ou CNPJ válido (dígito verificador), endereço, e-mail e
telefone, com unicidade do documento por tenant. Os dados SHALL seguir as regras LGPD da capacidade
`cemiterio/privacidade-auditoria`.

#### Scenario: CPF inválido
- **WHEN** o cadastro informa CPF com dígito verificador incorreto
- **THEN** o sistema rejeita com erro de validação

### Requirement: Concessão temporária e perpétua
<!-- rastreabilidade: RF-11 -->
O sistema SHALL conceder um jazigo Disponível a um concessionário na modalidade temporária (com data de início e
término, prazo padrão vindo dos parâmetros do tenant) ou perpétua (sem data de término), com número de concessão
único por tenant. Um jazigo SHALL ter no máximo uma concessão vigente. A ativação SHALL mudar o jazigo para
Concedido.

#### Scenario: Jazigo já concedido
- **WHEN** o atendente tenta conceder um jazigo que já tem concessão vigente
- **THEN** o sistema recusa a nova concessão

#### Scenario: Concessão perpétua
- **WHEN** uma concessão perpétua é ativada
- **THEN** ela não possui data de término e nunca é expirada automaticamente

### Requirement: Expiração automática
<!-- rastreabilidade: RF-14 -->
O sistema SHALL, diariamente, alterar para Expirada as concessões temporárias cuja data de término já passou e
que não foram renovadas. Uma concessão expirada de jazigo sem restos SHALL devolver o jazigo a Disponível; de
jazigo com restos SHALL manter o estado do jazigo e gerar pendência de regularização para a administração. A
rotina SHALL ser idempotente.

#### Scenario: Expiração de jazigo vazio
- **WHEN** a rotina diária encontra uma concessão temporária vencida ontem em jazigo sem restos
- **THEN** a concessão fica Expirada e o jazigo volta a Disponível

#### Scenario: Reexecução da rotina
- **WHEN** a rotina é executada duas vezes no mesmo dia
- **THEN** nenhuma concessão é processada em duplicidade

### Requirement: Renovação de concessão
<!-- rastreabilidade: RF-13 -->
O sistema SHALL permitir renovar uma concessão temporária vigente ou expirada (enquanto o jazigo não tiver sido
revertido ou concedido a terceiro), estendendo o término pelo período informado e gerando a guia da taxa de
renovação conforme a tabela de preços vigente.

#### Scenario: Renovação gera cobrança
- **WHEN** o concessionário renova por 5 anos
- **THEN** a nova data de término é registrada e uma guia com o valor da tabela vigente é gerada

### Requirement: Notificação antes do término
<!-- rastreabilidade: RF-12 -->
O sistema SHALL notificar o concessionário (e-mail e painel do portal) quando faltar o número de dias
parametrizado (referência: 30) para o término da concessão temporária, uma única vez por ciclo de vigência. O
envio SHALL ser assíncrono e sua falha SHALL NOT bloquear outras notificações.

#### Scenario: Aviso D-30
- **WHEN** a rotina diária encontra concessão que termina em 30 dias ou menos e ainda não notificada no ciclo
- **THEN** o concessionário recebe a notificação e o envio fica registrado

#### Scenario: Sem reenvio
- **WHEN** a rotina roda novamente no dia seguinte para a mesma concessão
- **THEN** nenhuma notificação duplicada é enviada
