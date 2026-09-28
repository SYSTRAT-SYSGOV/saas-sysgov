# Tasks

> Convenções: cada tarefa cita a spec (`spec: <capacidade> › <requisito>`) e os RF/RN/RNF/CA do DRS que atende.
> Backend verificado com `vendor/bin/phpunit` (sqlite) e, no grupo `mysql`, com MySQL 8. APIs externas sempre
> simuladas com `Http::fake` nos testes.

## 0. Pré-requisitos

- [x] 0.1 Adicionar job de CI com MySQL 8 que roda `vendor/bin/phpunit --group mysql`; verificar com um teste trivial de `ST_AsGeoJSON` passando no CI e sendo ignorado no sqlite local

## 1. Fundação e CRUDs de inventário (DRS Fase 1)

- [x] 1.1 Criar o módulo com `php artisan make:module Cemiterio` (alias `cemiterio`, `requires: ["Admin"]`); verificar que o teste de isolamento gerado passa e que nenhum arquivo de outro módulo foi alterado (`git diff --stat` só em `Modules/Cemiterio`)
- [x] 1.2 Declarar permissões (design D12) e menu no `module.json`; verificar com `npm run generate:registry` que o módulo aparece em `moduleRegistry.generated.ts`
- [x] 1.3 Implementar `cemetery_settings` versionado + leitura "vigente em data" com cache Redis + seed de referência na habilitação + faixas legais em `Config/config.php` (spec: parametros › todos; RN-01, RN-02, RN-07..RN-10); verificar com testes: seed de referência, rejeição de edital = 5 dias, não retroatividade, 403 sem `cemiterio.parametros.manage`, isolamento A/B
- [x] 1.4 Seed dos 5 perfis padrão por tenant (Administrador Geral, Operador Administrativo, Fiscal de Campo, Coveiro/Operacional, Financeiro) conforme D12, como papéis `scope=tenant` (spec: privacidade-auditoria › Perfis padrão do módulo; DRS §4); verificar que aparecem e são editáveis na Gestão de Perfis do `web-client` e com teste de matriz perfil × endpoint (Coveiro recebe 403 ao criar concessão)
- [x] 1.5 Registrar grupos de rotas `api/cemiterio`, `api/public/cemiterio/{tenantSlug}` e `api/portal/cemiterio/{tenantSlug}` no `RouteServiceProvider`; verificar com `php artisan route:list --path=cemiterio`
- [x] 1.6 CRUD de cemitérios e setores (migrations, models `TenantAware` + soft delete, Form Requests, Policies, Resources, auditoria) (spec: inventario › Cadastro de cemitérios, Cadastro de setores e quadras; RF-01, RF-02); verificar com testes de unicidade de código por tenant, 404 para cemitério de outro tenant e bloqueio de exclusão com jazigos ocupados
- [x] 1.7 CRUD de jazigos com enum de estados, serviço único de transição e `plot_state_history` (spec: inventario › Cadastro de jazigos, Máquina de estados, Histórico; RF-03, RF-04, RF-19); verificar com teste de todas as transições permitidas e de rejeição das não listadas
- [x] 1.8 Optimistic locking via `lock_version` com resposta 409 (spec: inventario › Alocação concorrente; RNF-06); verificar com teste que simula duas atualizações com a mesma versão e só uma efetiva
- [x] 1.9 Telas de inventário no `web-client` (lista, formulário, detalhe com histórico) usando apenas `@sysgov/ui`; verificar com `npm run typecheck` e teste vitest do serviço de API

## 2. Inumação e exumação (DRS Fase 2)

