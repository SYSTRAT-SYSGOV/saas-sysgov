# Design: Fundação do módulo Gestão de Cemitérios

## Context

Motivação e escopo estão em `proposal.md`; requisitos em `specs/cemiterio/*/spec.md`, rastreados aos RF, RNF, RN
e CA do DRS SIGCM v1.0. Este documento cobre o **como**, ancorado no que existe hoje no repositório:

- **Módulos**: `apps/api/Modules/{Nome}` via `nwidart/laravel-modules`, cada um com `module.json`
  (permissões + menu), `RouteServiceProvider` próprio e scaffolding por `php artisan make:module`.
- **Prefixo de rotas**: `api/{modulo}` (ex.: `api/capd`, `api/licita`, `api/finance`) com middlewares
  `auth:sanctum`, `tenant`/`resolve.tenant` e `module-access:{alias}`. Não há `/api/v1` na plataforma.
- **Tenant**: `ResolveTenant` lê `X-Tenant-Slug`/`X-Tenant-ID` e valida contra os tenants do usuário; modelos de
  negócio usam `App\Models\Concerns\TenantAware`. O município é o tenant.
- **Perfis**: papéis com escopo de tenant (`roles.tenant_id`, `scope=tenant`) e permissões agrupadas por módulo,
  já administráveis no `web-client` em `modules/access/evolution/RolesManagement.tsx`.
- **Auditoria**: `App\Support\AuditLogger` grava `audit_logs` com hash encadeado (`hash`, `prev_hash`) — atende
  à auditoria append-only (RNF-08). O `operations_log` do modelo de dados do DRS corresponde a essa tabela.
- **Outros utilitários**: `App\Support\Money` (centavos inteiros), `OutboxPublisher` + comando `ProcessOutbox`.
- **Infra**: MySQL, Redis para cache e fila. **Testes**: PHPUnit em sqlite `:memory:` — sem funções espaciais.
- **Inéditos na plataforma**: tipos/índices espaciais, mapa com imagem de satélite, login Gov.br e portal
  público anônimo com dados de negócio.
- **Premissas do DRS confirmadas pelo time**: P01 falsa (sem levantamento topográfico — geometrias desenhadas
  sobre satélite); P03 falsa (sem API de ERP — guias próprias e baixa manual; RF-24 fora da v1).
- **Legado** `SYS_CEMITERIO`: nada a portar — nem código nem dados (começar do zero).
- **Divergências do DRS com decisões já tomadas**: RNF-05 e RF-18 pedem PostgreSQL/PostGIS e RNF-03 cita índice
  GiST — substituídos por MySQL 8 espacial com `SPATIAL INDEX` (ADR-001); RNF-10 pede JWT — RBAC por
  policies/Sanctum, com JWT apenas no `id_token` do Gov.br.

## Goals / Non-Goals

**Goals:**
- Módulo `Cemiterio` 100% aditivo, isolado por tenant, com testes de isolamento desde a fase 1.
- Todas as regras legais lendo parâmetros versionados do tenant (ADR-003).
- GIS em MySQL 8 nativo com validação métrica correta (metros) e consultas com índice espacial (ADR-001).
- Cadastro geográfico viável sem topografia: desenho sobre satélite + geração de jazigos em grade.
- Chamadas externas (índice IPCA, e-mail) sempre assíncronas, fora do ciclo da requisição.

**Non-Goals:**
- Extrair o módulo como microsserviço (ADR-002).
- Integração com ERP municipal/DAM (RF-24) e registro bancário de boletos na v1.
- Migração de dados do legado `SYS_CEMITERIO`.
- Editor GIS avançado (CAD, importação de shapefile, georreferenciamento de plantas).
- Tela nova de perfis: reutiliza-se a gestão de perfis existente do `web-client`.

## Decisions

