# Tasks

> Testes do backend rodam no container `api` (SQLite em memória), com os overrides de ambiente
> do projeto; chamados abaixo de "phpunit (Docker)". O teste de concorrência (4.4) roda contra o
> MySQL do Docker. Frontend: `docker compose -f Docker-compose.yml run --rm --no-deps web-client
> sh -c "npm test && npm run typecheck"`.

## 1. Estrutura do módulo e dependências

- [x] 1.1 Gerar o esqueleto com `php artisan make:module Cursos` e ajustar o `module.json`
      (alias `cursos`, `requires: ["Admin"]`, permissões `cursos.view`, `cursos.manage`,
      `cursos.instrutor`, `cursos.participar`, menu); verificar que o `TenantIsolationTest`
      gerado passa no phpunit (Docker).
- [x] 1.2 Adicionar `barryvdh/laravel-dompdf` e `chillerlan/php-qrcode` ao `composer.json` da
      API; verificar `composer install` no container sem conflito e a suíte completa ainda verde.
      *Nota*: a imagem da API não tinha a extensão `gd`, exigida pelo dompdf para PNG; o `Dockerfile`
      passa a instalá-la (design D8 atualizado).
- [x] 1.3 Registrar no `RouteServiceProvider` do módulo o grupo autenticado `api/cursos`
      (`auth:sanctum`, `tenant`, `bindings`, `module-access:cursos`) e o grupo público
      `api/public/cursos` (`Routes/publico.php`, só `throttle:cursos-publico`); criar o
      `RateLimiter::for('cursos-publico')` (30/min por IP). Verificar com teste que uma rota
      autenticada responde `403 MODULE_ACCESS_DENIED` com o módulo desabilitado no tenant.
- [x] 1.4 Criar o `CursosRbacSeeder` com as roles-template `admin_cursos`, `instrutor_cursos` e
      `participante_cursos` (tenant SYSTRAT, `module = 'cursos'`); verificar com teste que
      habilitar o módulo para um tenant provisiona as três roles (mesmo padrão de
      `ModuleToggleRoleProvisioningTest`).
      *Nota*: o `CursosRbacSeeder` roda no `docker-entrypoint.sh` depois do `module:register`. O
      provisionamento só acontece pela tela de Módulos (`ModuleController`); ligar o módulo pela edição
      do órgão (`TenantController::update`) não provisiona perfis — lacuna preexistente, que afeta o CAPD.

## 2. Modelo de dados

- [x] 2.1 Migrations de `cursos_cursos`, `cursos_formacoes` e `cursos_formacao_cursos`, com
      `tenant_id`, índices compostos iniciando por tenant e as colunas `tipo`,
      `frequencia_minima` (padrão 75) e `nota_minima` (nulo) (D1, D3, D4); models `TenantAware`
      com casts. Verificar `migrate` no MySQL do Docker e o isolamento com teste A/B.
- [x] 2.2 Migrations de `cursos_turmas`, `cursos_turma_instrutores`, `cursos_aulas` e
      `cursos_aula_agendamentos`, com models `TenantAware`; verificar com teste A/B.
- [x] 2.3 Migrations de `cursos_participantes` (`user_id` nulo, únicos `(tenant_id, user_id)` e
      `(tenant_id, email)`), `cursos_inscricoes` e `cursos_presencas` (único
      `(agendamento_id, inscricao_id)`, coluna `origem`) (D2); verificar com teste A/B.
- [x] 2.4 Migrations de `cursos_modelos_certificado` e `cursos_certificados` (`codigo` com
      índice único global, `dados` JSON, `revogado_em`, `motivo_revogacao`) (D8); verificar com
      teste A/B e um teste de que dois tenants não podem gerar o mesmo `codigo`.
- [x] 2.5 Enums de status (curso, turma, inscrição, modalidade, origem da presença) com
      `podeTransicionarPara`, no padrão de `Licita/Enums/StatusDfd`; verificar com testes
      unitários das transições permitidas e proibidas.

## 3. Catálogo: cursos, eventos, formações, turmas e aulas

- [x] 3.1 `CursoService` + `CursoController` + `CursoPolicy`: CRUD, transições
      `rascunho → publicado → encerrado`, bloqueio de exclusão com inscrições, upload de capa
      no disco `public`, auditoria e Outbox. Verificar os cenários do requisito "Cadastro e
      ciclo de vida do curso" em teste de feature.
- [x] 3.2 `FormacaoService` + controller + policy: composição ordenada, com obrigatório/optativo
      e ao menos um obrigatório, e cursos só do mesmo tenant. Verificar com teste de feature.