- [x] 2.1 Cadastro de falecidos (`deceased_records`) com cálculo de idade no óbito, `nome_normalizado` e casts `encrypted` para causa da morte/docs médicos (spec: operacoes › Registro de falecido; privacidade-auditoria › Sigilo; RF-06; RN-06; RNF-09); verificar que o valor no banco está cifrado e que o Resource padrão não expõe os campos
- [x] 2.2 Endpoint `dados-restritos` com permissão `cemiterio.dados-restritos.view` e auditoria de leitura (RN-06); verificar 403 sem permissão e criação do registro de auditoria de leitura
- [x] 2.3 Ordens de serviço (inumação, exumação, trasladação, demolição) com numeração por tenant/ano, transições, confirmação de execução pelo Coveiro e PDF (spec: operacoes › Ordem de serviço; RF-07); verificar numeração independente entre tenants, download do PDF e confirmação por usuário do perfil Coveiro
- [x] 2.4 Inumação com certidão obrigatória e única, bloqueio em Capacidade Máxima/Manutenção, ocupação e estado atualizados **na confirmação**, início da carência e cancelamento que desfaz a ocupação (spec: operacoes › Inumação; inventario › Bloqueio de sepultamento; RF-05, RF-06, RF-07; UC-01; CA-01); verificar com testes de cada cenário, incluindo jazigo Ocupado logo após a confirmação e reversão no cancelamento
- [x] 2.5 Lançamento de inumação histórica (livro/folha, certidão opcional, sem OS, `revisao_pendente`) e ação de revisão (spec: operacoes › Lançamento de inumação histórica; objetivo O1); verificar que não gera OS, atualiza ocupação e só sai de pendente com a revisão
- [x] 2.6 Exumação ordinária com prazo adulto/criança lido dos parâmetros vigentes, contado de `carencia_desde`, persistindo `prazo_aplicado_anos` e retornando 422 com `liberada_em` sem emitir OS (spec: operacoes › Bloqueio de exumação por prazo legal; RF-08; RN-01, RN-02; UC-02; CA-02); verificar testes de limite (dia anterior/dia do prazo) para adulto e criança e parâmetros diferentes em dois tenants
- [x] 2.7 Exumação judicial com permissão `cemiterio.exumacao.judicial`, mandado anexado e `judicial_exceptions` append-only + auditoria (spec: operacoes › Exumação por determinação judicial; RF-09; RN-03); verificar que update/delete do registro lançam exceção e que falta de arquivo retorna 422
- [x] 2.8 Suspensão em campo com motivo obrigatório, sem alterar ocupação, reiniciando a carência (`carencia_desde` = data da suspensão) (spec: operacoes › Suspensão da exumação em campo e reinício da carência; RF-10); verificar nova data de liberação 10/03/2030 para suspensão de adulto em 10/03/2027 com prazo de 3 anos
- [x] 2.9 Trasladação interna/externa em transação única (spec: operacoes › Trasladação); verificar rollback completo quando o destino está lotado
- [x] 2.10 Telas de inumação (inclusive histórica), exumação e ordens de serviço no `web-client`, com OS utilizável em celular e sem `alert`/`confirm` nativos (`Modal` do `@sysgov/ui`); verificar com `npm run typecheck` e vitest

## 3. Concessões

- [x] 3.1 Cadastro de concessionários com validação de CPF/CNPJ, cifragem, `documento_hash` único por tenant e CPF mascarado em listagens (spec: concessoes › Cadastro de concessionário; privacidade-auditoria › Proteção LGPD; RF-11; RN-05); verificar com testes de DV inválido, duplicidade e máscara
- [x] 3.2 Concessão temporária/perpétua com número único, no máximo uma vigente por jazigo e transição Disponível→Concedido (spec: concessoes › Concessão temporária e perpétua; RF-11); verificar concessão concorrente (409) e perpétua sem término
- [x] 3.3 Comando `cemiterio:expirar-concessoes` idempotente, com pendência de regularização para jazigo com restos (spec: concessoes › Expiração automática; RF-14); verificar executando duas vezes no teste sem duplicidade
- [x] 3.4 Renovação com geração de guia pelo preço vigente (spec: concessoes › Renovação; RF-13); verificar nova data de término e guia criada (depende de 5.1 e 5.3)
- [x] 3.5 Comando `cemiterio:notificar-vencimentos` (antecedência do parâmetro, uma vez por ciclo, job em fila) (spec: concessoes › Notificação antes do término; RF-12); verificar com `Queue::fake` e reexecução sem reenvio
- [x] 3.6 Telas de concessionários e concessões no `web-client`; verificar com `npm run typecheck` e vitest

## 4. GIS e mapas (DRS Fase 3)

