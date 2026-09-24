# Proposal

## Why

Os órgãos clientes do SYSGOV (prefeituras, câmaras, autarquias) promovem capacitação de
servidores — cursos, trilhas de formação, palestras e workshops — com inscrição, lista de
presença e certificado controlados hoje em planilhas e formulários soltos. Não há controle de
vagas, a frequência mínima é conferida à mão e os certificados não têm como ser validados por
terceiros. Um módulo de Cursos e Formações dentro da plataforma, isolado por órgão e integrado
aos usuários e perfis que já existem, resolve esse ciclo de ponta a ponta.

O escopo completo (materiais, avaliações, público externo, páginas públicas personalizáveis,
e-mail e relatórios) é grande demais para uma entrega só. Esta mudança é a **Fase 1 —
fundação**: entrega o ciclo mínimo utilizável (oferta → inscrição → presença → conclusão →
certificado) para servidores do próprio órgão, com o modelo de dados já preparado para as fases
seguintes.

## What Changes

- Novo módulo de negócio `Cursos` (`apps/api/Modules/Cursos`, alias `cursos`), criado via
  `php artisan make:module`, habilitável por tenant no Admin Suite como os demais.
- **Catálogo**: CRUD de Curso (título, descrição, carga horária, capa, status
  rascunho/publicado/encerrado e critério de conclusão configurável). **Evento** é um Curso de
  tipo `evento` (uma única turma, sem exigência de avaliação), reaproveitando inscrição,
  presença e certificado.
- **Formação (trilha)**: agrupamento ordenado de cursos com marcação de obrigatório/optativo; o
  participante conclui a formação ao concluir todos os cursos obrigatórios, e recebe certificado
  próprio da formação.
- **Turmas e aulas**: turmas com período, vagas, modalidade (presencial/online/híbrido),
  local ou link e instrutores; aulas definidas no curso e agendadas por turma.
- **Inscrição** de servidores do órgão numa turma, com controle de vagas concorrente-seguro,
  **lista de espera** com promoção automática quando uma vaga é liberada, aprovação opcional
  pelo gestor e exportação CSV da lista de inscritos.
- **Presença** por aula: chamada manual pelo instrutor e **check-in por QR code** (token
  rotativo de curta duração exibido pelo instrutor, lido pelo participante logado).
- **Conclusão e certificado**: ao encerrar a turma, o sistema apura o critério de conclusão
  (frequência mínima nesta fase; nota mínima entra com as avaliações na Fase 2) e emite
  certificado em PDF a partir de um **modelo configurável** (texto com campos dinâmicos,
  logotipo, assinaturas), com **código único** e **página pública de validação de
  autenticidade** — a primeira rota anônima (sem login nem token) da plataforma.
- **Perfis**: Administrador de Cursos, Instrutor (restrito às turmas em que é instrutor) e
  Participante (restrito às próprias inscrições), como roles do módulo provisionadas ao
  habilitá-lo para o tenant.
- **Frontend (`apps/web-client`)**: telas de gestão, chamada/QR do instrutor, área do
  participante (minhas inscrições, frequência, certificados) e página pública de validação.

Fora desta mudança (fases seguintes, cada uma com sua própria proposta):
- **Fase 2**: materiais (PDF, vídeo incorporado, links, textos) com liberação programada;
  avaliações com banco de questões (objetivas com correção automática e dissertativas com
  correção pelo instrutor); nota mínima no critério de conclusão.
- **Fase 3**: participante externo (autocadastro), página pública de inscrição personalizável,
  formulário de inscrição configurável, e-mail de confirmação (exige um consumidor do Outbox,
  que ainda não existe) e relatórios.
- Fora do escopo do produto nesta versão: pagamentos, gamificação, fórum e app mobile.

## Capabilities

### New Capabilities

- `cursos`: gestão de cursos, eventos, formações, turmas e aulas; inscrição com vagas e lista
  de espera; presença manual e por QR code; apuração de conclusão; emissão e validação pública
  de certificados; perfis Administrador/Instrutor/Participante.

### Modified Capabilities

(nenhuma — o módulo usa os mecanismos existentes de catálogo de módulos, provisionamento de
roles e autenticação sem alterar os requisitos de `admin` ou `client`)

## Impact

- **Backend**: novo módulo `apps/api/Modules/Cursos` (migrations `cursos_*`, models
  `TenantAware`, services, policies, rotas autenticadas em `api/cursos` e rotas públicas em
  `api/public/cursos`); seeder de roles-template no padrão de `CapdRbacSeeder`.
- **Rotas públicas**: primeira rota anônima da API (as rotas `embed`/`rh-gateway` do CAPD usam
  token); exige rate limiting e resolução de tenant
  sem `TenantContext` de sessão (detalhado no design).
- **Dependências novas (composer)**: geração de PDF no servidor (ex.: `barryvdh/laravel-dompdf`)
  e de QR code (ex.: `chillerlan/php-qrcode`) — hoje o projeto não tem nenhuma das duas.
- **Frontend**: novo módulo `apps/web-client/src/modules/cursos`, rota pública fora do
  `ProtectedRoute` (mesmo padrão de `/capd/embed`), contrato em `packages/sdk/src/modules/cursos`
  e regeneração do `moduleRegistry.generated.ts`.
- **Storage**: capas de curso e logotipos/assinaturas dos modelos de certificado no disco
  `public`, por tenant (mesmo padrão do logo em `TenantSettingsController`).
- **Auditoria/Outbox**: toda mutação registrada via `AuditLogger` e eventos de domínio
  publicados no Outbox (inscrição, promoção da lista de espera, certificado emitido), prontos
  para o consumidor de notificações da Fase 3.