### D1. Estrutura do módulo
`php artisan make:module Cemiterio` (alias `cemiterio`, `requires: ["Admin"]`). Subpastas por subdomínio só
dentro de `Services/` (`Inventario`, `Operacoes`, `Concessoes`, `Gis`, `Financeiro`, `Portal`, `Empreiteiros`,
`Vistoria`); controllers, requests, resources e policies ficam nas pastas padrão do módulo. Sem interfaces para
serviços com uma única implementação. *Alternativa descartada*: um módulo por subdomínio — excesso de
`module.json`/providers para um domínio coeso com transações cruzadas (jazigo ↔ concessão ↔ inumação).

### D2. Modelo de dados
Todas as tabelas: `id` (bigint), `tenant_id` (FK, primeira coluna de todo índice composto/único), `created_at`,
`updated_at`; tabelas de negócio com `deleted_at` (soft delete, RNF-08). Tabelas de histórico **sem**
`updated_at`/`deleted_at`. Nomes das tabelas-chave seguem o DRS §9.

| Tabela | Principais colunas | Índices / restrições |
|---|---|---|
| `cemetery_settings` | vigencia_inicio, prazo_exumacao_adulto_anos, prazo_exumacao_crianca_anos, idade_limite_crianca, distanciamento_min_m (decimal 5,2), tumulo_max_comprimento_m, tumulo_max_largura_m, edital_prazo_dias, obras_simultaneas_max, notificacao_antecedencia_dias, suspensoes_para_cancelamento, concessao_temporaria_anos, srid_metrico, instrucoes_pagamento, chave_pix, autor_id | único (`tenant_id`, `vigencia_inicio`) — append-only |
| `cemetery_parks` | codigo, nome, endereco, tipo, situacao, responsavel | único (`tenant_id`, `codigo`) |
| `cemetery_sectors` | park_id, codigo, descricao, tipo_zona, area_m2 | único (`tenant_id`, `park_id`, `codigo`) |
| `plot_inventory` | sector_id, park_id (denormalizado), codigo, tipo, capacidade, ocupacao, estado, estado_anterior, comprimento_m, largura_m, lat, lng (centroide), `lock_version` | único (`tenant_id`, `park_id`, `codigo`); (`tenant_id`, `estado`) |
| `cemetery_geometries` | geometriavel_type (park/sector/plot), geometriavel_id, `geom POLYGON NOT NULL SRID 4326` | `SPATIAL INDEX(geom)`; único (`tenant_id`, type, id) |
| `plot_state_history` | plot_id, de, para, motivo, origem (operação/manual), autor_id, ocorrido_em | (`tenant_id`, `plot_id`, `ocorrido_em`) — append-only |
| `deceased_records` | nome, nome_normalizado, nascimento, falecimento, idade_obito, certidao_numero, certidao_cartorio, certidao_arquivo, `causa_morte` (cifrado), `docs_medicos` (cifrado) | FULLTEXT ngram (`nome_normalizado`); (`tenant_id`, `certidao_numero`) |
| `burials` | deceased_id, plot_id, tipo, sepultado_em, situacao, origem (regular/histórico), livro_referencia, revisao_pendente, carencia_desde, service_order_id | (`tenant_id`, `plot_id`, `situacao`) |
| `exhumations` | burial_id, tipo (ordinária/judicial/administrativa), prazo_aplicado_anos, liberada_em, situacao, motivo_suspensao, service_order_id | (`tenant_id`, `situacao`) |
| `judicial_exceptions` | exhumation_id, processo, juizo, data_decisao, arquivo, prazo_contornado, autor_id | append-only |
| `transfers` | burial_id, plot_origem_id, plot_destino_id (nulo se externo), destino_externo, situacao, service_order_id | (`tenant_id`, `situacao`) |
| `service_orders` | ano, numero, tipo (inumação/exumação/trasladação/demolição), agendada_para, equipe, situacao, executada_por, executada_em | único (`tenant_id`, `ano`, `numero`) |
| `concession_holders` | nome, tipo_doc, `documento` (cifrado), `documento_hash` (HMAC), `email`/`telefone` (cifrados), endereco, base_legal | único (`tenant_id`, `documento_hash`) |
| `concessions` | numero, plot_id, holder_id, modalidade, inicio, termino (nulo se perpétua), situacao (vigente/expirada/extinta), notificado_ciclo_em, sujeita_taxa_anual | único (`tenant_id`, `numero`); (`tenant_id`, `situacao`, `termino`); no máx. 1 vigente por jazigo (validado em transação com `lock_version`) |
| `price_items` | servico, valor_centavos (bigint), vigencia_inicio, vigencia_fim | (`tenant_id`, `servico`, `vigencia_inicio`) |
| `price_adjustments` | indice, competencia, percentual (decimal 7,4), origem (automatica/manual), autor_id | único (`tenant_id`, `competencia`) |
| `charges` (guias) | numero, origem (morph: concessão/operação/alvará), contribuinte, exercicio, servico, valor_centavos, vencimento, situacao (emitida/paga/cancelada), original_id (2ª via), pago_em, valor_pago_centavos, comprovante_arquivo, baixado_por | único (`tenant_id`, `numero`); único (`tenant_id`, origem, `servico`, `exercicio`) para taxa anual; (`tenant_id`, `situacao`, `vencimento`) |
| `contractors` | tipo_doc, `documento` (cifrado) + `documento_hash`, nome, responsavel_tecnico, situacao (apto/inapto/suspenso/cancelado) | único (`tenant_id`, `documento_hash`) |
| `contractor_licenses` | contractor_id, numero, validade, arquivo | (`tenant_id`, `contractor_id`, `validade`) |
| `work_permits` (alvarás de obra) | contractor_id, plot_id, descricao, comprimento_m, largura_m, prazo_fim, situacao | (`tenant_id`, `contractor_id`, `situacao`) |
| `contractor_penalties` | contractor_id, tipo, inicio, fim, motivo, arquivo | (`tenant_id`, `contractor_id`) |
| `inspections` / `inspection_photos` | plot_id, vistoriador_id, estado_conservacao, risco, obs / arquivo, capturada_em | (`tenant_id`, `plot_id`) |
| `abandonment_processes` | plot_id, concession_id, inspection_id, instaurado_em, edital_publicado_em, prazo_dias_aplicado, prazo_fim, situacao, decisao, demolicao_order_id | (`tenant_id`, `situacao`) |