- [x] 4.1 Migration de `cemetery_geometries` (`POLYGON NOT NULL SRID 4326` + `SPATIAL INDEX` no MySQL, caixa delimitadora em qualquer banco); verificar no grupo `mysql` que `EXPLAIN` do recorte por bbox usa o índice espacial
- [x] 4.2 Conversão GeoJSON ↔ geometria MySQL centralizada (ordem de eixos), rejeição de polígonos inválidos e cálculo de área do setor e centroide do jazigo (spec: gis › Desenho e edição de geometrias; inventario › setores e jazigos; RF-01..RF-03); verificar ida e volta, polígono auto-intersectante e área em m²
- [x] 4.3 Validação topológica: contenção setor/cemitério e jazigo/setor, não sobreposição, distanciamento (RN-07) e dimensões (RN-08) em metros, calculadas em PHP num plano métrico local (spec: gis › Validação topológica; RF-18); verificar os três cenários da spec na suíte sqlite
- [x] 4.4 Geração de jazigos em grade dentro do setor (origem, orientação, linhas × colunas, dimensões, espaçamento, padrão de código), com descarte dos que saem do setor (spec: gis › Geração de jazigos em grade; RN-07, RN-08); verificar criação de 10 × 20 jazigos válidos, recusa com espaçamento 0,30 m e ausência de códigos duplicados
- [x] 4.5 Endpoint de camadas por bbox com cache Redis invalidado na edição (spec: gis › Mapa interativo por camadas; RF-15; RNF-07); verificar que só jazigos do recorte e do tenant retornam e que a edição invalida o cache
- [x] 4.6 Endpoint de sessão do mapa base (Google Map Tiles API) com provedor configurável por ambiente (spec: gis › Mapa base de satélite; D4); verificar com `Http::fake` a criação da sessão e a troca de provedor por configuração
- [x] 4.7 Busca unificada (nome do falecido, código do jazigo, número da concessão, CPF por hash e nome do concessionário restritos por permissão) com envelope para zoom (spec: gis › Busca unificada com zoom; RF-17); verificar busca por CPF só para perfil autorizado
- [x] 4.8 Mapa no `web-client` com Leaflet + Geoman: camada base de satélite, camadas ligáveis, cores por estado (verde/vermelho/amarelo/azul/roxo) + legenda, desenho/edição de polígonos, assistente de geração em grade, busca com zoom animado e painel lateral de histórico (spec: gis › todos; RF-15, RF-16, RF-17, RF-19); verificar com vitest dos componentes e validação manual no navegador
- [x] 4.9 Teste de desempenho com 50.000 jazigos sintéticos: recorte de 2.000 jazigos abaixo de 1 s (spec: gis › Desempenho geoespacial; RNF-03); verificar com relatório do teste no grupo `mysql`

## 5. Financeiro (DRS Fase 4)

- [x] 5.1 Tabela de preços com vigências em centavos (`App\Support\Money`), cache Redis invalidado na alteração (spec: financeiro › Tabela de preços parametrizável; RF-20; RNF-07); verificar preço vigente por data e rejeição de mais de 2 casas decimais
- [x] 5.2 Comando `cemiterio:reajustar-precos` obtendo o IPCA acumulado de 12 meses da API SGS do Banco Central (série 433), aplicando nova vigência a partir de 1º/jan com arredondamento meio-para-cima, idempotente por competência, com notificação ao Financeiro em caso de falha e reajuste manual como alternativa (spec: financeiro › Reajuste anual automático pelo IPCA; RF-21); verificar com `Http::fake`: R$ 100,00 + 4,5% = R$ 104,50, falha da API sem alteração de preços e recusa de competência repetida
- [x] 5.3 Guias próprias (`charges`) com numeração por tenant, situações, PDF com instruções de pagamento/chave PIX do município (spec: financeiro › Guia de recolhimento própria; RF-22, RF-23; P03); verificar o conteúdo do PDF e o tratamento de guia vencida
- [x] 5.4 Comando `cemiterio:gerar-guias-anuais` (1º/jan + disparo manual) idempotente por concessão/exercício com relatório (spec: financeiro › Guias em lote; RF-22); verificar reprocessamento após falha parcial
- [x] 5.5 Segunda via vinculada à original (que passa a Cancelada), recusada para guia paga (spec: financeiro › Segunda via; RF-23); verificar os dois cenários
- [x] 5.6 Baixa manual de pagamento com comprovante obrigatório e auditoria, e relatório de inadimplência filtrável (spec: financeiro › Baixa manual de pagamento e inadimplência); verificar baixa com e sem comprovante e saída da guia do relatório
- [x] 5.7 Telas de preços, reajustes, guias, baixa e inadimplência no `web-client` (valores em `font-mono tabular-nums`); verificar com `npm run typecheck` e vitest

## 6. Portal público e do concessionário (DRS Fase 4)

