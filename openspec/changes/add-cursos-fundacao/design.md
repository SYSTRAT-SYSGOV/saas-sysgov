# Design

## Context

Ver `proposal.md` (Why) e `specs/cursos/spec.md` (requisitos). Estado atual relevante do código:

- **Módulos**: monólito modular `nwidart/laravel-modules`; `php artisan make:module` gera o
  esqueleto tenant-aware com teste de isolamento; `module:register` grava catálogo, permissões e
  menu a partir do `module.json` (roda a cada boot no `docker-entrypoint.sh`).
- **Perfis por módulo**: roles-template ficam no tenant SYSTRAT com `module = <alias>` (ex.:
  `CapdRbacSeeder`) e o `ModuleRoleProvisioner` as clona para o tenant quando o módulo é
  habilitado. Policies checam permissão com `hasPermission` + tenant do `TenantContext`
  (ex.: `Licita/Policies/ProcessoPolicy`).
- **`TenantAware`** aplica o filtro `tenant_id` **somente quando há `TenantContext`**; sem
  contexto a consulta não é filtrada. Criar registro sem contexto e sem `tenant_id` explícito
  lança `LogicException`.
- **Rotas fora do Sanctum** existem só no CAPD (`api/capd/embed` e `api/capd/rh-gateway`),
  autenticadas por token próprio. **Não existem hoje**: rota anônima, limite de requisições
  configurado, geração de PDF ou QR code no backend, nem envio de e-mail. O Outbox tem um
  processador (`outbox:process`, que dispara o evento Laravel `OutboxMessage`), mas ele não
  está agendado e nenhum listener consome esse evento. Na prática, os eventos ficam só gravados.
- **Gate de módulo**: as rotas dos módulos usam `module-access:<alias>`
  (`EnsureModuleAccess`), que nega com `403 MODULE_ACCESS_DENIED` quando o módulo não está
  habilitado no tenant.
- **Frontend**: `apps/web-client` já tem uma rota fora do `ProtectedRoute` (`/capd/embed`),
  `jspdf` como dependência, e o registry de módulos é gerado por `npm run generate:registry`.
- **Padrão de referência para fluxo com estados, versões e auditoria**: módulo Licita
  (Services com transições validadas, `AuditLogger` + `OutboxPublisher` em toda mutação,
  `DomainException` com código de RN).

## Goals / Non-Goals

**Goals:**
- Modelo de dados que já comporte as Fases 2 e 3 sem migração destrutiva (em especial o
  participante externo e a nota no critério de conclusão).
- Primeiras rotas públicas da plataforma com isolamento garantido por construção, não por
  disciplina de quem escreve a consulta.
- Controle de vagas correto sob concorrência.

**Non-Goals:**
- Consumidor do Outbox / envio de e-mail (Fase 3). Esta fase só publica os eventos.
- Assinatura digital ICP-Brasil no certificado. A autenticidade é garantida pelo código único
  com validação pública.
- Exportação completa do tenant (ZIP + manifest). Esta fase entrega apenas o CSV de inscritos;
  o módulo deve ser incluído quando o exportador geral da plataforma existir.

## Decisions

### D1. Módulo `Cursos`, tabelas `cursos_*`, nomes em português
Segue o Licita (`licita_processos`, `licita_dfds`). Entidades: `cursos_cursos`,
`cursos_formacoes`, `cursos_formacao_cursos` (pivot com `ordem`, `obrigatorio`),
`cursos_turmas`, `cursos_turma_instrutores`, `cursos_aulas`, `cursos_aula_agendamentos`
(aula × turma), `cursos_participantes`, `cursos_inscricoes`, `cursos_presencas`,
`cursos_modelos_certificado`, `cursos_certificados`. Todas com `tenant_id` + índices compostos
iniciando por tenant, models com `TenantAware`.

### D2. `Participante` como entidade própria, ligada opcionalmente a `User`
`cursos_participantes` (`tenant_id`, `user_id` nulo, `nome`, `email`, `documento` nulo), com
unicidade `(tenant_id, user_id)` e `(tenant_id, email)`. Na Fase 1 todo participante tem
`user_id` (servidor logado), criado sob demanda na primeira inscrição. A inscrição referencia
`participante_id`, nunca `user_id` direto.
- *Por quê*: na Fase 3 o participante externo entra como mais uma linha dessa tabela, sem mudar
  inscrição, presença e certificado.
- *Alternativa descartada*: inscrição apontando para `users`. Obrigaria a criar `User` para
  cada pessoa externa, com acesso ao login do órgão, ou a migrar a FK depois.

### D3. Evento = `cursos_cursos.tipo = 'evento'`
Regra de turma única validada no `TurmaService` (não por constraint, pois depende do tipo).
Evita duplicar inscrição/presença/certificado (decisão do usuário registrada na proposta).

### D4. Critério de conclusão extensível
`cursos_cursos.frequencia_minima` (tinyint, padrão 75) e `nota_minima` (nulo, **sem uso na Fase
1**). A apuração fica isolada num `ApuracaoConclusaoService` que recebe a inscrição e devolve o
resultado; a Fase 2 acrescenta a checagem de nota sem mexer em quem chama.

