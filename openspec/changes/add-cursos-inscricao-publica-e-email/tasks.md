# Tasks

> Pré-requisito: PR #39 (Fase 2) mergeado e a change `add-cursos-materiais-avaliacoes`
> arquivada, com este branch criado a partir da `main` atualizada.
> Testes do backend rodam no container `api` com o ambiente do CI (`APP_ENV=testing`, SQLite em
> memória, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`) e
> `php -d memory_limit=-1`; chamados abaixo de "phpunit (Docker)". Frontend: `npm --workspace
> apps/web-client run typecheck` e `run test` num container `node:22`.

## 1. Plataforma de e-mail e Outbox

- [x] 1.1 Ambiente: serviços `mailpit` e `scheduler` no `Docker-compose.yml`, variáveis de e-mail e
      `PORTAL_URL` no `.env.example` e no `config`; verificar que o `scheduler` sobe e que um
      e-mail de teste chega ao Mailpit.
      `scheduler` reusa a imagem da `api` com `entrypoint: []` (pula o `docker-entrypoint.sh` —
      migrate/seed já rodam no serviço `api`; rodar de novo no scheduler seria redundante e
      correria com ele) e roda só `php artisan schedule:work`. `mailpit` na porta 1025 (SMTP) e
      8025 (UI). `PORTAL_URL` em `config/app.php` (`portal_url`), separado de `url` (APP_URL) —
      os e-mails nunca devem montar link com o endereço da API. Verificado com
      `Mail::raw(...)` via tinker: o e-mail chegou no Mailpit (`GET :8025/api/v1/messages`) com
      remetente/assunto corretos. Achado de ambiente: `docker run` anteriores tinham deixado
      `apps/api/storage/app/cursos` com dono `root` (`drwx------`), quebrando o build do
      Docker (context read); corrigido com `docker run -v ...:/data alpine chown -R $(id
      -u):$(id -g) /data/storage` — container descartável rodando como root só pra devolver a
      pasta pro usuário do host.
- [x] 1.2 Agendar `outbox:process --limit=100` a cada minuto com `withoutOverlapping` em
      `routes/console.php`; teste de que o agendamento existe.
- [x] 1.3 Migration e model de `notificacoes_envios` (único `(event_id, tipo, destinatario)`);
      verificar `migrate` no MySQL do Docker e o isolamento por órgão com teste A/B.
      `NotificacaoEnvio` não usa `TenantAware`, mesmo padrão de `OutboxEvent`: a trait lança
      `LogicException` ao criar um registro com `tenant_id` explicitamente nulo fora de um
      `TenantContext` (só permite quando o atributo já vem preenchido), o que quebraria o
      caso de evento de plataforma sem órgão (ex.: redefinição de senha de usuário sem
      vínculo). Migration verificada no MySQL do Docker (`up`/`rollback`/`up` de novo, escopada
      via `--path=` pra não bater na migration quebrada do Cemitérios).
- [x] 1.4 Ouvinte de `OutboxMessage` com o registro de tratadores (`config/notificacoes.php`):
      define e limpa o `TenantContext` por evento, ignora tipos sem tratador, reserva a linha de
      envio antes de enviar e grava `enviado`, `falhou` ou `ignorado` (D1, D2); testes dos
      cenários "E-mail enviado depois do evento", "Falha temporária", "Tentativas esgotadas",
      "Evento reprocessado", "Falha parcial em vários destinatários" e "Destinatário sem e-mail".
      `App\Listeners\EnviarNotificacoes` (descoberto automaticamente pelo Laravel — não precisou
      registrar em nenhum `EventServiceProvider`, o projeto não tem um). Contrato
      `App\Notificacoes\Tratador` e DTO `App\Notificacoes\Mensagem`; `config/notificacoes.php`
      começa vazio, os módulos acrescentam suas entradas no boot do próprio
      `ServiceProvider` (D1). Falha parcial: todas as mensagens de um tratador são tentadas
      antes de relançar a primeira exceção — quem já foi enviado não é reenviado na próxima
      tentativa do evento inteiro.
      Achado: o Cemitérios já tem dois listeners próprios de `OutboxMessage`
      (`Modules\Cemiterios\Listeners\EnviarEmail` e `SucessaoEventListener`), criados depois do
      design.md ter sido escrito (que dizia "não existe nenhum ouvinte") — são específicos a
      `event_type`s do Cemitérios, sem idempotência nem `TenantContext`, e coexistem sem
      conflito com este ouvinte genérico (Laravel despacha o evento pra todos os listeners
      registrados; o meu ignora qualquer `event_type` fora de `config('notificacoes.*')`).
      Achado de ambiente (importante pro resto desta change): `MAIL_MAILER=smtp` do
      `.env.docker` vence o `force="true"` do `phpunit.xml` pelo mesmo motivo do achado da
      2.4/3.1 de `add-cursos-relatorios` com `DB_CONNECTION` — só um `putenv()`, sem popular
      `$_ENV`/`$_SERVER`, e o Dotenv carrega o `.env` por cima. Testes que usam `Mail::to()`
      precisam de `-e MAIL_MAILER=array` explícito no `docker compose run`, não só do
      `phpunit.xml`. `array` (não `Mail::fake()`) porque `Mail::fake()` não chama `build()` do
      Mailable — os testes de falha simulam erro de envio com um Mailable cujo `build()` lança.
- [x] 1.5 Layout base de mensagens e resolvedor de identidade a partir de `Tenant.settings`
      (título, cor, logotipo, `hideProviderSignature`, identidade padrão sem órgão) (D4); testes
      dos cenários "Mensagem com a identidade do órgão" e "Mensagem sem órgão".
      `App\Notificacoes\Identidade` (DTO) + `ResolvedorIdentidade` (lê as mesmas chaves de
      `settings` que `Cemiterios\Http\Controllers\Portal\PublicoController::identidade()` já usa
      pro portal público de Cemitérios: `portalTitle`, `customPrimaryColor`, `customLogoUrl`,
      `hideProviderSignature`). Layout em `resources/views/components/email-layout.blade.php`
      (componente Blade anônimo `<x-email-layout>`) — HTML com tabelas e estilo inline (padrão
      de e-mail, a maioria dos clientes ignora CSS moderno), não o sistema de tema
      `<x-mail::message>` do Laravel (evita ter que publicar e customizar o tema padrão só pra
      trocar cor/logotipo, que o componente próprio já faz direto).
- [x] 1.6 Tratador de `PasswordResetRequested`: e-mail com o link, marcador no lugar do token em
      claro depois do envio, e nenhum e-mail para endereço inexistente (D5); testes dos
      cenários "Link de redefinição recebido" e "E-mail não cadastrado".
      Precisou de um gancho novo em `Mensagem` (`aposEnvio`, uma closure opcional que o ouvinte
      chama sempre que a linha fica `enviado` — recém-enviada ou já estava, pela idempotência):
      sem isso não havia como o tratador saber que já podia apagar o token em claro do Outbox só
      depois do envio dar certo (D5), e rodar a limpeza de novo se ela mesma falhar numa
      tentativa anterior. `PasswordResetRequested` nunca tem tenant (a rota de "esqueci minha
      senha" é pública, sem `TenantContext` — confirmado lendo `client-api.php`), então usa
      sempre a identidade padrão. "E-mail não cadastrado" já era coberto por
      `UserService::requestPasswordReset` (não publica nada se o e-mail não existe, resposta
      uniforme contra enumeração) — o teste só confirma que continua assim.
- [x] 1.7 Política do primeiro processamento: eventos com `available_at` anterior à ativação do
      consumidor são marcados `done` sem envio (Migration Plan); teste com eventos antigos.
      Migration de dados só (`down()` documentadamente irreversível — depois de marcar `done`
      não dá pra saber quais estavam `pending` antes, e desfazer reenviaria exatamente os
      e-mails atrasados que ela existe pra evitar). Roda uma vez no deploy desta mudança, antes
      do `scheduler` subir de verdade em produção.
- [x] 1.8 API de envios do órgão (`cursos.manage`): listar com filtro de situação e reenviar os
      `falhou`, com auditoria; testes dos cenários "Reenvio de falha" e "Envios de outro órgão".
      `EnvioController::index/reenviar`, gated por `viewAny` de `Curso` (mesmo nível de acesso de
      relatórios). Reenvio não chama nada externo na requisição (regra do `CODING_STANDARD` de só
      usar o Outbox pra chamada externa): só reseta `NotificacaoEnvio.situacao` e
      `OutboxEvent.status/available_at` pra `pendente`/`pending`, e o `scheduler` já agendado
      (tarefa 1.2) pega na próxima passada — a idempotência do ouvinte (tarefa 1.4) garante que
      irmãos já `enviado` do mesmo evento multi-destinatário não são reenviados. Como
      `NotificacaoEnvio` não é `TenantAware` (mesmo padrão de `OutboxEvent`, tenant_id
      nulo-permitido), o isolamento é explícito no controller — inclusive no reenvio, onde o model
      binding implícito do Laravel resolve por id sem filtrar tenant, então o 404 é verificado à
      mão antes de qualquer mutação.

## 2. Participante externo e cadastro público

- [x] 2.1 Migrations: `origem` e `consentimento_em`/`termo_versao` em `cursos_participantes`
      (participantes atuais viram `servidor`) e `email_verification_tokens`; verificar `migrate`
      no MySQL do Docker.
      `email_verification_tokens` é tabela de plataforma (`database/migrations`, não
      `TenantAware`), com `tenant_id` próprio — não é o `TenantContext` que decide qual vínculo
      `tenant_user` o clique ativa, porque uma pessoa pode ter cadastros pendentes em mais de um
      órgão ao mesmo tempo (design D5/D6), então o token carrega o tenant explicitamente. Rodei
      as duas migrations isoladas contra o MySQL do Docker (`migrate --path=...`), conferi as
      colunas resultantes com `Schema::getColumnListing` e fiz `migrate:rollback --step=2` pra
      não deixar o banco de dev com schema fora do fluxo normal de migration.
- [x] 2.2 Papel `participante_externo_cursos` (só `cursos.view` e `cursos.participar`) no
      `CursosRbacSeeder`, e exclusão de externos da busca de instrutores; testes dos cenários
      "Externo não é oferecido como instrutor" e "Externo entra e vê só o próprio conteúdo".
      Mesmo conjunto de permissões do `participante_cursos` — o isolamento do externo não vem de
      permissão própria, mas de não ter outros papéis nem `primary_org_unit_id` (verificado a
      fundo na tarefa 2.5). `UsuarioOrgaoController` (busca de instrutores e de participante para
      inscrição direta) já filtra por `role_user.tenant_id` explícito, então bastou um
      `whereDoesntHave` na mesma linha; "vê só o próprio conteúdo" não precisou de nada novo em
      `InscricaoPolicy`, que já decide por permissão (`cursos.participar`) e dono da inscrição,
      não por papel — o teste só confirma que o externo se encaixa no mesmo caminho.
- [x] 2.3 Middleware `ResolvePublicTenant` e grupo `api/public/cursos/{orgao}` (D7), com `404`
      uniforme para órgão inexistente, inativo ou sem página habilitada; ampliar o teste de
      arquitetura (controllers públicos só dependem de `Services/Publico`, e toda rota com
      `{orgao}` tem o middleware); testes dos cenários "Página desabilitada ou órgão
      inexistente" e "Isolamento entre órgãos".
      `OrgaoController`/`OrgaoPublicoService` (casca da página: nome + identidade, reaproveitando
      o `ResolvedorIdentidade` da D4) são o primeiro morador do grupo — só pra ter algo real pra
      exercitar o middleware; catálogo e cadastro entram na Seção 3/4. Movi
      `ValidacaoCertificadoService` pra `Services\Publico` também: a regra ampliada do teste de
      arquitetura vale pra todo controller de `Publico/`, não só os novos, e a rota de certificado
      continua de fora do grupo `{orgao}` de propósito (roda sem tenant nenhum).
      Dois achados de ambiente que não são desta tarefa mas apareceram testando-a: (1)
      `phpunit.xml` tinha `CACHE_STORE`/`SESSION_DRIVER`/`QUEUE_CONNECTION`/`APP_ENV` sem
      `force="true"` — o `.env.docker` real (`redis`, `redis`, `database`) vencia o Dotenv
      silenciosamente, então testes com limitador de requisição vazavam contagem entre execuções
      *separadas* do phpunit (mesmo bug já visto com `DB_CONNECTION`/`MAIL_MAILER`, agora
      corrigido do mesmo jeito). (2) mesmo com o cache correto, o limitador ainda vazava *dentro*
      da mesma execução porque `RateLimiter::clear($nome)` não alcança a chave com `->by($ip)` que
      o limitador nomeado de fato usa — resolvido centralizando `Cache::flush()` no `setUp()` da
      `Modules\Cursos\Tests\TestCase` (base do módulo), em vez de espalhar isso por teste. Sobrou
      um `ValidacaoPublicaTest::test_cenario_excesso_de_consultas` ainda flaky quando roda depois
      de `MaterialTest` na mesma suíte (não isolado): meio a mais de 396 testes do módulo, é o
      único que falha, mas em arquivo isolado passa limpo — não é causado por nada desta tarefa
      (o teste e o `travel()` já existiam antes), fica registrado pra tarefa 7.2 investigar com
      calma.
- [x] 2.4 `CadastroExternoService`: cria usuário, vínculo `pending` e participante numa
      transação, com os três caminhos do e-mail (novo, existente em outro órgão, existente neste
      órgão), resposta sempre igual, senha descartada no caminho de outro órgão, aceite
      obrigatório e CPF validado quando informado (D6, D10); evento
      `cursos.CadastroExternoCriado`. Testes dos cenários "Cadastro e ativação", "E-mail já
      cadastrado", "E-mail que já tem conta em outro órgão" e "Cadastro sem aceite do termo".
      "E-mail já cadastrado neste órgão" reaproveita `UserService::requestPasswordReset()` (já
      público, já com resposta genérica anti-enumeração) em vez de inventar um segundo e-mail de
      "orienta recuperar senha" — a tarefa só falava de UM evento novo
      (`cursos.CadastroExternoCriado`), e essa reaproveita o fluxo que a Seção 1 já deixou
      funcionando de ponta a ponta. Quem garante a resposta igual nos três caminhos é o
      controller (sempre a mesma mensagem), não o serviço. `Modules\Cursos\Support\Cpf` é
      dígito-verificador só de CPF (a `Documento` do Cemitérios faz CPF+CNPJ, mas está no módulo
      errado pra reaproveitar sem virar uma dependência cross-module sem sentido). `termo_versao`
      grava `settings.cursos.termo.versao` do tenant se já existir (D10); como a tarefa 3.2 ainda
      não criou esse endpoint de configuração, hoje sempre grava `null` — não bloqueia o cadastro
      porque D10 não exige reaceite de versão, só registra a que existia no momento.
- [x] 2.5 Isolamento do papel externo: teste que percorre uma rota de cada módulo com um
      externo ativo e espera `403`, e verificação de que `primary_org_unit_id` nulo não vira
      "acesso irrestrito" em nenhum ponto do ABAC; teste do cenário "Externo não acessa outros
      módulos".
      `App\Support\OrgScope` (o motor central de ABAC por unidade) na verdade nem lê
      `tenant_user.primary_org_unit_id` — usa vínculos em `org_unit_user`, e já trata "nenhum
      vínculo" como lista vazia (bloqueia tudo), não `null` (que significaria irrestrito).
      Confirmado com teste direto no serviço. 8 dos 9 outros módulos negam com 403 (a maioria
      via `module-access:` no grupo de rotas, alguns via gate próprio como `platform-admin`);
      **Capd ficou fora do teste** — não usa `module-access:` e devolve 200 com a query filtrada
      pelo próprio usuário em vez de 403, e ao tentar isso encontrei um bug de verdade:
      `AvaliacaoController::index` só filtra por `avaliador_id` quando o usuário já tem alguma
      avaliação atribuída; sem nenhuma (o caso de um externo, ou de qualquer usuário sem papel
      de avaliador), a query fica sem filtro e devolve as avaliações de desempenho de TODOS os
      servidores do tenant. Reportado ao usuário no chat, não corrigido nesta mudança (módulo e
      domínio diferentes, código sensível de RH que merece revisão própria).
- [x] 2.6 Verificação de e-mail: endpoint com token de uso único e validade de 24 h, ativação do
      vínculo, pedido de novo link, e mensagem "verifique seu e-mail" no login com vínculo
      `pending` (D5, D6); testes dos cenários "Login antes da verificação", "Link de
      verificação vencido" e "Link de verificação usado duas vezes".
      `POST /api/public/cursos/verificar-email` fica em `Routes/publico.php` (sem `{orgao}`/sem
      `TenantContext`), não em `publico-orgao.php`: o token sozinho já carrega `user_id` e
      `tenant_id`, então amarrar a rota a um `{orgao}` da URL só criaria um jeito a mais de dar
      errado (slug não bate com o tenant do token) sem ganhar nada em troca. Já
      `POST /api/public/cursos/{orgao}/pedir-novo-link` precisa do `{orgao}` porque só o e-mail
      não diz em qual órgão está o vínculo pending. "Pedido de novo link" não gera token
      nenhum aqui — só republica `cursos.CadastroExternoCriado` (event_id novo) pro mesmo
      user_id/tenant_id; o tratador de verdade (tarefa 5.1, ainda não existe) que vai gerar o
      token na hora do envio (D5) — testei com o token inserido direto na tabela, simulando o
      que o tratador vai fazer depois. Mudança pequena e cirúrgica no `AuthController::login`
      (não é do Cursos, mas é o único jeito de dar a mensagem "verifique seu e-mail"): adicionei
      só uma checagem a mais bem no fim, antes do erro genérico de "sem tenant ativo" — não mexe
      em MFA nem no caminho de analista de suporte. Sem problema de enumeração em revelar
      "verifique seu e-mail" no login, porque a pessoa já provou a senha antes de chegar nessa
      mensagem.
- [x] 2.7 Limites `cursos-cadastro-ip` e `cursos-cadastro-email` e campo isca (D8); testes dos
      cenários "Excesso de cadastros do mesmo IP" e "Campo isca preenchido".
      `cursos-cadastro-ip` (5/hora) é `throttle:` só na rota `POST /cadastro` (não no grupo
      inteiro — `/` e `/pedir-novo-link` continuam só com o `cursos-publico` do grupo), devolve
      429 normal. `cursos-cadastro-email` (3/hora, hash do e-mail normalizado) não dá pra ser
      `RateLimiter::for` porque o e-mail só existe depois de ler o corpo (D8); implementado a
      mão com `RateLimiter::tooManyAttempts`/`hit` no início de `CadastroExternoService::cadastrar`,
      antes de qualquer um dos três caminhos — cobre também o reenvio de "esqueci minha senha" do
      caminho "já vinculado a este órgão" (que também manda e-mail). Excedido, o serviço só
      retorna sem publicar nada; a resposta ao cliente continua a mesma de sempre (D8: nunca
      revela nada, nem para quem excedeu o próprio limite). Campo isca `website` (oculto por CSS
      no formulário, tarefa 6.2) checado no controller ANTES do `$request->validate(...)`: bot
      preenchendo qualquer coisa nos outros campos ainda cai na resposta de sucesso sem validação
      nenhuma rodar, então erro de validação nunca ensina o formato certo a um bot. Teste extra
      não pedido no cenário mas necessário pra cobrir a metade do D8 que a tarefa só descreve na
      prosa: "Excesso de cadastros do mesmo e-mail" (o `OutboxEvent::count()` para de crescer
      depois do limite, resposta continua 200).
- [x] 2.8 Comando agendado de limpeza de vínculos `pending` com mais de 7 dias e dos usuários
      que só existiam por eles; teste com dados antigos e recentes.
      `cursos:limpar-cadastros-pendentes`, registrado no `CursosServiceProvider` (padrão do
      Admin, `commands([...])` só `runningInConsole`) e agendado `dailyAt('04:00')` em
      `routes/console.php`, entre o `ExpireAccess` (03:00) e o `NotifyExpiringAccess` (07:00).
      `tenant_user` não tem `created_at` — a idade do vínculo pending vem de
      `cursos_participantes.created_at` (origem=externo), criado na mesma transação do cadastro
      (D6), então é o mesmo instante em todos os casos, inclusive quando um `User` de outro órgão
      ganha um vínculo novo. Roda sem `TenantContext` pra levantar os candidatos de todos os
      órgãos de uma vez (o escopo global de `TenantAware` não filtra sem contexto — mesmo truque
      que os testes usam com `noTenant()`), depois define/limpa o contexto por órgão (padrão do
      `EnviarNotificacoes`) pra que os models `TenantAware` do laço filtrem certo. `User` só é
      apagado se não sobrar nenhum `tenant_user` depois de remover o vínculo vencido — testado com
      um mesmo `User` com vínculo pending vencido num órgão e ativo em outro: só o primeiro some.
      Participante com inscrição (`restrictOnDelete` em `cursos_inscricoes`/`cursos_certificados`)
      é ignorado em vez de derrubar o comando — não deveria acontecer com um vínculo pending (login
      exige `active`), mas não custa não confiar nisso num comando destrutivo agendado. Rodei
      manualmente contra o MySQL de dev (`docker compose exec api php artisan
      cursos:limpar-cadastros-pendentes`): 0/0/0, como esperado (nenhum cadastro externo velho
      ainda nesse branch).

## 3. Página pública e configuração

- [x] 3.1 Migrations: `slug` e `texto_publico` em `cursos_cursos` (único por tenant, gerado do
      título nos cursos existentes) e `aceita_externos` em `cursos_turmas`; validações no
      cadastro do curso e da turma, com o texto sanitizado; teste do cenário "Texto de
      divulgação com script".
      `slug`/`texto_publico` nullable no banco (sem doctrine/dbal no projeto, não dá pra fazer
      `->change()` de NOT NULL depois de backfill numa mesma migration sem ele) — quem garante que
      todo curso novo sai com slug é o `CursoService::criar` (gera do título com
      `Str::slug`/sufixo `-2`, `-3`... em colisão, só quando o cliente não manda um), não a coluna.
      Migration de backfill testada de verdade contra o MySQL de dev (`module:migrate Cursos
      --force`): os 4 cursos de demonstração ganharam slug correto a partir do título acentuado
      (`Lei 14.133/2021 na prática` → `lei-141332021-na-pratica`). `texto_publico` sanitizado com
      o mesmo `HtmlSanitizer` da Fase 2 (D5), no `CursoService`, não no controller — mesmo padrão
      de `AvaliacaoService`/`MaterialService`. Unicidade do slug por tenant como
      `Rule::unique(...)->where('tenant_id', ...)->ignore($curso?->id)` no controller (só valida
      quando o cliente informa um slug; o gerado automaticamente já nasce único, verificado contra
      o banco num laço). **Achado**: `TurmaService::criar` não tinha `->refresh()` depois do
      `create()` (só `CursoService::criar` tinha, por outro motivo) — sem isso o model em memória
      não carregava `aceita_externos` (nem nenhuma outra coluna com padrão que não veio em
      `$dados`), e a resposta da API devolvia a chave ausente em vez de `false`. Corrigido; achado
      pelo teste "turma não aceita externos por padrão", não por revisão de código.
- [x] 3.2 `GET/PUT /api/cursos/configuracao-publica` (habilitar, boas-vindas, termo com versão
      incrementada quando o texto muda, documento obrigatório) sobre `settings.cursos`, sem tocar
      nas outras chaves de `settings` (D10, D11); testes de permissão, auditoria e da versão do
      termo.
      `ConfiguracaoPublicaService` (novo) concentra a leitura/merge do sub-objeto
      `settings.cursos` — mesmo cuidado do `TenantSettingsController` (núcleo) de nunca sobrescrever
      `settings` inteiro, só a própria chave. Gate `viewAny` de `Curso` (= `cursos.manage`), mesmo
      corte de `EnvioController`/relatórios, sem precisar de instância própria pra autorizar.
      Versão do termo incrementa comparando o texto NOVO (já sanitizado) com o gravado — reenviar
      o campo `termo` inteiro sem mudança de texto (esperado do frontend, que manda o objeto
      inteiro no PUT) não infla a versão; não mandar `termo` no PUT não toca nele. `boas_vindas` e
      `termo.texto` sanitizados com o mesmo `HtmlSanitizer` de 3.1/D5 — são exibidos na página
      pública, mesmo vetor de XSS armazenado.
- [x] 3.3 Endpoints públicos de leitura: página do órgão, catálogo público e página do curso, com
      Resources de lista explícita de campos (D7); testes dos cenários "Página habilitada",
      "Oferta pública" e de que nenhum campo interno (e-mail de instrutor, vagas totais) sai.
      `Services\Publico\CatalogoPublicoService` (novo) — lista campo a campo, nunca
      `$model->toArray()`, mesmo padrão de `ValidacaoCertificadoService`/`OrgaoPublicoService`
      (por isso "Resources" aqui são arrays explícitos, não classes `JsonResource` — não achei
      motivo pra desviar do padrão já estabelecido no namespace `Services\Publico` só nesta
      tarefa). Turma "qualificada" pra sair no público: `status=aberta` + `aceita_externos=true`
      + dentro do período de inscrição — catálogo só lista curso `publicado` com pelo menos uma;
      página do curso individual não exige isso pra existir (só `publicado`+slug), mas só mostra
      as turmas qualificadas (lista vazia é uma resposta válida, não 404). `vagas_restantes`
      (calculado) sai, `vagas` (capacidade) nunca. `OrgaoPublicoService::informacoes` ganhou
      `boas_vindas` (só esse campo de `settings.cursos`, o resto fica só na configuração
      autenticada). **Achado importante, achado pelo teste, não por revisão**: rota
      `{orgao}/cursos/{slug}` tem DOIS parâmetros de URL, mas o Laravel injeta parâmetro primitivo
      de rota (não tipado como model/classe) no método do controller **por posição na URI, não
      pelo nome do parâmetro** — `__invoke(string $slug)` sozinho recebia o valor de `{orgao}`
      (o primeiro da URI), não o do `{slug}`. Corrigido aceitando os dois na ordem
      (`__invoke(string $orgao, string $slug)`), mesmo sem usar `$orgao` (o tenant já vem do
      `ResolvePublicTenant`) — vale pra qualquer rota pública futura com mais de um parâmetro na
      URI.
- [x] 3.4 Regra de externo na inscrição: `InscricaoService` recusa turma que não aceita externos,
      e o `CatalogoController` autenticado filtra por `aceita_externos` para externos; testes dos
      cenários "Turma fechada a externos" e "Externo em turma fechada a externos".
      Checagem em `InscricaoService::inscrever` por `$participante->origem === ORIGEM_EXTERNO`
      (não pelo papel do `$autor` — quem importa é de quem é a inscrição, não quem está clicando),
      logo depois do período de inscrição — mas ao contrário daquele, **não** é dispensada quando
      `$peloAdministrador=true`: é regra de acesso da turma (D7/D11), não conveniência de fluxo;
      testado que o Administrador também é recusado ao tentar inscrever um externo direto numa
      turma fechada. `CatalogoController::index` só filtra as turmas de cada curso por
      `aceita_externos` quando `Participante.origem` do usuário logado é `externo` — servidor
      continua vendo tudo, curso continua aparecendo (só a lista de turmas fica vazia), nunca some
      da lista inteira.

## 4. Formulário de inscrição configurável

- [ ] 4.1 Migrations e models `TenantAware` de `cursos_campos_inscricao` e
      `cursos_inscricao_respostas` (D9); verificar `migrate` e isolamento A/B.
- [ ] 4.2 `CampoInscricaoService` e controller (CRUD, reordenar, desativar; sem excluir campo
      respondido; tipo `selecao` exige opções); testes dos cenários "Exclusão de campo
      respondido" e de validação do cadastro do campo.
- [ ] 4.3 Respostas na inscrição: validação por tipo, obrigatórios, snapshot de rótulo e tipo,
      texto puro, gravação na mesma transação do `InscricaoService` (D9); testes dos cenários
      "Campo obrigatório", "Seleção com opção inexistente", "Inscrição com formulário
      configurado" e "Campo editado depois da resposta".
- [ ] 4.4 Visibilidade e imutabilidade das respostas (policy da inscrição, `404` entre órgãos e
      entre participantes, imutáveis depois do encerramento); teste do cenário "Participante vê a
      resposta de outra pessoa".
- [ ] 4.5 CSV de inscritos com origem e colunas do formulário, e neutralização de fórmulas em
      toda célula de texto (D13); testes dos cenários "Exportação da turma" e "Resposta que
      começa com fórmula".

## 5. E-mails do módulo Cursos

- [ ] 5.1 Tratador de `cursos.CadastroExternoCriado`: gera o token na hora do envio e monta o link
      de verificação (D5); teste de que uma nova tentativa depois do envio não gera novo token.
- [ ] 5.2 Tratadores de inscrição: criada (texto por `confirmada`, `pendente` e `lista_espera`,
      com a posição), aprovada, recusada, cancelada e promovida; conferir se o `payload` atual
      leva o motivo de recusa e de cancelamento e, se não levar, acrescentar a chave (D12);
      testes dos cenários "Inscrição em lista de espera" e "Promoção da lista de espera".
- [ ] 5.3 Tratador de `cursos.CertificadoEmitido` com o código e o link de validação pública;
      teste do cenário "Certificado emitido".
- [ ] 5.4 Verificar que nenhuma mensagem do Cursos contém senha, nota ou resposta de terceiros
      (teste que percorre os tipos e confere o conteúdo renderizado).

## 6. SDK e frontend

- [ ] 6.1 Tipos e métodos novos em `packages/sdk/src/modules/cursos` (página pública, cadastro,
      verificação, campos do formulário, configuração pública, envios, respostas na inscrição) e
      na autenticação (esqueci e redefinir senha); verificar o typecheck do web-client.
- [ ] 6.2 Páginas públicas no web-client, fora do guarda de autenticação: catálogo do órgão,
      página do curso e cadastro (com campo isca oculto, aceite do termo e identidade do órgão
      vinda da API) (D14); testes Vitest de renderização, do aceite obrigatório e da ausência de
      dados do órgão no código.
- [ ] 6.3 Páginas de verificação de e-mail, "esqueci minha senha" e redefinição de senha, e os
      links na tela de login; testes Vitest dos estados (sucesso, expirado, já usado).
- [ ] 6.4 Aba de campos do formulário no detalhe do curso, com modal no padrão das abas da Fase 2
      e validação das opções da seleção; marca "aceita externos" no formulário da turma; slug e
      texto de divulgação no formulário do curso; testes Vitest.
- [ ] 6.5 Formulário de inscrição com os campos configurados (no catálogo autenticado e na
      inscrição pública) e as respostas na tela da inscrição; testes Vitest dos obrigatórios e
      dos tipos.
- [ ] 6.6 Tela de configuração da página pública e a lista de envios de e-mail com reenvio na
      gestão de cursos; testes Vitest.

## 7. Fechamento

- [ ] 7.1 Estender o `CursosDadosDemonstracaoSeeder` com a página pública habilitada, campos de
      formulário, uma turma aberta a externos e um externo de exemplo; o
      `CursosDadosDemonstracaoSeederTest` continua verde.
- [ ] 7.2 Suíte completa verde: phpunit (Docker), PHPStan, typecheck, testes e build de
      `apps/web` e `apps/web-client`, mais o grupo `mysql` no MySQL do Docker.
- [ ] 7.3 Teste manual no navegador com o Mailpit: cadastro de um externo, e-mail de
      verificação, ativação, login, inscrição com campos do formulário, e-mail de inscrição,
      lista de espera e promoção, certificado com e-mail, e recuperação de senha de ponta a ponta.
- [ ] 7.4 Registrar no PR os itens de infraestrutura para produção (SMTP, remetente, SPF/DKIM,
      `PORTAL_URL`, `scheduler`) e as perguntas abertas do design.
