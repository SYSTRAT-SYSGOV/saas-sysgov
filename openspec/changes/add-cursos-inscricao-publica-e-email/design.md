# Design

## Context

Ver `proposal.md` (Why) e as specs `notificacoes-email` e `cursos`. Estado atual, verificado no
código depois das Fases 1 e 2:

- **Outbox**: `OutboxPublisher::publish` grava em `outbox_events`; o comando `outbox:process`
  reserva eventos `pending` com `lockForUpdate`, dispara o evento Laravel `OutboxMessage` e, se
  não houver exceção, marca `done`; em exceção reagenda com espera de 5 a 60 min e marca `failed`
  na quinta tentativa. **Não existe nenhum ouvinte** de `OutboxMessage`, nenhum `Mailable` e
  nenhuma `Notification` no código. O `routes/console.php` já agenda outros comandos
  (`ExpireAccess`, `NotifyExpiringAccess`), mas não o `outbox:process`, e o Docker não tem
  processo de agendamento.
- **Senha**: `UserService::requestPasswordReset` publica `PasswordResetRequested` com o **token
  em claro** no `payload`. O frontend do cliente não tem tela de "esqueci minha senha" nem de
  redefinição (só há `AccessApi.ts` do painel de acessos).
- **Rotas públicas do Cursos**: só a validação de certificado, em `api/public/cursos`, **sem
  `TenantContext`**. O `Routes/publico.php` e o teste de arquitetura obrigam os controllers
  públicos a depender só do `ValidacaoCertificadoService`, porque sem tenant o `TenantAware` não
  filtra nada.
- **Contas**: `users.email` é único no sistema todo (não por órgão), o vínculo com o órgão está
  em `tenant_user` (`status`, `role_id`, `primary_org_unit_id`) e o login só aceita órgãos em que
  `tenant_user.status = 'active'`. `tenants.slug` é único. Não existe autocadastro.
- **Participante**: `cursos_participantes.user_id` é nulo-permitido desde a Fase 1 (D2), reservado
  a esta fase; há `unique(tenant_id, user_id)`.
- **Identidade visual**: `Tenant.settings` guarda `customPrimaryColor`, `customLogoUrl`,
  título do portal e `hideProviderSignature`; `settings.documentInfo` é usado por outro
  controller, então esta mudança usa um sub-objeto próprio, `settings.cursos`.
- **CSV de inscritos**: a exportação atual usa `fputcsv` sem neutralizar células que começam com
  `=`, `+`, `-` ou `@`. Com participantes externos, nome e e-mail passam a ser texto livre de
  desconhecidos.
- **Configuração**: só existe `APP_URL` (a API). Não há endereço público do portal para montar
  links de e-mail.

## Goals / Non-Goals

**Goals:**
- Nenhum e-mail duplicado e nenhuma perda de e-mail: envio idempotente, com reprocessamento
  seguro pelo mecanismo de retry que já existe.
- A primeira rota pública que **grava** não abrir brecha entre órgãos: o tenant vem sempre do
  endereço, é validado no servidor e nunca do corpo da requisição.
- Conta externa sem privilégio algum fora do módulo Cursos, provado por teste.
- Nenhum token de ação (verificação, redefinição) guardado em claro depois do uso.

**Non-Goals:**
- CAPTCHA de terceiros, login gov.br e MFA obrigatório para externos.
- Fila de e-mail própria, templates editáveis pelo órgão e preferências de notificação.
- Relatórios (mudança `add-cursos-relatorios`).
- Anonimização de dados pessoais a pedido do titular (pergunta aberta).

## Decisions

### D1. Consumidor: um ouvinte de `OutboxMessage` com registro de tratadores
Um ouvinte único (`app/Listeners`) recebe `OutboxMessage`, procura no mapa
`config/notificacoes.php` os tratadores do `event_type` e ignora tipos sem tratador (o evento
termina `done`, como hoje). Cada tratador devolve as mensagens a enviar (destinatário, tipo,
`Mailable`). Os tratadores do Cursos ficam no módulo (`Modules/Cursos/Notificacoes`) e são
registrados pelo `CursosServiceProvider`, para o núcleo não depender do módulo.
- **Tenant**: o ouvinte roda fora de requisição, então define o `TenantContext` a partir de
  `outbox_events.tenant_id` antes de chamar o tratador e o limpa no `finally`. Evento sem
  tenant (recuperação de senha de usuário da plataforma) roda sem contexto e usa a identidade
  padrão.
- *Alternativa descartada*: `Notification`/fila do Laravel por cima do Outbox. Duplicaria o retry
  e o registro que o Outbox já dá.