Arquivos (certidões, mandados, fotos, comprovantes, PDFs) vão para disco privado, particionado por tenant, com
download via rota autorizada. `burials.carencia_desde` guarda o início da contagem (sepultamento ou último
reinício por suspensão — RF-10).

### D3. Geometrias: SRID 4326 em tabela separada, validação métrica em UTM
- **Separada** (`cemetery_geometries`) porque índice espacial no MySQL exige coluna `NOT NULL` com SRID fixo, e
  jazigos podem existir antes de serem desenhados.
- **SRID 4326** para armazenamento/índice (o índice só é usado com SRID fixo por coluna).
- **Validação métrica**: no caminho de escrita, `ST_Transform(geom, srid_metrico_do_tenant)` (SIRGAS 2000/UTM)
  e então `ST_Contains`, `ST_Intersects` e `ST_Distance` (RN-07) em metros; dimensões (RN-08) pelas arestas do
  quadrilátero transformado. Vizinhos candidatos filtrados antes por `MBRIntersects` (índice) e `tenant_id`.
- **Leitura do mapa**: `MBRIntersects(geom, bbox 4326)` + `tenant_id`, GeoJSON via `ST_AsGeoJSON`, cacheado no
  Redis por camada/bbox e invalidado na edição (RNF-07). Ordem de eixos lat/long do MySQL tratada num único
  ponto do serviço GIS.
- **Geração em grade**: calculada no serviço GIS em coordenadas UTM (origem, vetor de orientação, linhas ×
  colunas, dimensões, espaçamento), convertida para 4326 e gravada em lote numa transação; jazigos fora do setor
  são descartados e listados na resposta. Garante RN-07/RN-08 por construção, e cada polígono ainda passa pela
  validação topológica.
