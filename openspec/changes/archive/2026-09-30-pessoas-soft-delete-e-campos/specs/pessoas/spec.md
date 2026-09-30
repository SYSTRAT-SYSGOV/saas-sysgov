# Spec Delta

## MODIFIED Requirements

### Requirement: Vínculos de papel modelados em tabela própria
O sistema SHALL modelar cada papel que uma pessoa exerce (servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno, paciente) como um vínculo em tabela própria, associado à pessoa, e não como um atributo fixo do cadastro da pessoa. Cada vínculo SHALL admitir o registro opcional de uma matrícula funcional.

#### Scenario: Múltiplos vínculos
- **WHEN** uma pessoa é cadastrada como servidor de carreira e depois vinculada como munícipe
- **THEN** o sistema mantém um único cadastro de pessoa com dois vínculos, sem duplicar a pessoa

#### Scenario: Vínculo com vigência
- **WHEN** um vínculo é encerrado (ex.: exoneração de cargo comissionado)
- **THEN** o sistema registra a data de término do vínculo sem excluir o histórico nem a pessoa

#### Scenario: Matrícula funcional registrada no vínculo
- **WHEN** um vínculo de servidor de carreira é cadastrado com uma matrícula funcional
- **THEN** o sistema armazena a matrícula associada a esse vínculo específico, não ao cadastro da pessoa

### Requirement: Documentos, endereços e contatos multivalorados
O sistema SHALL permitir que uma pessoa tenha múltiplos documentos (RG, CNH, título de eleitor), múltiplos endereços e múltiplos contatos (celular, e-mail, telefone), cada um associado à pessoa; entre os contatos de um mesmo tipo, no máximo um SHALL ser marcado como principal. Cada documento SHALL admitir o registro opcional da UF e da data de emissão. Cada contato SHALL registrar se a pessoa autoriza o recebimento de notificações por aquele canal, com valor padrão de autorização concedida.

#### Scenario: Contato principal único por tipo
- **WHEN** um segundo e-mail é marcado como principal para uma pessoa que já tinha um e-mail principal
- **THEN** o sistema desmarca o e-mail principal anterior e mantém apenas o novo como principal

#### Scenario: UF e data de emissão do documento
- **WHEN** um RG é cadastrado informando UF e data de emissão
- **THEN** o sistema armazena esses dados junto ao documento

#### Scenario: Consentimento de notificação por contato
- **WHEN** um contato é cadastrado sem informar explicitamente a autorização de notificações
- **THEN** o sistema considera a autorização concedida por padrão

## ADDED Requirements

### Requirement: Exclusão lógica de pessoa
O sistema SHALL excluir uma pessoa de forma lógica (soft delete), nunca removendo fisicamente o registro nem o histórico relacionado (vínculos, documentos, endereços, contatos, promoção a usuário), preservando-os para fins de auditoria.

#### Scenario: Exclusão preserva o histórico
- **WHEN** um administrador exclui uma pessoa que possui vínculos, documentos e um usuário promovido
- **THEN** o sistema marca a pessoa como excluída, deixa de retorná-la em buscas e listagens padrão, e mantém intactos no banco de dados a própria pessoa e todo o seu histórico relacionado

#### Scenario: CPF de pessoa excluída continua bloqueado para reuso
- **WHEN** um administrador tenta cadastrar uma nova pessoa com o mesmo CPF de uma pessoa já excluída logicamente no mesmo tenant
- **THEN** o sistema rejeita a duplicação da mesma forma que rejeitaria para uma pessoa não excluída
