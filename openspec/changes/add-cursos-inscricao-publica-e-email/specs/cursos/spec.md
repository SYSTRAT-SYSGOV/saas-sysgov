# Spec Delta

## ADDED Requirements

### Requirement: Participante externo com conta
Uma pessoa que não é servidor do órgão SHALL poder ter uma conta de participante externo: um
usuário com e-mail e senha, vinculado ao órgão, com um perfil restrito ao módulo Cursos e
marcado como origem `externo` no cadastro de participantes. O externo SHALL entrar pelo login
normal e SHALL poder recuperar a senha pelo fluxo padrão. O externo SHALL NOT ter acesso a nenhum
outro módulo, SHALL NOT aparecer como candidato a instrutor e SHALL NOT ver participantes ou
inscrições de outras pessoas.

#### Scenario: Externo entra e vê só o próprio conteúdo
- **WHEN** um participante externo com conta ativa faz login
- **THEN** vê o catálogo das turmas abertas a externos, as próprias inscrições e os próprios certificados

#### Scenario: Externo não acessa outros módulos
- **WHEN** um participante externo tenta abrir uma rota de outro módulo, como licitações ou estrutura organizacional
- **THEN** o sistema nega o acesso

#### Scenario: Externo não é oferecido como instrutor
- **WHEN** o Administrador busca usuários para designar como instrutor de uma turma
- **THEN** os participantes externos não aparecem no resultado

### Requirement: Cadastro público do participante externo
A página pública do órgão SHALL permitir o cadastro do participante externo com nome, e-mail,
senha (com a política de senha já vigente) e aceite do termo de privacidade, e opcionalmente o
documento (CPF, validado quando informado). O cadastro SHALL criar a conta **inativa** e SHALL
enviar um e-mail de verificação com link de uso único válido por 24 horas. A conta SHALL ser
ativada somente quando o link for aberto. A resposta ao cadastro SHALL ser sempre a mesma, sem
revelar se o e-mail já existe. Quando o e-mail já tiver conta em outro órgão, o e-mail enviado
traz o link de verificação para vincular a conta existente a este órgão, a senha informada no
cadastro é descartada e a pessoa entra com a senha que já tinha. Quando o e-mail já tiver conta
neste órgão, nada muda e o e-mail enviado orienta a recuperar a senha. O cadastro SHALL ser
recusado sem o aceite do termo.

#### Scenario: Cadastro e ativação
- **WHEN** uma pessoa preenche o cadastro com dados válidos e depois abre o link recebido por e-mail
- **THEN** a conta é criada inativa no cadastro e passa a ativa ao abrir o link, e a pessoa consegue entrar

#### Scenario: Login antes da verificação
- **WHEN** a pessoa tenta entrar antes de abrir o link de verificação
- **THEN** o login é recusado com a orientação de verificar o e-mail

#### Scenario: E-mail já cadastrado
- **WHEN** alguém se cadastra com um e-mail que já tem conta no órgão
- **THEN** a resposta é idêntica à de um cadastro novo, nenhuma segunda conta é criada e o titular recebe um e-mail orientando a recuperar a senha

#### Scenario: E-mail que já tem conta em outro órgão
- **WHEN** alguém se cadastra no órgão B com um e-mail que já tem conta no órgão A e abre o link recebido
- **THEN** a conta existente passa a ter acesso de participante externo ao órgão B, a senha informada no cadastro não é usada e a pessoa entra com a senha que já tinha

#### Scenario: Link de verificação vencido
- **WHEN** a pessoa abre o link de verificação depois de 24 horas
- **THEN** o sistema informa que o link expirou e oferece pedir um novo

#### Scenario: Cadastro sem aceite do termo
- **WHEN** a pessoa envia o cadastro sem marcar o aceite do termo de privacidade
- **THEN** o sistema recusa o cadastro

### Requirement: Proteção do cadastro público contra abuso
O cadastro público SHALL limitar as requisições por endereço IP e por e-mail, SHALL recusar
silenciosamente envios em que o campo isca esteja preenchido e SHALL NOT ocupar vaga nem
liberar acesso antes da verificação do e-mail. Excedido o limite, o sistema SHALL responder com
`429` e o tempo de espera.

#### Scenario: Excesso de cadastros do mesmo IP
- **WHEN** o mesmo endereço IP faz cadastros além do limite por hora
- **THEN** o sistema responde `429` e não cria novas contas

#### Scenario: Campo isca preenchido
- **WHEN** um cadastro chega com o campo isca preenchido
- **THEN** o sistema responde como se tivesse aceitado, mas não cria conta nem envia e-mail