- [x] 6.1 Resolução pública do tenant por slug apenas para municípios com portal habilitado (spec: portal › Identificação do município); verificar 404 para tenant sem portal e isolamento A/B
- [x] 6.2 Busca pública aproximada (FULLTEXT ngram + normalização) com Resource de lista branca, mínimo de 3 caracteres, paginação e throttle 429 (spec: portal › Busca pública, Proteção contra abuso; RF-25; RN-04; CA-03); verificar "joao da conceicao" encontrando "João da Conceição" (grupo `mysql`) e teste que falha se CPF ou causa da morte aparecer
- [x] 6.3 "Ver no Mapa" público somente leitura com link "Como chegar" (spec: portal › Ver no Mapa e rota; RF-26; UC-03); verificar que a resposta não traz estado nem dados de concessão e que o link aponta para o centroide do cemitério
- [x] 6.4 Login Gov.br (OIDC + PKCE, validação do `id_token`) e guard `concessionario` (spec: portal › Autenticação Gov.br; RF-27; P02); verificar com provedor OIDC simulado: CPF sem concessão recebe mensagem neutra
- [x] 6.5 Painel do concessionário: jazigos e concessões, guias pendentes/pagas com PDF e segunda via, sepultados, solicitação de renovação e consulta/correção dos próprios dados (spec: portal › Painel do concessionário; RF-28, RF-23; RN-05); verificar 404 ao acessar concessão de outro titular
- [x] 6.6 Telas públicas e do concessionário no `web-client` fora do shell autenticado, com white-label do tenant; verificar com `npm run typecheck`, vitest e navegação manual sem login

## 7. Empreiteiros e obras

- [x] 7.1 Cadastro de empreiteiros com documento cifrado/hash e alvará anual; comando `cemiterio:atualizar-aptidao` (spec: empreiteiros › Cadastro com alvará anual; RF-29); verificar passagem a inapto no vencimento
- [x] 7.2 Alvará de obra mediante solicitação, com empreiteiro apto, concessão vigente e dimensões ≤ parâmetros (spec: empreiteiros › Alvará de obra funerária; RF-30; RN-08); verificar recusa de 3,20 m × 2,10 m com máximo 3,00 m × 2,10 m
- [x] 7.3 Limite de obras pendentes simultâneas lido dos parâmetros (spec: empreiteiros › Limite de obras simultâneas; RF-31; RN-09); verificar recusa da terceira obra e liberação após conclusão
- [x] 7.4 Penalidades e cancelamento automático ao atingir o número parametrizado de suspensões, sinalizando obras pendentes (spec: empreiteiros › Penalidades e cancelamento; RF-32); verificar cenário da segunda suspensão
- [x] 7.5 Telas de empreiteiros, alvarás e penalidades no `web-client`; verificar com `npm run typecheck` e vitest

## 8. Vistoria e abandono

- [x] 8.1 Vistorias com fotos (disco privado por tenant), classificação de risco e transição opcional para Em Ruína/Manutenção (spec: vistoria-abandono › Registro de vistoria; RF-33); verificar rejeição sem foto e download só com autorização
- [x] 8.2 Instauração do processo de abandono condicionada a vistoria "em ruína" ou "indício de abandono", com notificação do concessionário (spec: vistoria-abandono › Instauração; RF-34); verificar recusa quando a última vistoria é "bom"
- [x] 8.3 Edital com prazo parametrizado (persistindo `prazo_dias_aplicado`) e bloqueio de decisão antes do fim (spec: vistoria-abandono › Edital de notificação; RF-35; RN-10); verificar recusa no 20º dia de um prazo de 30
- [x] 8.4 Manifestação/arquivamento e decisão final: concessão Extinta, OS de demolição, remoção pendente respeitando RN-01/RN-02 e comando `cemiterio:liberar-remocoes` (spec: vistoria-abandono › Manifestação e arquivamento, Extinção, demolição e reversão; RF-36); verificar concessão Extinta com OS de demolição e jazigo não Disponível enquanto a remoção estiver pendente
- [x] 8.5 Telas de vistoria (responsivas para celular) e processos de abandono no `web-client`; verificar com `npm run typecheck`, vitest e teste manual em viewport de celular

## 9. Verificação final

- [x] 9.1 Teste de isolamento cobrindo todas as tabelas do módulo (tenant A não lê/altera/referencia B) (spec: privacidade-auditoria › Isolamento por município); verificar com `vendor/bin/phpunit Modules/Cemiterio`
- [x] 9.2 Teste que percorre os endpoints de escrita e confirma `audit_logs` com cadeia de hash íntegra (spec: privacidade-auditoria › Auditoria append-only; RNF-08); verificar com `vendor/bin/phpunit --filter Auditoria`
- [ ] 9.3 Teste de carga com 500 usuários simultâneos: p95 < 250 ms em transações não espaciais e < 1 s nas espaciais (spec: privacidade-auditoria › Metas; RNF-01..RNF-04); verificar com relatório da ferramenta de carga anexado ao PR
- [ ] 9.4 Rodar `composer static`, `composer test`, `npm run typecheck` e `npm test` sem erros; verificar saída limpa