- [x] 3.3 `TurmaService` + controller + policy: validações de período, vagas, modalidade
      (local/link), instrutores do mesmo tenant e ativos, turma única para `evento`, status.
      Verificar os cenários "Turma online sem link", "Instrutor de outro tenant" e "Segunda
      turma para evento".
- [x] 3.4 Aulas do curso e agendamento por turma, dentro do período da turma; verificar o
      cenário "Agendamento fora do período da turma".
- [x] 3.5 Policies de objeto: instrutor só nas turmas em que está designado; participante só
      no catálogo publicado. Verificar os cenários de `403` do requisito de perfis.
      *Nota*: as rotas começaram com o grupo de middleware `api`, cujo `SubstituteBindings` resolvia os
      `{models}` antes do `tenant` — um id de outro órgão respondia 200. Corrigido (sem o grupo `api`,
      como o Licita) e reforçado nas policies (`doTenant`); regressão coberta por `IsolamentoRotasTest`.

## 4. Inscrições e lista de espera

- [x] 4.1 Criação sob demanda do `Participante` a partir do usuário logado (D2); verificar que
      a segunda inscrição do mesmo usuário reutiliza o participante.
- [x] 4.2 `InscricaoService::inscrever` com transação + `lockForUpdate` na turma (D5):
      `confirmada`/`pendente`/`lista_espera`, período de inscrição, curso publicado e uma
      inscrição ativa por turma; inscrição direta pelo Administrador. Verificar os cenários do
      requisito "Inscrição do participante em turma" (exceto concorrência).
- [x] 4.3 Aprovação/recusa de pendentes, cancelamento (regras do participante × Administrador) e
      promoção FIFO automática da lista de espera com evento no Outbox. Verificar os cenários
      "Cancelamento libera vaga para a fila" e "Participante cancela após o início".
- [x] 4.4 Teste de concorrência (grupo `mysql`) com dois processos disputando a última vaga,
      rodado contra o MySQL do Docker; verificar que exatamente um fica `confirmada` e o outro
      `lista_espera`.
- [x] 4.5 Exportação CSV (UTF-8 com BOM, para abrir no Excel) dos inscritos da turma, com a
      exportação auditada; verificar colunas e registro na auditoria em teste.

## 5. Presença

- [x] 5.1 Chamada manual por agendamento (a partir do início da aula e até o encerramento),
      com auditoria antes/depois; verificar os cenários "Chamada antes da aula" e "Correção de
      presença".
- [x] 5.2 Emissão de token de check-in (HMAC, 60s, D6) restrita ao instrutor designado e à
      janela da aula; verificar com teste que o token expira e não vale para outro agendamento.
      *Nota*: o QR passou a ser desenhado no backend (SVG com o `php-qrcode` já instalado) e devolvido
      junto com o token, em vez de uma biblioteca npm no web-client (design D6 atualizado).
- [x] 5.3 Endpoint de check-in do participante (assinatura, expiração, janela, tenant da sessão,
      inscrição confirmada, idempotente); verificar os cenários "Check-in válido", "QR expirado"
      e "Check-in repetido".

## 6. Conclusão e certificados

- [x] 6.1 `ApuracaoConclusaoService` (frequência ≥ mínima; ponto de extensão para nota, D4);
      verificar com testes unitários os cenários "Apuração pela frequência mínima" e "Frequência
      insuficiente", incluindo turma sem nenhuma aula agendada (não pode dividir por zero).
- [x] 6.2 CRUD de modelos de certificado: placeholders permitidos, sanitização, logotipo e até
      três assinaturas, modelo padrão do tenant (D9); verificar o cenário "Campo dinâmico
      inválido".
- [x] 6.3 Emissão: código Crockford base32 com nova tentativa em colisão, snapshot congelado
      em `dados`, escolha do modelo (curso/formação → padrão) e pendência sem modelo (D8, D10).
      Verificar os cenários "Emissão ao concluir" e "Alteração posterior do curso".
- [x] 6.4 Encerramento da turma em transação (apuração, cancelamento de pendentes e fila,
      emissão, imutabilidade posterior) + endpoint "emitir certificados pendentes"; verificar o
      cenário "Encerramento antes da última aula" e que presenças ficam imutáveis depois.
- [x] 6.5 Conclusão de formação após o encerramento, com certificado de formação somando as
      cargas horárias; verificar os cenários "Conclusão da formação" e "Optativo não é exigido".