### D5. Vagas sob concorrência: lock pessimista na turma
`InscricaoService::inscrever` roda em transação, faz `SELECT ... FOR UPDATE` na linha da turma
(`lockForUpdate()`), conta as inscrições que ocupam vaga e decide entre
`confirmada`/`pendente`/`lista_espera`. Cancelamento e promoção usam o mesmo lock, então a
promoção FIFO (`ORDER BY created_at, id`) nunca concorre com uma inscrição nova.
- *Alternativa descartada*: contador `vagas_ocupadas` com `UPDATE ... WHERE vagas_ocupadas <
  vagas`. É mais rápido, mas cria um segundo lugar para manter coerente (cancelamento, promoção,
  encerramento). O volume de inscrições simultâneas numa turma de órgão público não justifica.
- Unicidade de inscrição ativa: índice único não cobre "só ativos" no MySQL; a checagem fica na
  mesma transação com lock, e o teste de concorrência cobre o cenário.
- O teste de concorrência roda contra MySQL; em SQLite `FOR UPDATE` é ignorado (ver Riscos).

### D6. Check-in por QR: token HMAC de curta duração, sem estado
O instrutor pede `GET /api/cursos/agendamentos/{id}/qr-token` a cada ~30s. O servidor devolve
`base64url(agendamento_id.expira_em).hmac_sha256(APP_KEY derivada, payload)` com validade de 60s.
O QR codifica a URL do web-client `/cursos/check-in?t=<token>`. O participante, logado, envia o
token; o servidor valida assinatura, expiração, janela da aula, tenant do agendamento = tenant
da sessão e inscrição confirmada. A presença é gravada com `origem = qr_code` e `upsert` por
`(agendamento_id, inscricao_id)`.
- *Por quê*: não precisa de tabela nem limpeza de tokens; a rotação de 60s reduz o
  compartilhamento da foto do QR por mensagem (risco aceito, ver Riscos).
- O QR é desenhado **no backend** (SVG em data URI, com o `chillerlan/php-qrcode` que o
  certificado já usa) e devolvido junto com o token; a tela do instrutor só exibe a imagem.
  *Ajuste na implementação*: o plano original desenhava no frontend com uma biblioteca npm, o
  que acrescentaria uma dependência ao web-client sem ganho, já que a do backend existe.
- *Alternativa descartada*: tokens persistidos por aula. Dão rastreabilidade, mas exigem limpeza
  e não trazem segurança adicional.

### D7. Rotas públicas isoladas por construção
As rotas autenticadas usam `['auth:sanctum', 'tenant', 'bindings', 'module-access:cursos']`,
como o Licita. As públicas ficam num arquivo próprio (`Routes/publico.php`), registrado no
`RouteServiceProvider` do módulo como o CAPD faz com `embed.php`: grupo `api/public/cursos`,
**sem** `auth:sanctum`/`tenant`/`module-access`,
com `throttle:cursos-publico` (novo `RateLimiter::for`, 30/min por IP). Nesta fase há uma rota:
`GET /api/public/cursos/certificados/{codigo}`.
- Como `TenantAware` não filtra sem contexto, o controller público **não consulta models
  diretamente**: chama só `ValidacaoCertificadoService::consultar(string $codigo)`, que faz
  uma única consulta por `codigo` (único global) e devolve um DTO com os campos mínimos da spec,
  lidos do snapshot do próprio certificado (D8). Nenhuma outra tabela é tocada.
- Um teste de arquitetura garante que controllers em `Http/Controllers/Publico` só dependem de
  `ValidacaoCertificadoService`, e um teste funcional garante que a resposta contém só a lista
  permitida de campos.
- A validação **não** depende do módulo estar habilitado no tenant: um certificado emitido
  continua verificável mesmo que o órgão desabilite o módulo depois.
- O `codigo` é único em toda a plataforma (índice único simples, não composto por tenant). É a
  única exceção à regra de unicidade composta, e é o que permite validar sem saber o tenant.

### D8. Certificado como snapshot imutável + PDF gerado sob demanda
`cursos_certificados` guarda `codigo`, `tipo` (`curso`/`formacao`), referências (inscrição ou
formação+participante), `modelo_id`, `dados` (JSON congelado: nome, curso, carga horária,
período, órgão, texto já renderizado, logotipo e assinaturas), `emitido_em`, `revogado_em`,
`motivo_revogacao`.
- O PDF é renderizado **no backend** a partir do snapshot a cada download (Blade → PDF), sem
  guardar arquivo. O snapshot garante que o PDF é sempre o mesmo, e revogar não deixa arquivo
  órfão.
- Bibliotecas: `barryvdh/laravel-dompdf` (PDF) e `chillerlan/php-qrcode` (QR em SVG/PNG
  embutido no PDF). Ambas são PHP puras, mas o dompdf exige a extensão `gd` para imagens PNG
  (logotipo e assinaturas), que a imagem da API não tinha: o `Dockerfile` passa a instalá-la.
