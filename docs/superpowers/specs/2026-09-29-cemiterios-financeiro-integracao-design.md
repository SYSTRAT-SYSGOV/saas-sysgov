# Cemitérios — Evolução do Financeiro: Integração com ERP Financeiro da Prefeitura e Cadastro Único do Munícipe

**Data:** 2026-09-29
**Módulo:** `apps/api/Modules/Cemiterios`, `apps/web-client/src/modules/cemiterios`

## Contexto

O spec original do módulo (`openspec/changes/cemiterio-fundacao/specs/cemiterio/financeiro/spec.md`)
declarou explicitamente que a v1 **não** teria integração com ERP municipal
("premissa P03 falsa: RF-24 fora do escopo"): preços com vigência, reajuste anual por IPCA, guia
própria em PDF, lote anual, segunda via e baixa manual com comprovante — tudo hoje sem nenhum
sistema externo envolvido (`FinanceiroController`, `GuiaService`, `Guia` = tabela `cemetery_charges`).

Este design reverte essa premissa: a prefeitura já opera, fora do SYSGOV, (1) um ERP financeiro
próprio (arrecadação/tesouraria — ex.: Betha, e-Cidade, Sagres, GRP) e (2) um cadastro único de
munícipes. O Cemitérios precisa: emitir guias que o ERP da prefeitura reconheça e confirme o
pagamento de volta, e cadastrar concessionários/contribuintes com dados compatíveis com o
cadastro único municipal, consultando-o em vez de pedir tudo digitado manualmente.

Como cada prefeitura usa um fornecedor diferente e não temos acesso ao contrato de API de nenhum
deles, a integração segue o padrão já estabelecido no repositório para esse exato problema —
`Modules\Capd\Models\RhIntegracao` / `RhIntegrationService` (sincronização com o ERP de RH:
`driver` + `field_mappings` configuráveis por tenant, adapter genérico), `IcpBrasilAdapter`
(adapter plugável por provedor) e `PncpIntegrationService` (efeito externo sempre via Outbox,
nunca síncrono no controller). Não há adapters específicos por fornecedor (Betha, e-Cidade...) —
só o adapter HTTP genérico configurável, replicando a mesma decisão já tomada para o RH.

## Feature A — Cadastro do concessionário/contribuinte compatível com o cadastro único do munícipe

### Modelo de dados

Migration em `concession_holders` (model `Concessionario`), campos novos e opcionais (não quebra
dados existentes nem os que já leem `endereco` livre — esse campo continua existindo):

```
rg                    string nullable, encrypted (mesmo padrão de documento/email/telefone)
data_nascimento       date nullable
nome_mae              string nullable, encrypted
nis                   string nullable, encrypted   -- NIS/CadÚnico, quando houver
cep                   string(9) nullable
logradouro            string nullable
numero_endereco       string nullable
complemento_endereco  string nullable
bairro                string nullable
cidade                string nullable
uf                    string(2) nullable
cadastro_unico_ref    string nullable              -- id do munícipe no sistema externo
sincronizado_em       datetime nullable
fonte                 string default 'manual'      -- manual | cadastro_unico
```

Nova migration cria `cemetery_cadastro_unico_integracoes` (config por tenant, mesma forma de
`capd_rh_integracoes`):

```
id, tenant_id, nome, driver ('generic_rest'), api_url, api_token, field_mappings (json),
is_active, ultima_consulta_em, timestamps
```

`field_mappings` faz o de-para da resposta do sistema externo para os campos acima (ex.:
`{"nome": "nomeCompleto", "rg": "documentoRg", "cep": "endereco.cep", ...}`) — mesma técnica já
usada em `RhIntegracao->field_mappings`.

### Backend

- `Modules\Cemiterios\Contracts\CadastroUnicoAdapterInterface`: `consultar(string $documentoLimpo): ?array`.
- `Modules\Cemiterios\Services\Adapters\GenericHttpCadastroUnicoAdapter implements CadastroUnicoAdapterInterface`:
  faz `Http::withToken($integracao->api_token)->get($integracao->api_url, ['documento' => $doc])`,
  aplica `field_mappings` na resposta, `null` se 404/não encontrado. Mesmo estilo defensivo do
  `IcpBrasilAdapter` (lança `RuntimeException` só se a integração estiver ativa mas mal configurada;
  se não há integração ativa para o tenant, a consulta simplesmente retorna `null` e a tela cai para
  digitação manual — nem todo município terá isso configurado).