- *Alternativas*: PostGIS (ADR-001); armazenar em UTM por tenant (quebra o SRID único por coluna).

### D4. Mapa no frontend
Leaflet + `react-leaflet` (compatível com React 19) para renderização e **Leaflet-Geoman** para desenhar e
editar polígonos. Camada base de satélite/ruas de provedor configurável por ambiente: padrão **Google Maps** via
Map Tiles API (sessão de tiles criada pelo backend; a chave usada nas URLs de tiles é restrita por domínio de
origem e à Map Tiles API no console do provedor),
com Esri World Imagery ou Mapbox como alternativas por configuração. *Alternativa descartada*: SDK JavaScript do
Google Maps com `@vis.gl/react-google-maps` — prende a UI ao provedor e sua biblioteca de desenho foi
descontinuada; com Leaflet a troca de provedor é só configuração. Link "Como chegar" do portal usa a URL
pública de rotas do Google Maps com o centroide do cemitério (sem API).

### D5. Máquina de estados do jazigo
Enum PHP `EstadoJazigo` com tabela de transições permitidas e um único serviço que aplica transições,
gravando `plot_state_history` e auditoria. Transições para Ocupado/Capacidade Máxima derivam de `ocupacao` vs
`capacidade` após cada operação (inclusive cancelamento). Sem pacote de state machine — grafo pequeno e fixo.

### D6. Concorrência
Optimistic locking em `plot_inventory.lock_version` (RNF-06): `UPDATE ... WHERE id=? AND lock_version=?`; 0
linhas → **409**. Operações que tocam jazigo + concessão/inumação rodam em `DB::transaction`. `ocupacao` é
contador mantido na mesma transação (não editável via API) com comando de reconciliação contra `burials`.

### D7. Parâmetros versionados
`cemetery_settings` append-only por vigência; leitura "vigente em data X" cacheada no Redis por tenant,
invalidada ao gravar nova versão. Cada operação persiste o valor aplicado. Faixas legais em
`Modules/Cemiterio/Config/config.php`, usadas pelo Form Request. Seed de referência na habilitação do módulo.

### D8. Contratos de API
Prefixo autenticado **`api/cemiterio`**, middlewares `['api','auth:sanctum','resolve.tenant',
'module-access:cemiterio']`, API Resources, erros de regra em 422 com `code` legível
(`jazigo.capacidade_maxima`, `exumacao.prazo_nao_decorrido` + `liberada_em`), 409 para conflito de versão.

| Recurso | Endpoints |
|---|---|
| Parâmetros | `GET/POST /parametros` (POST cria nova vigência) |
| Cemitérios/Setores/Jazigos | `apiResource` para `parques`, `parques.setores`, `jazigos`; `POST /jazigos/{id}/estado`; `GET /jazigos/{id}/historico` |
| GIS | `GET /gis/camadas?bbox=&camada=`; `PUT /gis/geometrias/{tipo}/{id}`; `POST /gis/setores/{id}/gerar-grade`; `GET /gis/mapa-base/sessao`; `GET /busca?q=` |
| Falecidos/Operações | `apiResource falecidos`; `POST /inumacoes`, `POST /inumacoes/historicas`, `POST /inumacoes/{id}/revisar`, `POST /inumacoes/{id}/cancelar`; `POST /exumacoes` (ordinária/judicial); `POST /trasladacoes`; `POST /ordens-servico/{id}/{iniciar,concluir,suspender,cancelar}`; `GET /ordens-servico/{id}/pdf` |
| Concessões | `apiResource concessionarios`, `apiResource concessoes`; `POST /concessoes/{id}/renovar` |
| Financeiro | `apiResource precos`; `POST /precos/reajustes` (manual); `GET /guias`; `GET /guias/{id}/pdf`; `POST /guias/{id}/segunda-via`; `POST /guias/{id}/baixa`; `POST /guias/lote-anual`; `GET /relatorios/inadimplencia` |
| Empreiteiros | `apiResource empreiteiros`; `POST /empreiteiros/{id}/alvaras`; `POST /empreiteiros/{id}/penalidades`; `apiResource alvaras-obra` |
| Vistoria/Abandono | `apiResource vistorias` (multipart fotos); `apiResource processos-abandono`; `POST /processos-abandono/{id}/{edital,manifestacao,decisao}` |
| Restritos | `GET /falecidos/{id}/dados-restritos` (permissão própria + auditoria de leitura) |