- *Alternativa descartada*: PDF no frontend com `jspdf` (já instalado). O certificado precisaria
  ser montado no cliente, e o documento "oficial" dependeria do navegador. Para um documento com
  validade pública, a fonte deve ser o servidor.
- Código: 12 caracteres Crockford base32 de `random_bytes`, exibido como `XXXX-XXXX-XXXX`
  (~60 bits). Colisão tratada com nova tentativa, como a numeração do Licita.

### D9. Modelo de certificado: texto com placeholders, sem HTML livre
O corpo aceita texto com parágrafos e os placeholders fixos da spec; é salvo sanitizado
(`HtmlSanitizer` do Licita pode ser promovido para `app/Support` se necessário) e renderizado
por substituição simples, sem Blade dinâmico, para evitar injeção de template. Logotipo e
imagens de assinatura no disco `public`, em `cursos/{tenant_id}/certificados/`, com as mesmas
validações de mime/tamanho do logo do tenant.

### D10. Encerramento da turma processa a apuração em transação
Encerrar é síncrono: turmas de órgão público têm dezenas a poucas centenas de inscritos. Numa
transação: apura cada inscrição (D4), cancela pendentes e fila, emite certificados e marca a
turma `encerrada`. Em seguida, fora da transação, verifica a conclusão das formações que contêm
o curso, para os participantes concluintes. Se faltar modelo de certificado, a turma encerra, as
inscrições ficam `concluida` sem certificado e a resposta lista os pendentes. Um endpoint
"emitir certificados pendentes" os resolve depois que um modelo for criado.

### D11. Perfis e permissões
`module.json` declara as permissões `cursos.view`, `cursos.manage`, `cursos.instrutor` e
`cursos.participar`. O `CursosRbacSeeder` cria as roles-template `admin_cursos`,
`instrutor_cursos` e `participante_cursos` no tenant SYSTRAT com `module = 'cursos'`, clonadas
pelo `ModuleRoleProvisioner`. O vínculo instrutor↔turma (`cursos_turma_instrutores`) é o
atributo de objeto checado nas policies: ter a permissão `cursos.instrutor` sem estar designado
não dá acesso à turma.

### D12. Frontend
Módulo `apps/web-client/src/modules/cursos` (lazy), com abas de gestão visíveis conforme a
permissão (Cursos, Formações, Turmas, Modelos de Certificado), "Minhas Turmas" (instrutor:
chamada e QR em tela cheia) e "Meus Cursos" (participante). Duas rotas fora do `ProtectedRoute`:
`/validar-certificado/:codigo?` (pública) e `/cursos/check-in` (redireciona ao login preservando
o token e depois confirma o check-in). Primitivas só de `@sysgov/ui`. Contrato em
`packages/sdk/src/modules/cursos`.

## Risks / Trade-offs

- **[Rota pública sem filtro de tenant]** Uma consulta nova num controller público vazaria dados
  entre órgãos → D7: um único service permitido, teste de arquitetura e teste da lista de campos
  permitidos na resposta.
- **[`lockForUpdate` é ignorado em SQLite]** A suíte roda em SQLite em memória, então o teste
  comum não prova a concorrência → teste de concorrência marcado para rodar contra o MySQL do
  Docker (grupo `mysql`), além dos testes funcionais em SQLite.
- **[Foto do QR compartilhada]** Um participante ausente pode fazer check-in com a foto enviada
  por um colega dentro da janela de 60s → risco aceito nesta fase; a chamada manual continua
  soberana (o instrutor pode corrigir). Geolocalização ou código numérico falado ficam para
  avaliação futura.
- **[Dependências novas]** `dompdf` pesa no uso de memória para PDFs grandes → o certificado tem
  1 página; medir no container e manter o `memory_limit` atual.
- **[Encerramento síncrono]** Turmas muito grandes podem deixar a requisição lenta → aceitável
  para o volume esperado; se virar problema, mover a emissão para job em fila sem mudar a spec.
- **[Eventos no Outbox sem consumidor]** Eventos se acumulam em `outbox_events` até a Fase 3 →
  volume baixo; o consumidor da Fase 3 decide se processa os antigos ou só a partir da data de
  ativação.

## Migration Plan

Módulo novo, sem alteração de schema existente. Deploy: `composer install` (novas dependências)
→ `migrate` → o boot do container executa `module:register Cursos` → habilitar o módulo por
tenant no Admin Suite, o que provisiona as roles. Rollback: desabilitar o módulo no tenant (as
rotas autenticadas passam a responder `403` pelo `module-access:cursos`; a validação pública de
certificados já emitidos continua funcionando, ver D7); as migrations têm `down()` para
remoção completa em ambiente sem dados.

## Open Questions

- Texto padrão do modelo de certificado sugerido ao criar o primeiro modelo (redação
  institucional). Pode ser definido na implementação e ajustado pelo órgão depois.
- Limite exato da rota pública (30/min por IP é o ponto de partida): calibrar com uso real.