- `Modules\Cemiterios\Services\CadastroUnicoService::consultar(int $tenantId, string $documento): ?array`:
  resolve a integração ativa do tenant, chama o adapter, audita a consulta via `AuditLogger`
  (`cemiterios`, `cadastro_unico.consultado`, sem persistir o payload bruto — só CPF mascarado e se
  encontrou ou não, por ser dado de terceiro sensível/LGPD) e devolve os campos já no formato dos
  campos novos do `Concessionario`.
- `Http\Controllers\CadastroUnicoIntegracaoController` (painel de configuração, protegido por
  `cemiterios.integracoes.manage`, mesmo shape do `RhIntegrationController`): `index`, `store`,
  `update`, `testar` (chama o adapter com um CPF de teste informado, sem persistir nada).
- `Http\Controllers\CadastroUnicoConsultaController::consultar(Request $request)`: `GET
  /cemiterios/cadastro-unico/consultar?documento=`, usado pela tela de cadastro de concessionário;
  permissão `cemiterios.concessoes.manage` (quem já pode cadastrar concessionário).
- `ConcessaoController`/fluxo de criação de `Concessionario` (onde já existe hoje): ao salvar, se os
  dados vieram da consulta, grava `fonte = 'cadastro_unico'`, `cadastro_unico_ref`,
  `sincronizado_em = now()`; se digitado à mão, `fonte = 'manual'` (default).

### Frontend

- Nova aba **"Integrações"** dentro de `FinanceiroView.tsx`, cartão "Cadastro Único do Munícipe":
  formulário de configuração (driver fixo `generic_rest` por ora, URL, token, editor simples de
  `field_mappings` chave→chave, toggle ativo, botão "Testar conexão").
- No formulário de cadastro/edição de `Concessionario` (aba Concessões): botão **"Buscar no
  Cadastro Único"** ao lado do campo de CPF — chama o novo endpoint e preenche (editável) nome, RG,
  data de nascimento, filiação, NIS e endereço estruturado; se não configurado ou não encontrado,
  não bloqueia o preenchimento manual.

## Feature B — Integração com o ERP financeiro da prefeitura (arrecadação de guias)

### Modelo de dados

Migration em `cemetery_charges` (model `Guia`):

```
contribuinte_documento  string nullable, encrypted   -- CPF/CNPJ; ausente hoje, exigido p/ ERP
erp_status               string default 'nao_enviada' -- nao_enviada | enviada | confirmada | erro
erp_referencia_externa   string nullable
erp_enviado_em           datetime nullable
erp_ultimo_erro          string nullable
```

`contribuinte_documento` reaproveita `Modules\Cemiterios\Support\Documento` (hash/validação/máscara
já usados em `Concessionario`) — mesmo tratamento de LGPD. Preenchido automaticamente quando a guia
nasce de uma concessão (`Concessionario->documento`) ou de um alvará/empreiteiro (CNPJ já
cadastrado); campo de digitação manual só para guia avulsa sem origem — sem isso o ERP externo não
tem como aceitar a guia como título de cobrança válido.

Nova migration cria `cemetery_erp_integracoes` (config por tenant, mesma forma de
`capd_rh_integracoes`, incluindo geração automática de `api_key`/`webhook_secret` no `booted()`):

```
id, tenant_id, nome, driver ('generic_rest'), api_url, api_token, api_key, webhook_url,
webhook_secret, field_mappings (json), is_active, ultima_sincronizacao_em, timestamps
```

`api_key` autentica o ERP externo quando ele chama o SYSGOV de volta (confirmação de pagamento);
`api_url`/`api_token` são usados pelo SYSGOV para chamar o ERP (envio da guia).

### Backend

- `Contracts\ErpFinanceiroAdapterInterface`: `enviarGuia(array $payload): array{referencia_externa: ?string}`.
- `Services\Adapters\GenericHttpErpAdapter implements ErpFinanceiroAdapterInterface`: `POST` para
  `api_url` com o payload mapeado por `field_mappings`; lança exceção em falha (o listener decide o
  que fazer com isso — ver abaixo).
- `Services\ErpIntegrationService`:
  - `agendarExportacao(Guia $guia): void` — chamado de dentro de `GuiaService::emitir()` (ponto
    único por onde toda guia passa: avulsa, de concessão, lote anual, segunda via), publica no
    Outbox `OutboxPublisher::dispatch('cemiterios.guia_emitida', ['guia_id' => ..., 'tenant_id' =>
    ...])`. Só publica; nunca chama HTTP no ciclo da requisição (regra do projeto).
  - `exportar(Guia $guia): void` — resolve a integração ativa do tenant; se não houver, não faz
    nada (guia permanece `nao_enviada`, fluxo manual de hoje continua funcionando); se houver, chama
    o adapter, atualiza `erp_status` (`enviada`/`erro`), `erp_referencia_externa`,
    `erp_enviado_em`/`erp_ultimo_erro`, audita (`guia.erp_exportada` / `guia.erp_falha_exportacao`).
  - `confirmarPagamento(ErpIntegracao $integracao, string $referenciaExterna, string $pagoEm, int
    $valorPagoCentavos): Guia` — localiza a guia por `erp_referencia_externa` (ou por `numero` como
    fallback), chama `GuiaService::baixar()` num modo sem exigir arquivo de comprovante (o retorno
    do ERP É o comprovante), marca `erp_status = 'confirmada'`, audita
    `guia.baixa_automatica_erp`.