**Público** (sem auth, `throttle:cemiterio-publico`): `api/public/cemiterio/{tenantSlug}/falecidos?q=`,
`.../jazigos/{codigo}/mapa`. O slug só seleciona dados públicos de tenants com portal habilitado — não concede
autorização.

**Portal do concessionário**: `api/portal/cemiterio/{tenantSlug}/...` com guard próprio (`concessionario`,
Sanctum) emitido após o callback Gov.br; policies filtram pelo concessionário autenticado.

### D9. Integrações externas
- **Gov.br** (RF-27): OIDC authorization code + PKCE; backend troca o código, valida `id_token` (JWKS), extrai CPF
  e procura `concession_holders.documento_hash` no tenant. Um controller com o cliente HTTP do Laravel.
- **Índice IPCA** (RF-21): API pública SGS do Banco Central (série 433, variação mensal), acumulado de 12 meses
  calculado no job. Chamado só por comando agendado/job, nunca por controller.
- **Mapa base** (D4): Google Map Tiles API (ou alternativa configurada).
- **E-mail/notificações**: jobs em fila Redis.
- **Sem ERP** (P03 falsa): nenhuma integração de DAM na v1.

### D10. Eventos, jobs e agendamentos
Eventos com consumidor real: `ConcessaoExpirada`, `ConcessaoRenovada` (→ guia), `InumacaoConfirmada`/
`InumacaoCancelada`/`RemocaoConcluida` (→ recalcular estado), `EmpreiteiroCancelado`, `ConcessaoExtinta`
(→ OS de demolição). Agendamentos registrados pelo service provider do módulo, fuso `America/Sao_Paulo` (Q8),
idempotentes e com `withoutOverlapping()`:

| Comando | Frequência | Efeito |
|---|---|---|
| `cemiterio:expirar-concessoes` | diário 00:30 | RF-14 |
| `cemiterio:notificar-vencimentos` | diário 07:00 | RF-12, uma vez por ciclo |
| `cemiterio:reajustar-precos` | anual, 1º/dez 02:00 (+ novas tentativas diárias até 31/dez se falhar) | RF-21 |
| `cemiterio:gerar-guias-anuais` | 1º/jan 01:00 (+ manual) | RF-22 |
| `cemiterio:atualizar-aptidao` | diário 00:45 | alvarás anuais vencidos, fim de suspensões, obras vencidas |
| `cemiterio:liberar-remocoes` | diário 01:30 | remoções pendentes cujo prazo legal venceu |

### D11. LGPD, sigilo e auditoria (ADR-004)
- Cast `encrypted` para `causa_morte`, `docs_medicos`, `documento`, `email`, `telefone` (RNF-09); coluna
  `*_hash` (HMAC-SHA256 com chave dedicada) para unicidade e busca exata de CPF/CNPJ (RF-17).
- Causa da morte/documentos médicos (RN-06) só no endpoint `dados-restritos`, com leitura auditada.
- CPF mascarado nos Resources de listagem; nunca no portal público (CA-03).
- Todas as mutações chamam `AuditLogger`. `judicial_exceptions`, `plot_state_history` e `cemetery_settings`
  lançam exceção em `updating`/`deleting` e não têm rotas de alteração.

### D12. Permissões e perfis padrão
Permissões no `module.json`: `cemiterio.view`, `cemiterio.inventario.manage`, `cemiterio.gis.edit`,
`cemiterio.operacoes.create`, `cemiterio.operacoes.historico`, `cemiterio.operacoes.executar`,
`cemiterio.exumacao.judicial`, `cemiterio.concessoes.manage`, `cemiterio.financeiro.manage`,
`cemiterio.financeiro.reajuste`, `cemiterio.empreiteiros.manage`, `cemiterio.vistoria.create`,
`cemiterio.abandono.manage`, `cemiterio.parametros.manage`, `cemiterio.dados-restritos.view`,
`cemiterio.auditoria.view`.

