# Proposal

## Why

Depois das Fases 1 e 2, o módulo Cursos atende só servidores que já têm login: quem não é do
órgão não consegue se inscrever, o órgão não tem uma página para divulgar a oferta, e o
formulário de inscrição é fixo (nome e e-mail). Além disso, o sistema **não envia nenhum
e-mail hoje**. O `outbox:process` dispara um evento sem ouvinte e não está agendado, e não existe
nenhum `Mailable`. Os eventos `cursos.InscricaoCriada`, `cursos.InscricaoPromovida` e
`cursos.CertificadoEmitido` são gravados no Outbox desde a Fase 1 e ficam parados em `pending`,
esperando o consumidor que a Fase 3 sempre previu. O mesmo vale para a recuperação de senha:
`PasswordResetRequested` é publicado, mas o link nunca chega a ninguém.

Esta mudança é a **Fase 3 — abertura ao público e notificações**: participante externo com
conta, página pública de inscrição, formulário de inscrição configurável e o consumidor do
Outbox que envia os e-mails.

## What Changes

- **Consumidor do Outbox e envio de e-mail** (nova capacidade de plataforma): um ouvinte do
  evento do Outbox envia e-mails transacionais com idempotência por evento, registro de cada
  envio e nova tentativa pelo mecanismo de retry que o Outbox já tem. O `outbox:process` passa a
  rodar agendado (um processo `scheduler` no Docker). As mensagens seguem a identidade visual
  do órgão (título, logotipo e cor do portal).
- **Recuperação de senha entregue**: o consumidor passa a enviar o e-mail do evento
  `PasswordResetRequested` e apaga o token em claro do `payload` depois do envio.
- **Participante externo com conta**: qualquer pessoa pode se cadastrar na página pública do
  órgão com nome, e-mail, senha e aceite do termo de privacidade. O cadastro cria um usuário com
  um perfil restrito ao módulo Cursos, que fica **inativo até a verificação do e-mail**. Depois
  disso, entra pelo login normal (com recuperação de senha) e usa a área do participante.
- **Página pública de inscrição**: o órgão habilita e personaliza uma página em
  `/inscricao/{órgão}`, com o catálogo das turmas abertas ao público externo, uma página por
  curso (texto, capa, turmas e vagas) e a identidade visual do órgão. Cada turma indica se
  aceita participantes externos.
- **Formulário de inscrição configurável**: o Administrador define, por curso, campos
  adicionais (texto, texto longo, número, data, seleção e caixa de marcação), obrigatórios ou
  não. As respostas ficam gravadas na inscrição, valem para servidores e externos, e saem na
  exportação do CSV.
- **Proteção contra cadastro automático**: limite de requisições por IP e por e-mail, campo
  isca e confirmação do e-mail antes de ativar a conta. As respostas do cadastro não revelam se
  um e-mail já existe.
- **E-mails do módulo**: verificação de e-mail, inscrição recebida, confirmada ou em lista de
  espera, aprovada, recusada, cancelada, promovida da lista de espera e certificado emitido (com
  o código de validação).
- **Envios consultáveis**: o Administrador vê os e-mails enviados e os que falharam e pode
  reenviar os que falharam.
- **Frontend (`apps/web-client`)**: páginas públicas (catálogo, curso, cadastro, verificação de
  e-mail, "esqueci minha senha" e redefinição), campos do formulário no curso, formulário de
  inscrição com os campos configurados, configuração da página pública e lista de envios.
- **Ambiente de desenvolvimento**: um Mailpit no `Docker-compose.yml` recebe os e-mails para
  conferência, e o `.env.example` documenta as variáveis de e-mail.

Fora desta mudança:
- **Relatórios do módulo** (turma, curso, capacitação por servidor). São independentes do
  restante e viram uma mudança própria, `add-cursos-relatorios`, para manter esta revisável.
- CAPTCHA de terceiros, pagamentos, login gov.br para externos e MFA obrigatório para externos.
- Envio de e-mail dos convites de usuário do módulo Admin. Só a recuperação de senha entra aqui.
- Exclusão ou anonimização de dados pessoais a pedido do titular (LGPD). Está nas perguntas
  abertas do design.

## Capabilities

### New Capabilities

- `notificacoes-email`: consumo do Outbox, envio de e-mail transacional com idempotência,
  registro e reenvio de falhas, e as regras de mensagens de sistema (recuperação de senha).

### Modified Capabilities

- `cursos`: participante externo com conta, página pública de inscrição, formulário de
  inscrição configurável e e-mails do módulo. Muda o requisito de inscrição (regra para
  externos e respostas do formulário) e o de exportação da lista de inscritos (respostas).

## Impact

- **Backend**: novas migrations `cursos_campos_inscricao`, `cursos_inscricao_respostas`,
  `notificacoes_envios` e `email_verification_tokens`, colunas `origem` e `consentimento_em` em
  `cursos_participantes`, `aceita_externos` em `cursos_turmas` e `slug` e `texto_publico` em
  `cursos_cursos`. Novo papel `participante_externo_cursos` no `CursosRbacSeeder`. Novo
  middleware de tenant para rotas públicas, novos serviços e controllers em
  `Modules/Cursos/Http/Controllers/Publico`, e o ouvinte do Outbox em `app/`. Muda o
  `CatalogoController` (filtro para externos) e o `InscricaoService` (regra e respostas).
- **Segurança**: é a primeira rota pública do sistema que grava dados (as atuais só leem). O
  teste de arquitetura do módulo precisa ser ampliado. A superfície de ataque, o isolamento
  entre órgãos e o vazamento de e-mails são tratados no design.
- **Infraestrutura**: novo processo `scheduler` e serviço `mailpit` no Docker; em produção é
  preciso configurar o SMTP, o remetente e SPF/DKIM do domínio (fora do código).
- **Código compartilhado e donos**: o consumidor fica em `app/` e a página de redefinição de
  senha no frontend; ambos cruzam áreas do `CODEOWNERS` e pedem revisão dos times de núcleo.
- **Dependências novas**: nenhuma no código; o Mailpit é só de desenvolvimento.
- **Depende de**: PR #39 (Fase 2) mergeado e a change `add-cursos-materiais-avaliacoes`
  arquivada, porque esta mudança altera requisitos que a Fase 2 também toca.