- [x] 6.6 Download do PDF (Blade → dompdf, QR com a URL de validação), só para o próprio
      participante ou o Administrador e só se não estiver revogado; revogação com motivo.
      Verificar com teste que o PDF é gerado (content-type e assinatura `%PDF`) e o `403` para
      terceiros.

## 7. Validação pública

- [x] 7.1 `ValidacaoCertificadoService` + controller público (D7), com a resposta limitada à
      lista de campos da spec e status válido/revogado; verificar os cenários "Código válido",
      "Código inexistente", "Validação de certificado revogado" e "Órgão desabilitou o módulo".
- [x] 7.2 Teste de arquitetura: controllers em `Http/Controllers/Publico` só dependem de
      `ValidacaoCertificadoService`; teste funcional de que a resposta não contém nenhum campo
      fora da lista permitida.
- [x] 7.3 Teste do limite de requisições: a 31ª consulta no mesmo minuto recebe `429`.

## 8. SDK e frontend

- [x] 8.1 Contrato em `packages/sdk/src/modules/cursos` (`types.ts`, `client.ts`, `index.ts`)
      reexportado no índice do SDK; verificar com `npm run typecheck`.
- [x] 8.2 `apps/web-client/src/modules/cursos`: gestão de cursos, formações, turmas/aulas e
      modelos de certificado com primitivas `@sysgov/ui`, e dados técnicos em
      `font-mono tabular-nums`; verificar com testes Vitest dos formulários e o typecheck.
      *Nota*: acrescentado `GET /api/cursos/usuarios` (Administrador de Cursos) para escolher
      instrutores e inscrever participantes sem depender da permissão `users.manage`.
- [x] 8.3 Telas do instrutor: chamada por aula e QR de check-in em tela cheia, renovado a cada
      ~30s; verificar com teste Vitest da renovação (timers falsos).
- [x] 8.4 Área do participante: catálogo, inscrição, minhas inscrições (com posição na fila),
      frequência por aula e certificados; verificar com testes Vitest.
- [x] 8.5 Rotas fora do `ProtectedRoute`: `/validar-certificado/:codigo?` (pública) e
      `/cursos/check-in` (login preservando o token); verificar com teste de rota que a
      validação abre sem sessão.
      *Nota*: a `LoginPage` passou a aceitar `?voltar=` (só caminho relativo do app, contra
      redirecionamento aberto) para o check-in continuar depois do login.
- [x] 8.6 `module:register Cursos` e `npm run generate:registry`; verificar que o módulo aparece
      no Admin Suite e que o registry gerado contém a rota `cursos`.
      *Nota*: o `docker-entrypoint` registra o módulo no boot (catálogo, 7 permissões, menus admin e
      cliente). O gerador buscava o catálogo em `/api/admin/module-catalog/catalog` (exige
      platform-admin, dava 401) e caía sempre no fallback do filesystem; passou a usar a rota
      pública `/api/public/module-catalog/catalog`. Regenerado contra a API viva, o registry contém
      `cursos` e perdeu a entrada órfã `testmodule` (sem módulo no repositório).

## 9. Dados de demonstração e verificação final

- [x] 9.1 `CursosDadosDemonstracaoSeeder` (padrão do `LicitaDadosDemonstracaoSeeder`, via
      Services): um curso, um evento e uma formação, turmas em andamento e encerrada, fila de
      espera e certificados emitidos; verificar com teste do seeder.
- [x] 9.2 Suíte completa do backend (phpunit, Docker) e do frontend (Vitest + typecheck) verdes.
- [x] 9.3 Validação manual no navegador: inscrição até a lotação e fila, chamada, check-in por
      QR, encerramento, download do certificado e validação pública numa aba anônima.
      *Nota*: roteiro executado com Playwright (Chromium) sobre o Docker Compose e os dados de
      demonstração: participante entra na fila da turma lotada (3º); cancelamento de uma confirmada
      promove o 1º da fila e reordena os demais; QR da instrutora decodificado e aberto sem sessão
      (login com `?voltar=` e presença registrada; releitura informa "já registrada"; a chamada
      mostra "check-in por QR"); turma nova com aula no passado, inscrição direta, chamada e
      encerramento (1 concluída, 1 abaixo da frequência, 1 certificado); PDF A4 baixado com código e
      QR; validação pública em contexto anônimo para código válido e inexistente.
- [x] 9.4 Checklist de qualidade do `sysgov-module-scaffolding` (§9) revisado item a item, e
      `openspec validate add-cursos-fundacao --strict` sem erros.