Perfis padrão criados por tenant na habilitação (papéis `scope=tenant`, editáveis na Gestão de Perfis do
`web-client`, sem tela nova):

| Perfil (DRS §4) | Permissões padrão |
|---|---|
| Administrador Geral | todas as `cemiterio.*` |
| Operador Administrativo | view, inventario.manage, operacoes.create, operacoes.historico, concessoes.manage, empreiteiros.manage |
| Fiscal de Campo | view, vistoria.create, abandono.manage, gis.edit (alteração de status) |
| Coveiro/Operacional | view, operacoes.executar |
| Financeiro | view, financeiro.manage, financeiro.reajuste |

Concessionário usa o guard do portal (Gov.br); Público em Geral usa as rotas públicas.

### D13. Frontend
- `apps/web-client/src/modules/cemiterio` lazy-loaded; serviços de API separados das telas; componentes
  exclusivamente de `@sysgov/ui` (primitivos faltantes, como `Drawer` para o painel lateral, entram em
  `packages/ui`). Números, códigos, datas e valores em `font-mono tabular-nums`. Telas de vistoria e OS
  responsivas para uso em celular (personas João e coveiro).
- Portal público/concessionário: rotas públicas do `web-client` fora do shell autenticado, com white-label do
  tenant.
- Regenerar `moduleRegistry.generated.ts` após criar o módulo.

### D14. Busca aproximada
`nome_normalizado` (minúsculas, sem acentos) + índice FULLTEXT com parser `ngram`, ordenação por relevância e
filtros por ano/cemitério (RF-25). *Alternativa*: Scout + Meilisearch — descartada na v1 (infra nova).

### D15. Testes
- Regras de negócio, isolamento de tenant e prazos rodam na suíte atual (sqlite).
- Testes de GIS e FULLTEXT marcados `#[Group('mysql')]` e ignorados fora de MySQL; job de CI com MySQL 8.
- APIs externas (BCB, Gov.br, tiles) sempre simuladas com `Http::fake`.
- Testes de concorrência (`lock_version`) e de idempotência de cada comando agendado.

## Risks / Trade-offs

- [Imagem de satélite tem precisão de metros, abaixo da exigida por RN-07 (0,50 m)] → jazigos gerados em grade
  garantem o espaçamento relativo; a posição absoluta é aproximada e documentada como tal ao usuário.
- [Custo/cota e termos de uso da API do Google Maps] → provedor configurável; cache de tiles no navegador;
  alternativa Esri/Mapbox por configuração (Q9).
- [API do Banco Central indisponível no fim do ano] → novas tentativas diárias em dezembro + reajuste manual.
- [Ordem de eixos lat/long do MySQL em SRID 4326] → conversão centralizada com teste de ida e volta.
- [`ST_Transform`/FULLTEXT ngram só em MySQL] → grupo `mysql` + CI MySQL.
- [`AuditLogger` lê `prev_hash` global sem lock] → risco pré-existente da plataforma; reportar ao time de
  plataforma.
- [Portal anônimo expõe dado de negócio] → Resource público com lista branca, throttle e teste que falha se
  campo restrito aparecer.
- [Baixa manual sujeita a erro humano] → comprovante obrigatório, auditoria e estorno só por nova operação
  auditada.
- [Contador `ocupacao` divergir] → mesma transação + comando de reconciliação.

## Migration Plan

1. Migrations aditivas e reversíveis; nenhuma tabela existente é alterada.
2. Habilitação por tenant via catálogo de módulos/`module-access`: seed de parâmetros, permissões e perfis padrão.
3. Sem migração de dados legados. Carga inicial feita pelo próprio município: desenho de cemitérios/quadras no
   mapa, geração de jazigos em grade e lançamento retroativo dos livros físicos (marcados para revisão).
