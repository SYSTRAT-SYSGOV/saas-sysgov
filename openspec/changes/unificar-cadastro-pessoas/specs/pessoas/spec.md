# Spec Delta

## MODIFIED Requirements

### Requirement: Cadastro único de pessoa física por tenant
O sistema SHALL manter um cadastro de pessoas físicas por tenant, com o CPF como chave de negócio única dentro do tenant quando informado. O sistema SHALL admitir pessoa física **sem CPF informado**, marcada com o estado `documento_pendente`, e SHALL garantir que duas pessoas nunca compartilhem o mesmo CPF no tenant, nem mesmo depois de regularizadas.

#### Scenario: Cadastro único por tenant
- **WHEN** uma pessoa é cadastrada com CPF já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

#### Scenario: Cadastro sem CPF como documento pendente
- **WHEN** uma pessoa física é cadastrada sem CPF
- **THEN** o sistema salva a pessoa com o estado `documento_pendente`, sem gerar chave de unicidade de documento, e a pessoa fica disponível para vínculo com os módulos

#### Scenario: Várias pessoas com documento pendente no mesmo tenant
- **WHEN** duas pessoas físicas distintas são cadastradas sem CPF no mesmo tenant
- **THEN** o sistema aceita as duas, pois a unicidade só vale para documentos informados

## ADDED Requirements

### Requirement: Regularização do documento de pessoa com documento pendente
O sistema SHALL permitir informar o CPF de uma pessoa com `documento_pendente`, mantendo o mesmo identificador, o histórico, os vínculos e as referências dos módulos. O sistema SHALL validar o CPF informado e rejeitar a regularização quando o CPF já pertencer a outra pessoa do tenant, oferecendo a opção de mesclar os dois cadastros.

#### Scenario: Regularização com CPF novo
- **WHEN** um usuário com permissão informa um CPF válido e ainda não usado para uma pessoa com documento pendente
- **THEN** o sistema grava o documento, remove o estado `documento_pendente` e mantém o identificador e todas as referências da pessoa

#### Scenario: Regularização com CPF de outra pessoa
- **WHEN** o CPF informado já pertence a outra pessoa do tenant
- **THEN** o sistema rejeita a regularização, informa a pessoa já cadastrada e oferece a mesclagem dos cadastros em vez de criar duplicidade

### Requirement: Responsável obrigatório para menor com documento pendente
O sistema SHALL exigir, para pessoa física menor de idade com `documento_pendente`, um responsável legal que seja pessoa física do mesmo tenant, sem duplicar os dados civis do responsável.

#### Scenario: Menor sem responsável
- **WHEN** uma pessoa menor de 18 anos é cadastrada sem CPF e sem responsável
- **THEN** o sistema rejeita o cadastro informando que o responsável é obrigatório

#### Scenario: Responsável de outro tenant ou jurídico
- **WHEN** o responsável informado pertence a outro tenant ou é pessoa jurídica
- **THEN** o sistema rejeita a requisição informando que o responsável deve ser pessoa física do mesmo tenant

### Requirement: Proteção de dados de pessoa sem documento e de menores
O sistema SHALL tratar pessoa com documento pendente e menores de idade como dados de acesso restrito: exibição sem dados sensíveis nas listagens e nos seletores compactos, acesso completo apenas por permissão específica e registro de auditoria nas leituras desmascaradas.

#### Scenario: Seletor compacto sem documento
- **WHEN** o seletor de pessoas lista uma pessoa com documento pendente
- **THEN** a resposta contém nome e o indicador de documento pendente, sem documento, data de nascimento ou filiação

### Requirement: Validação única de documento no cadastro central
O sistema SHALL validar CPF e CNPJ exclusivamente pelas regras do cadastro central de pessoas, e os módulos consumidores SHALL reutilizar essa validação em vez de manter regras próprias.

#### Scenario: Mesmo resultado em todos os módulos
- **WHEN** um documento é validado por qualquer módulo
- **THEN** o resultado (válido, inválido, tipo) é idêntico ao do cadastro central, incluindo CPF com máscara ou sem máscara