### Requirement: Consentimento de privacidade
O órgão SHALL poder configurar o texto do termo de privacidade e sua versão. O cadastro SHALL
registrar o aceite com a data e a versão do termo. Alterar o texto SHALL gerar uma nova versão,
e as contas já cadastradas SHALL manter registrada a versão que aceitaram.

#### Scenario: Aceite registrado
- **WHEN** um participante externo conclui o cadastro
- **THEN** ficam gravados a data do aceite e a versão do termo vigente

### Requirement: Habilitação e personalização da página pública
O Administrador SHALL poder habilitar ou desabilitar a página pública do órgão e configurar o
texto de boas-vindas, o termo de privacidade e se o documento é obrigatório no cadastro. A página
SHALL usar a identidade visual do órgão e SHALL expor apenas: nome de exibição, logotipo, cor,
texto de boas-vindas, termo de privacidade e a oferta pública. Um órgão inexistente, inativo ou
com a página desabilitada SHALL receber a mesma resposta `404`, sem revelar qual é o caso.

#### Scenario: Página habilitada
- **WHEN** alguém abre a página pública de um órgão que a habilitou
- **THEN** vê a identidade do órgão, o texto de boas-vindas e o catálogo das turmas abertas a externos

#### Scenario: Página desabilitada ou órgão inexistente
- **WHEN** alguém abre a página pública de um órgão que a desabilitou, ou de um endereço que não existe
- **THEN** recebe a mesma resposta `404`

#### Scenario: Isolamento entre órgãos
- **WHEN** alguém abre a página pública do órgão A
- **THEN** não vê cursos, turmas nem dados do órgão B

### Requirement: Turmas abertas ao público externo
Cada turma SHALL indicar se aceita participantes externos (padrão: não). A oferta pública SHALL
listar somente turmas com essa marca, de cursos `publicado`, com status `aberta`, dentro do
período de inscrição. Um participante externo SHALL só poder se inscrever em turmas com essa
marca. Cada curso SHALL ter um endereço curto (`slug`) único no órgão e um texto de divulgação
sanitizado, exibidos na página pública do curso junto com a capa, as turmas e as vagas restantes.

#### Scenario: Turma fechada a externos
- **WHEN** um participante externo tenta se inscrever numa turma que não aceita externos
- **THEN** o sistema recusa a inscrição

#### Scenario: Oferta pública
- **WHEN** existem turmas abertas, algumas com e outras sem a marca de externos
- **THEN** a página pública lista apenas as que aceitam externos

#### Scenario: Texto de divulgação com script
- **WHEN** o Administrador salva um texto de divulgação com `<script>`
- **THEN** o script é removido antes de gravar e nunca é entregue à página pública

### Requirement: Formulário de inscrição configurável
O Administrador SHALL poder definir, por curso, campos adicionais de inscrição com rótulo,
tipo (`texto`, `texto_longo`, `numero`, `data`, `selecao` e `caixa_marcacao`), obrigatoriedade,
opções (para `selecao`) e ordem. Um campo SHALL poder ser desativado, mas SHALL NOT ser
excluído depois de ter respostas. O curso do tipo `evento` SHALL aceitar campos como os demais.
Os campos SHALL valer para toda inscrição do curso, de servidor ou de externo.

#### Scenario: Campo obrigatório
- **WHEN** um participante se inscreve sem responder um campo obrigatório
- **THEN** o sistema recusa a inscrição informando o campo

#### Scenario: Seleção com opção inexistente
- **WHEN** a inscrição traz para um campo de seleção um valor que não está entre as opções
- **THEN** o sistema recusa a inscrição

#### Scenario: Exclusão de campo respondido
- **WHEN** o Administrador tenta excluir um campo que já tem respostas
- **THEN** o sistema recusa a exclusão e orienta a desativar o campo

### Requirement: Respostas do formulário de inscrição
As respostas SHALL ficar gravadas na inscrição com o rótulo e o tipo do campo no momento da
resposta, de modo que alterar o campo depois não mude o que foi respondido. Respostas de texto
SHALL ser gravadas como texto puro. Somente o próprio participante, o Administrador e os
instrutores da turma SHALL poder ver as respostas de uma inscrição, e elas SHALL ficar
imutáveis depois do encerramento da turma.

#### Scenario: Campo editado depois da resposta
- **WHEN** o Administrador muda o rótulo de um campo que já foi respondido
- **THEN** as inscrições existentes continuam exibindo o rótulo original