4. Rollback: desabilitar o módulo para o tenant (dados preservados); `migrate:rollback` do módulo só em ambiente
   sem dados reais.

## Open Questions

1. ~~Migração do legado~~ — **Resolvida (2026-09-22)**: começar do zero.
2. **Parametrização municipal**: valores exatos de prazos legais, dimensões e taxas de cada município piloto e
   a legislação de referência (bloqueia a homologação; a implementação usa os valores de referência).
3. ~~ERP municipal~~ — **Resolvida (2026-09-22)**: não há API; guias próprias e baixa manual; RF-24 fora da v1.
4. ~~Levantamento topográfico~~ — **Resolvida (2026-09-22)**: mapa sobre Google Maps ou similar; geometrias
   desenhadas no sistema.
5. ~~Perfis~~ — **Resolvida (2026-09-22)**: perfis padrão do módulo criados por tenant e geridos no `web-client`
   (D12).
6. ~~Versionamento de API~~ — **Resolvida (2026-09-22)**: `api/cemiterio`, convenção atual da plataforma.
7. ~~Matriz RF~~ — **Resolvida (2026-09-22)**: DRS recebido; rastreabilidade aplicada nas specs.
8. **Fuso por tenant**: todos os municípios usam `America/Sao_Paulo`? (afeta o horário dos agendamentos).
9. **Conta do provedor de mapas**: quem contrata e paga a chave da Google Maps Platform (SYSTRAT centralmente ou
   cada município)? Não muda o design — a chave é configuração de ambiente.

## Notas de implementação (ajustes durante o apply)

- **Alias `cemiterios`** (não `cemiterio`): a plataforma já tinha o módulo `cemiterios` no catálogo
  (`ModuleCatalogSeeder`), a permissão `cemiterios.view`, a rota `/cemiterios` no menu e a tela provisória
  `apps/web-client/src/modules/cemiterios`. Para não duplicar o módulo, o backend fica em `Modules/Cemiterios`,
  as rotas em `api/cemiterios/*`, as permissões em `cemiterios.*` e os comandos em `cemiterios:*`.
- **Prefixo `cemetery_`** nas tabelas de nome genérico (`cemetery_service_orders`, `cemetery_burials`,
  `cemetery_exhumations`, `cemetery_transfers`, `cemetery_charges`, `cemetery_contractors`, `cemetery_inspections` etc.):
  `transfers` já existia no módulo Finance. Mantidos os nomes do DRS (`cemetery_parks`, `cemetery_sectors`,
  `plot_inventory`, `concessions`, `deceased_records`).
- **D3 — validação topológica em PHP**: contenção, sobreposição, distanciamento (RN-07) e dimensões (RN-08) são
  calculados em PHP num plano métrico local (projeção equiretangular centrada no cemitério — erro de centímetros na
  escala de um cemitério), o que as torna testáveis na suíte sqlite. O MySQL espacial (`geom` + `SPATIAL INDEX`)
  fica para as consultas do mapa; a tabela também guarda a caixa delimitadora (`min/max_lat/lng`) para pré-filtro de
  vizinhos em qualquer banco. O parâmetro `srid_metrico` deixou de ser necessário.
- **D5 — estado derivado**: fora de Em Ruína/Manutenção (só manual), o estado é derivado de ocupação × capacidade e
  da concessão vigente. Isso inclui transições diretas como Concedido→Capacidade Máxima em jazigo de capacidade 1.
- **D7 — seed de parâmetros**: os valores de referência são gravados na primeira leitura dos parâmetros do tenant
  (primeiro uso após a habilitação), sem acoplar o módulo Admin.
- **D14 — testes MySQL**: a trava `Tests/Concerns/GuardAgainstRealDatabase.php` aceita MySQL somente com
  `TESTS_ALLOW_MYSQL=1` e banco `*_testing`; o job `api-mysql` do CI roda `phpunit --group mysql`.
