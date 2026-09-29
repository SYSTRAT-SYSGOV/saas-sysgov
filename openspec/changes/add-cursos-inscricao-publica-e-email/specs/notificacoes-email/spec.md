# Spec Delta

## Purpose
Entregar por e-mail as mensagens transacionais geradas pelo sistema (cadastro, inscrição,
certificado, recuperação de senha) a partir dos eventos do Outbox, de forma assíncrona,
sem duplicidade, com registro de cada envio e com a identidade visual do órgão.

## ADDED Requirements

### Requirement: Envio assíncrono a partir dos eventos do Outbox
O sistema SHALL enviar e-mails somente a partir de eventos do Outbox, fora da requisição do
usuário, e SHALL processar os eventos pendentes periodicamente sem intervenção manual. Uma
requisição que gera um evento SHALL responder sem esperar o envio. Quando o envio falhar, o
evento SHALL ser reprocessado com espera crescente entre as tentativas, até cinco tentativas;
depois disso SHALL ficar como `failed` e visível ao Administrador.

#### Scenario: E-mail enviado depois do evento
- **WHEN** uma inscrição é criada e o evento correspondente é gravado no Outbox
- **THEN** a resposta ao participante não espera o e-mail e, no próximo ciclo de processamento, o e-mail de inscrição é enviado

#### Scenario: Falha temporária do servidor de e-mail
- **WHEN** o servidor de e-mail recusa a conexão durante o envio
- **THEN** o evento volta para `pending` com nova data de tentativa e o erro fica registrado

#### Scenario: Tentativas esgotadas
- **WHEN** o envio falha pela quinta vez seguida
- **THEN** o evento fica `failed` e o envio aparece como falho na consulta do Administrador

### Requirement: Nenhum e-mail duplicado por evento
O sistema SHALL enviar no máximo um e-mail por combinação de evento, tipo de mensagem e
destinatário, mesmo que o mesmo evento seja processado mais de uma vez (nova tentativa,
reprocessamento manual ou processamento concorrente).

#### Scenario: Evento reprocessado
- **WHEN** um evento cujo e-mail já foi enviado é processado de novo
- **THEN** nenhum segundo e-mail é enviado e o evento termina como `done`

#### Scenario: Falha parcial em vários destinatários
- **WHEN** um evento gera e-mail para dois destinatários e só o segundo falha
- **THEN** na nova tentativa apenas o segundo e-mail é enviado

### Requirement: Registro e consulta dos envios
Cada envio SHALL ser registrado com o órgão, o destinatário, o tipo de mensagem, a situação
(`enviado`, `falhou` ou `ignorado`), o número de tentativas, o erro quando houver e a data. Um
envio SHALL ficar `ignorado` quando o destinatário não tiver e-mail. O Administrador do órgão
SHALL poder listar os envios do próprio órgão, filtrar por situação e reenviar os que
falharam. Ninguém SHALL enxergar envios de outro órgão.

#### Scenario: Destinatário sem e-mail
- **WHEN** um evento de inscrição refere-se a um participante sem e-mail
- **THEN** o envio é registrado como `ignorado` e o evento termina como `done`

#### Scenario: Reenvio de falha
- **WHEN** o Administrador reenvia um envio `falhou` depois de corrigir a configuração
- **THEN** o e-mail é enviado, o envio passa a `enviado` e o reenvio fica registrado na auditoria

#### Scenario: Envios de outro órgão
- **WHEN** o Administrador do órgão A consulta os envios
- **THEN** vê apenas os envios do órgão A

### Requirement: Identidade visual do órgão nas mensagens
As mensagens SHALL usar o nome de exibição, o logotipo e a cor principal configurados para o
órgão do destinatário e SHALL respeitar a opção de ocultar a assinatura do provedor. Mensagens
sem órgão associado (como a recuperação de senha de um usuário da plataforma) SHALL usar a
identidade padrão do sistema. Os links das mensagens SHALL apontar para o endereço público
configurado do portal.

#### Scenario: Mensagem com a identidade do órgão
- **WHEN** o e-mail de confirmação de inscrição é enviado a um participante de um órgão com logotipo e cor próprios
- **THEN** a mensagem exibe o nome, o logotipo e a cor desse órgão

#### Scenario: Mensagem sem órgão
- **WHEN** o e-mail de recuperação de senha é enviado a um usuário sem órgão principal
- **THEN** a mensagem usa a identidade padrão do sistema

### Requirement: Recuperação de senha entregue por e-mail
O evento de solicitação de redefinição de senha SHALL gerar um e-mail com um link de redefinição
válido pelo tempo já definido para o token (60 minutos). Depois do envio, o token em claro SHALL
ser removido do registro do evento. A resposta pública da solicitação SHALL continuar igual para
e-mails cadastrados e não cadastrados.

#### Scenario: Link de redefinição recebido
- **WHEN** um usuário solicita a redefinição de senha com um e-mail cadastrado
- **THEN** recebe um e-mail com o link e, depois do envio, o registro do evento não contém mais o token em claro

#### Scenario: E-mail não cadastrado
- **WHEN** alguém solicita a redefinição com um e-mail que não existe
- **THEN** a resposta é a mesma de um e-mail existente e nenhum e-mail é enviado

### Requirement: Mensagens sem dados além do necessário
As mensagens SHALL conter apenas os dados necessários ao seu propósito: nunca a senha, nunca
respostas de avaliação ou notas de outras pessoas, e tokens apenas dentro do link de ação. Links
de ação SHALL expirar e SHALL ser de uso único.

#### Scenario: Link de verificação usado duas vezes
- **WHEN** o link de verificação de e-mail é aberto uma segunda vez
- **THEN** o sistema informa que o link já foi utilizado e não altera a conta