### D2. Idempotência e registro na mesma tabela
`notificacoes_envios` (`tenant_id` nulo-permitido, `event_id`, `tipo`, `destinatario`, `situacao`,
`tentativas`, `erro`, `enviado_em`) com único `(event_id, tipo, destinatario)`. O ouvinte
reserva a linha (`insert ... on duplicate`) **antes** de enviar e só envia se a situação não for
`enviado`. Assim uma nova tentativa do evento reenvia apenas o que falhou (cenário "falha parcial
em vários destinatários"). Envio bem-sucedido grava `enviado`; exceção grava `falhou` com o erro
e é relançada para o Outbox reagendar. Destinatário sem e-mail grava `ignorado`.
- Reenvio manual pelo Administrador chama o mesmo caminho para a linha `falhou`.

### D3. Agendamento do processamento
`Schedule::command('outbox:process --limit=100')->everyMinute()->withoutOverlapping()` em
`routes/console.php`. No Docker entra o serviço `scheduler` (`php artisan schedule:work`). O
`lockForUpdate` do comando já protege contra dois processadores simultâneos, então
`withoutOverlapping` é só economia. A latência esperada é de até um minuto, aceitável para
e-mail transacional.

### D4. Mensagens com a identidade do órgão
`Mailable`s em Markdown com um layout base que recebe `Identidade` (título, cor, logotipo,
`hideProviderSignature`), montada por um resolvedor a partir de `Tenant.settings`. Os links usam
uma variável nova, `PORTAL_URL` (endereço público do web-client), e nunca `APP_URL`. Conteúdo só
com o necessário (spec): sem senha, sem notas, token só dentro do link.

### D5. Tokens de ação
- **Verificação de e-mail**: tabela de plataforma `email_verification_tokens` (`user_id`,
  `tenant_id`, `token_hash` sha-256, `expires_at` 24 h, `used_at`). O evento
  `cursos.CadastroExternoCriado` leva só `user_id`; o **tratador gera o token na hora do envio**,
  o que evita ter o token em claro no `payload` e, junto com a idempotência (D2), não gera um
  segundo token em nova tentativa depois de enviado. Uso único: `used_at` é gravado na
  verificação, na mesma transação que ativa o vínculo.
- **Redefinição de senha (já existente)**: o token continua vindo no `payload` (contrato atual
  do `UserService`, que esta mudança não altera). Depois do envio com sucesso, o ouvinte
  substitui `payload.token` por um marcador e mantém o resto do registro. Se a substituição
  falhar depois do envio, a idempotência (D2) impede o segundo e-mail na nova tentativa, e a
  substituição roda de novo.
- *Alternativa descartada*: mudar o `UserService` para não publicar o token. É o desenho melhor,
  mas o `UserService` é código de núcleo com dono próprio no `CODEOWNERS`; fica como melhoria
  separada.

### D6. Conta externa: vínculo pendente até o clique no e-mail
O cadastro cria, na mesma transação: o `User` (senha com a política vigente, `is_active = true`),
o vínculo `tenant_user` com o papel `participante_externo_cursos`, `status = 'pending'` e
`primary_org_unit_id` nulo, e o `Participante` (`origem = 'externo'`, `consentimento_em`,
`termo_versao`). A verificação do e-mail passa o vínculo para `active`. Como o login só aceita
vínculo `active` (comportamento atual), **nenhuma checagem nova de acesso é necessária**, só a
mensagem: o login sem vínculo ativo, mas com vínculo `pending`, responde "verifique seu e-mail".
- **E-mail que já existe**: `users.email` é único no sistema, então o cadastro sempre responde
  igual (spec) e decide pelo caso:
  - conta sem vínculo com este órgão → cria o vínculo `pending` e o `Participante`, e o e-mail
    traz o link de verificação; abrir o link prova o controle da caixa de e-mail e ativa o
    vínculo. A **senha informada no cadastro é descartada** nesse caso: a pessoa entra com a
    senha que já tinha.
  - conta já vinculada a este órgão → nenhuma alteração; o e-mail orienta recuperar a senha.
- **Papel**: `participante_externo_cursos` com só `cursos.view` e `cursos.participar`, criado no
  `CursosRbacSeeder`. O acesso a outros módulos vem das permissões do papel, então é negado por
  padrão; um teste percorre uma rota de cada módulo com um externo e espera `403`.
- **Sem unidade organizacional**: verificar (tarefa 2.5) que a ausência de
  `primary_org_unit_id` nunca é lida como "acesso irrestrito a todas as unidades" em nenhum
  ponto do ABAC. Se for, o teste falha e o papel fica bloqueado até a correção.
- **Limpeza**: comando agendado diário remove vínculos `pending` com mais de 7 dias e os
  usuários que só existiam por eles, para não acumular contas nunca verificadas.
- *Alternativa descartada*: `users.is_active = false` até verificar. Serviria só para contas
  novas e não para o caso de conta existente em outro órgão.

### D7. Rotas públicas com o tenant vindo do endereço
Novo grupo `api/public/cursos/{orgao}/...` com o middleware `ResolvePublicTenant`, que busca o
`Tenant` por `slug`, exige `status = active` e `settings.cursos.publico_habilitado = true`, e só
então define o `TenantContext`; qualquer falha responde o mesmo `404` (spec). O `bindings` vem
depois do middleware, como no grupo autenticado. O contexto é limpo ao fim da requisição.
- **Teste de arquitetura ampliado**: (a) os controllers em `Publico/` só podem depender de
  classes em `Modules\Cursos\Services\Publico`; (b) toda rota pública com `{orgao}` precisa do
  middleware; (c) a regra antiga continua valendo para a rota sem `{orgao}` (validação de
  certificado, que segue sem contexto).
- **Saída por lista explícita de campos** (Resources próprios da página pública), como o D6 da
  Fase 2: nunca `toArray()` de model. Vagas restantes em vez de vagas totais; sem e-mail de
  instrutor.
- *Alternativa descartada*: subdomínio por órgão. Exige DNS, certificado e mudança de infra;
  fica como pergunta aberta.

### D8. Limites e isca no cadastro
Limitadores nomeados: `cursos-cadastro-ip` (5 por hora por IP) e `cursos-cadastro-email` (3 por
hora pelo hash do e-mail normalizado, aplicado no serviço porque o e-mail vem no corpo). O
campo isca é um campo de formulário oculto por CSS (`website`); preenchido, a resposta é a de
sucesso, sem conta e sem e-mail. Os leitores da página pública usam o limitador `cursos-publico`
que já existe. O limite por e-mail é o que impede o uso do cadastro para encher a caixa de
outra pessoa.

### D9. Formulário de inscrição configurável
- `cursos_campos_inscricao` (`tenant_id`, `curso_id`, `rotulo`, `tipo`, `obrigatorio`, `opcoes`
  JSON, `ordem`, `ativo`) e `cursos_inscricao_respostas` (`tenant_id`, `inscricao_id`,
  `campo_id`, `rotulo`, `tipo`, `valor`), único `(inscricao_id, campo_id)`. O rótulo e o tipo
  são copiados na resposta (snapshot), como as questões das tentativas na Fase 2, para que
  editar o campo não reescreva o histórico.
- Campo com resposta não é excluído, só desativado (`restrict` na chave). Campo desativado não é
  pedido em inscrições novas.
- Validação por tipo no servidor: `numero` numérico, `data` no formato ISO, `selecao` dentro de
  `opcoes`, `caixa_marcacao` `sim`/`nao`; textos como texto puro (sem HTML), com limite de tamanho.
- A inscrição e as respostas são gravadas na **mesma transação** do `InscricaoService`, antes de
  publicar o evento.
- Visibilidade: o `InscricaoPolicy` já limita ao próprio participante, Administrador e
  instrutores da turma; as respostas herdam a regra, e outro tenant vira `404`.

### D10. Consentimento
`settings.cursos.termo` guarda `texto` e `versao`. A versão é um inteiro incrementado quando o
texto muda (o serviço compara o texto novo com o gravado). O cadastro grava `consentimento_em` e
`termo_versao` no `Participante`. Não há reaceite obrigatório de versão nova nesta mudança.

### D11. Configuração da página pública e slug do curso
`GET/PUT /api/cursos/configuracao-publica` (`cursos.manage`) lê e grava só as chaves do
sub-objeto `settings.cursos` (habilitado, texto de boas-vindas, termo, documento obrigatório),
com auditoria. `cursos_cursos.slug` (único por tenant, gerado do título e editável) e
`texto_publico` (sanitizado com o `HtmlSanitizer` de `app/Support`, D5 da Fase 2).
`cursos_turmas.aceita_externos` (padrão falso). O `CatalogoController` autenticado passa a
filtrar por `aceita_externos` quando o participante é externo.

### D12. E-mails do Cursos
Tratadores por evento: `cursos.CadastroExternoCriado` (verificação), `cursos.InscricaoCriada`
(texto por status), `cursos.InscricaoAprovada`, `cursos.InscricaoRecusada`,
`cursos.InscricaoCancelada`, `cursos.InscricaoPromovida` e `cursos.CertificadoEmitido`. Os
eventos existentes só levam ids, então o tratador carrega os models com o `TenantContext` do D1.
Recusa e cancelamento precisam do motivo: verificar na tarefa 5.x se o `payload` atual o leva e,
se não, acrescentá-lo (mudança compatível, só chaves novas).

### D13. CSV com respostas e proteção de fórmula
As colunas do formulário entram no fim do CSV, na ordem dos campos. Toda célula de texto que
comece com `=`, `+`, `-`, `@`, tabulação ou retorno de carro recebe um apóstrofo à frente. Vale
para todas as colunas, inclusive nome e e-mail.

### D14. Frontend
Rotas públicas no web-client, fora do guarda de autenticação, como a validação de certificado já
é: `/inscricao/:orgao`, `/inscricao/:orgao/cursos/:slug`, `/inscricao/:orgao/cadastro`,
`/verificar-email`, `/esqueci-senha` e `/redefinir-senha`. A identidade visual vem da API da
página pública (nunca embutida no código), usando os componentes do `@sysgov/ui`. A tela de
login ganha os links de cadastro (quando o órgão tem página pública) e "esqueci minha senha". A
gestão ganha a aba de campos do formulário no curso, a configuração da página pública e a lista
de envios de e-mail. As alterações no roteador do `core/` pedem revisão do time de frontend
sênior (`CODEOWNERS`).

### D15. Ambiente de desenvolvimento
`Docker-compose.yml` ganha `mailpit` (SMTP na 1025, interface na 8025) e `scheduler`; o
`.env.example` documenta `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM_*` e `PORTAL_URL`.
Sem SMTP configurado, o padrão continua `log`, e o envio conta como concluído.

## Risks / Trade-offs

- **[Primeira rota pública que grava]** Um erro no middleware de tenant vaza ou grava dados entre
  órgãos → tenant só do endereço, `404` uniforme, teste de arquitetura, e testes A/B em cada
  rota pública (o cadastro do órgão A nunca cria vínculo no órgão B).
- **[Enumeração de contas e de órgãos]** → resposta idêntica no cadastro e na recuperação de
  senha, `404` uniforme para órgão inexistente ou desabilitado. Diferenças de tempo entre os
  casos não são eliminadas nesta mudança; o limite por IP as torna caras de explorar.
- **[Caixa de e-mail de terceiros usada como alvo]** → limite por e-mail, mensagem só uma vez por
  evento (D2) e a conta só ativa com o clique.
- **[Conta externa com mais poder que o pretendido]** Conta sem unidade organizacional lida como
  "irrestrita" → teste de acesso por módulo e verificação explícita do ABAC (D6).
- **[Token de redefinição em claro no Outbox]** Persiste até o envio → é apagado logo depois do
  envio; a correção definitiva (não publicar o token) fica como melhoria no `UserService`.
- **[Entrega de e-mail em produção]** Sem SPF/DKIM e remetente do domínio, as mensagens caem em
  spam → configuração de infraestrutura fora do código, listada nas perguntas abertas.
- **[Latência de até um minuto]** por causa do agendamento → aceitável para e-mail
  transacional; o Administrador vê o estado dos envios.
- **[Dados pessoais de externos]** CPF opcional, e-mail e respostas livres → texto puro, saída por
  lista de campos, CSV protegido e consentimento registrado; retenção e exclusão ficam em
  aberto.

## Migration Plan

Só tabelas novas e colunas nulas ou com padrão (`origem = 'servidor'`, `aceita_externos =
false`); nenhuma alteração destrutiva, e participantes atuais viram `origem = 'servidor'`.
Deploy: `migrate`, `cursos:rbac` (novo papel), subir o `scheduler` **antes** de anunciar a página
pública, configurar o SMTP e o `PORTAL_URL`, e só então habilitar a página em cada órgão. Ao
ligar o consumidor, os eventos que já estão `pending` (Fases 1 e 2 e recuperações de senha
antigas) seriam enviados de uma vez: a primeira execução em produção processa só eventos com
`available_at` posterior à data de ativação, e os anteriores são marcados `done` sem envio.
Rollback: desligar o `scheduler` interrompe os envios sem perder eventos.

## Open Questions

- **Provedor de e-mail**: qual SMTP ou serviço, qual domínio remetente e quem configura SPF e
  DKIM em produção. Sem impacto no código.
- **Endereço público**: `PORTAL_URL` com caminho (`/inscricao/{órgão}`, como está aqui) ou
  subdomínio por órgão.
- **LGPD**: prazo de retenção de contas externas e procedimento para exclusão a pedido do
  titular. Precisa de decisão do encarregado de dados do órgão.
- **CPF**: se é armazenado em claro ou mascarado, e se algum órgão vai exigi-lo (o padrão aqui é
  opcional).
- **Convites do Admin**: enviar por e-mail os convites de usuário, que hoje também não chegam.
  Cabe numa mudança pequena de plataforma logo depois desta.
- **Limites do plano**: se contas externas contam nas cotas de usuários de cada órgão.
