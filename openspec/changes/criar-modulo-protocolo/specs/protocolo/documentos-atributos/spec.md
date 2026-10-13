# Spec Delta

## Purpose

Define a anexação de documentos com verificação de integridade e o registro de atributos dinâmicos tipados e validados nos processos do Protocolo.

## ADDED Requirements

### Requirement: Anexação de documentos com validação e integridade
O sistema SHALL permitir anexar documentos a um processo, validando tipo (extensão e conteúdo) e tamanho máximo configurado, armazenando o arquivo em área segregada por tenant e registrando o hash SHA-256 do conteúdo.

#### Scenario: Documento válido anexado
- **WHEN** um usuário com `protocolo.processos.update` anexa um PDF dentro do limite de tamanho
- **THEN** o documento é registrado com nome original, tipo de documento, caminho de armazenamento do tenant, hash SHA-256 e autor

#### Scenario: Tipo ou tamanho inválido
- **WHEN** o arquivo enviado tem extensão não permitida, conteúdo divergente da extensão ou excede o tamanho máximo
- **THEN** o sistema rejeita o envio com erro de validação (HTTP 422) e nenhum arquivo é armazenado

#### Scenario: Download restrito ao tenant
- **WHEN** um usuário de outro tenant tenta baixar o documento
- **THEN** o sistema responde HTTP 404

#### Scenario: Verificação de integridade
- **WHEN** um documento é baixado
- **THEN** o sistema disponibiliza o hash registrado para conferência da integridade do arquivo

### Requirement: Documentos não são sobrescritos
O sistema SHALL manter documentos anexados sem sobrescrita: uma nova versão é anexada como novo documento, e a remoção é apenas lógica.

#### Scenario: Nova versão de documento
- **WHEN** um usuário anexa uma versão corrigida de um documento já existente
- **THEN** o documento original permanece inalterado e a nova versão é registrada como documento separado

### Requirement: Atributos dinâmicos tipados
O sistema SHALL permitir adicionar a um processo atributos dinâmicos (chave e valor) dos tipos `numerico`, `texto`, `lista`, `lista_multipla`, `data`, `decimal` e `texto_longo`, validando o valor conforme o tipo antes de persistir, com chave única por processo.

#### Scenario: Atributos dinâmicos
- **WHEN** um atributo `valor_estimado` do tipo `decimal` com valor `"1520.75"` é adicionado a um processo
- **THEN** o atributo é validado como decimal (sem uso de ponto flutuante binário) e persistido

#### Scenario: Valor incompatível com o tipo
- **WHEN** um atributo do tipo `data` recebe o valor `"31/02/2026"` ou um atributo `numerico` recebe `"abc"`
- **THEN** o sistema rejeita o atributo com erro de validação indicando a chave e o tipo esperado

#### Scenario: Lista e lista múltipla
- **WHEN** um atributo `lista` recebe um único valor textual e um atributo `lista_multipla` recebe um conjunto de valores textuais
- **THEN** ambos são aceitos; `lista` com conjunto de valores ou `lista_multipla` com valor escalar são rejeitados

#### Scenario: Chave duplicada
- **WHEN** um atributo é adicionado com chave já existente no mesmo processo
- **THEN** o sistema rejeita a operação com erro de validação

### Requirement: Validação de atributos reutilizável por outros módulos
O sistema SHALL disponibilizar a validação dos sete tipos de atributos dinâmicos como capacidade central da plataforma, aplicando as mesmas regras a qualquer módulo que a utilize.

#### Scenario: Regras idênticas entre módulos
- **WHEN** outro módulo valida um atributo do tipo `data` com a capacidade central
- **THEN** o resultado da validação é idêntico ao obtido no Protocolo para o mesmo valor