#### Scenario: Participante vê a resposta de outra pessoa
- **WHEN** um participante tenta consultar as respostas da inscrição de outra pessoa
- **THEN** o sistema recusa com `404`

### Requirement: E-mails do módulo Cursos
O sistema SHALL enviar e-mail ao participante quando: o cadastro externo for criado
(verificação), a inscrição for recebida (`confirmada`, `pendente` ou `lista_espera`, cada uma com
o texto próprio), aprovada, recusada, cancelada ou promovida da lista de espera, e quando o
certificado for emitido. O e-mail do certificado SHALL trazer o código e o link de validação
pública. O e-mail de recusa e o de cancelamento SHALL trazer o motivo informado.

#### Scenario: Inscrição em lista de espera
- **WHEN** um participante se inscreve numa turma lotada
- **THEN** recebe um e-mail informando que está na lista de espera e a posição

#### Scenario: Promoção da lista de espera
- **WHEN** uma vaga é liberada e o participante é promovido
- **THEN** recebe um e-mail avisando que a inscrição foi confirmada, ou que aguarda aprovação quando a turma exige

#### Scenario: Certificado emitido
- **WHEN** a turma é encerrada e o participante conclui o curso
- **THEN** recebe um e-mail com o código do certificado e o link para validá-lo

## MODIFIED Requirements

### Requirement: Inscrição do participante em turma
Um participante SHALL poder se inscrever numa turma de curso `publicado`, com status `aberta`,
dentro do período de inscrição. Um participante externo SHALL poder se inscrever somente em
turmas que aceitam externos. Cada participante SHALL ter no máximo uma inscrição ativa
(`pendente`, `confirmada` ou `lista_espera`) por turma. Havendo vaga, a inscrição SHALL nascer
`confirmada`, ou `pendente` quando a turma exige aprovação manual; o Administrador SHALL poder
aprovar (`pendente → confirmada`) ou recusar (`pendente → cancelada`). O Administrador SHALL
poder inscrever participantes diretamente. Os campos adicionais do formulário de inscrição do
curso SHALL ser respondidos na inscrição, e os obrigatórios SHALL ser exigidos. A ocupação de
vagas SHALL considerar inscrições `confirmada` e `pendente` e SHALL ser consistente sob
inscrições simultâneas: o número de inscrições que ocupam vaga nunca excede o número de vagas.

#### Scenario: Inscrição com vaga e sem aprovação manual
- **WHEN** um participante se inscreve numa turma com vaga que não exige aprovação
- **THEN** a inscrição é criada com status `confirmada`

#### Scenario: Inscrição duplicada
- **WHEN** um participante com inscrição `confirmada` tenta se inscrever de novo na mesma turma
- **THEN** o sistema recusa a nova inscrição

#### Scenario: Inscrições simultâneas pela última vaga
- **WHEN** dois participantes se inscrevem ao mesmo tempo numa turma com uma única vaga restante
- **THEN** exatamente um fica com a vaga e o outro entra na lista de espera

#### Scenario: Inscrição fora do período
- **WHEN** um participante tenta se inscrever depois do fim do período de inscrição
- **THEN** o sistema recusa a inscrição

#### Scenario: Externo em turma fechada a externos
- **WHEN** um participante externo tenta se inscrever numa turma que não aceita externos
- **THEN** o sistema recusa a inscrição

#### Scenario: Inscrição com formulário configurado
- **WHEN** um participante se inscreve num curso com um campo obrigatório e responde todos os campos
- **THEN** a inscrição é criada e as respostas ficam gravadas nela

### Requirement: Exportação da lista de inscritos
O Administrador e os instrutores da turma SHALL poder exportar a lista de inscritos de uma
turma em CSV (UTF-8), com nome, e-mail, origem (`servidor` ou `externo`), status da inscrição,
data da inscrição, frequência apurada até o momento e uma coluna para cada campo do formulário
de inscrição do curso. A exportação SHALL neutralizar células que comecem com `=`, `+`, `-` ou
`@` para evitar injeção de fórmulas em planilhas e SHALL ser registrada na auditoria.

#### Scenario: Exportação da turma
- **WHEN** o Administrador exporta os inscritos de uma turma
- **THEN** recebe um CSV com uma linha por inscrição da turma e a exportação fica registrada na auditoria

#### Scenario: Resposta que começa com fórmula
- **WHEN** um participante respondeu a um campo de texto com `=HYPERLINK("http://x")`
- **THEN** o CSV grava a célula neutralizada, sem ser interpretada como fórmula