- `Listeners\ExportarGuiaErpListener` (mesmo molde de `EnviarEmail`/`SucessaoEventListener`): escuta
  `OutboxMessage`, filtra `event_type === 'cemiterios.guia_emitida'`, chama
  `ErpIntegrationService::exportar()`. Registrado em `CemiteriosServiceProvider::boot()`.
- `Http\Controllers\ErpIntegracaoController` (painel de config, `cemiterios.integracoes.manage`):
  `index`, `store`, `update`, `regenerateKey` — mesmo shape do `RhIntegrationController`.
- `Http\Controllers\Api\ErpApiController::confirmarPagamento(Request $request)`: rota pública
  (fora do grupo autenticado por sessão), autenticada por cabeçalho `X-Cemiterios-ERP-Key` contra
  `ErpIntegracao->api_key` — mesmo padrão de `RhApiController::resolveIntegracao()`.
- `GuiaService::baixar()`: pequeno ajuste para aceitar `comprovante` nulo quando a baixa vem do ERP
  (a validação de arquivo obrigatório fica só na baixa manual, no controller — o service em si já
  não obriga).
- Rotas: `Routes/api.php` ganha `integracoes-cadastro-unico/*` e `integracoes-erp/*` (protegidas,
  mesmo grupo das demais rotas do painel); novo `Routes/erp.php` (público, registrado em
  `RouteServiceProvider` do mesmo jeito que `public.php`/`portal.php` hoje) com
  `POST /confirmar-pagamento`.

### Frontend

- Mesma aba "Integrações" de Financeiro, segundo cartão "ERP Financeiro da Prefeitura": formulário
  de configuração (URL, token, editor de `field_mappings`, toggle ativo) + exibição do `api_key`
  gerado (para configurar no lado do ERP) com botão "Gerar nova chave".
- Tabela de Guias (`FinanceiroView.tsx` → `Guias`): nova coluna com `StatusChip` do `erp_status`
  (Não enviada / Enviada / Confirmada / Erro), tooltip com `erp_ultimo_erro` quando houver.

## Permissão nova

`cemiterios.integracoes.manage`: "Gerenciar integrações com cadastro único e ERP financeiro da
prefeitura" — adicionada em `module.json`, controla os dois painéis de configuração (não a consulta
pontual de cadastro único durante o cadastro de concessionário, que usa a permissão já existente
`cemiterios.concessoes.manage`).

## Testes

- `Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (novo, seguindo o molde de
  `FinanceiroTest.php`/`TenantIsolationTest.php`):
  - isolamento por tenant das duas novas tabelas de integração (obrigatório por módulo, conforme
    `CLAUDE.md`);
  - `GuiaService::emitir()` publica o evento no Outbox;
  - listener chama o adapter (fake/mock via `Http::fake()`) e atualiza `erp_status` corretamente
    nos casos sucesso/erro;
  - `confirmarPagamento` baixa a guia sem exigir arquivo e rejeita API key inválida/inativa;
  - `CadastroUnicoService::consultar` retorna `null` sem integração ativa (fallback manual) e
    retorna os campos mapeados quando configurado (`Http::fake()`).
- Frontend: `npm run typecheck` em `apps/web-client`; verificação manual das duas telas novas e do
  botão de busca no cadastro de concessionário.

## Fora de escopo

- Gateway de pagamento próprio (geração de boleto/PIX pelo SYSGOV) — é responsabilidade do ERP da
  prefeitura, que recebe a guia e devolve a confirmação.
- Adapters hardcoded por fornecedor de ERP/cadastro único (Betha, e-Cidade, Sagres, GRP...) — só o
  adapter HTTP genérico configurável por `field_mappings`, como já é o padrão do RH no CAPD.
- Importação em massa de todos os munícipes do cadastro único para dentro do Cemitérios — só
  consulta pontual por CPF, sob demanda (risco de LGPD sem necessidade real).
- Qualquer mudança em como a taxa anual/reajuste IPCA funciona hoje — fora do pedido desta sessão.
