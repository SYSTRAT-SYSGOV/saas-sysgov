# Módulo de Cadastro de Coveiros e Pedreiros (Cemitérios — RF-cadastro-operadores)

> Documentação do cadastro, credenciamento, sanções administrativas e vínculo operacional
> rastreável de coveiros (servidores municipais) e pedreiros (prestadores credenciados) dentro do
> módulo `Modules/Cemiterios`. Cobre: modelo de dados, regras de negócio, endpoints da API,
> permissões, exceções e configuração por tenant.

## 1. Modelo de Dados

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          cemetery_operators                              │
│ id, tenant_id, park_id (FK nullable),                                    │
│ nome, tipo (coveiro|pedreiro), cpf_cnpj (encrypted+hidden),              │
│ documento_hash, matricula_funcional,                                     │
│ alvara_numero, alvara_validade (espelham o credenciamento vigente),      │
│ aso_validade, epi_ultimo_registro, telefone, email,                      │
│ situacao (ativo|suspenso|inativo), observacoes, soft delete              │
└───────┬───────────────────────────────┬──────────────────┬──────────────┘
        │ 1:N                           │ 1:N                │ N (por nome ou FK)
        ▼                               ▼                    ▼
┌───────────────────────┐   ┌────────────────────────┐  ┌───────────────────────┐
│ cemetery_operator_     │   │ cemetery_operator_      │  │     cemetery_burials   │
│ licenses               │   │ penalties               │  │ coveiro_id/pedreiro_id │
│ numero, validade,      │   │ tipo (advertencia|      │  │ (FK nullable),         │
│ arquivo, hash (SHA-256)│   │ suspensao|descredencia- │  │ coveiro_nome/          │
│                         │   │ mento), inicio, fim,    │  │ pedreiro_nome (texto   │
│                         │   │ motivo, arquivo         │  │ livre, legado)         │
└───────────────────────┘   └────────────────────────┘  └───────────────────────┘
```

- `cemetery_operators`, `cemetery_operator_licenses` e `cemetery_operator_penalties` têm
  `tenant_id` com índices compostos e usam o trait `TenantAware` (escopo global + preenchimento
  automático) — nenhuma delas é acessível fora do tenant corrente.
- `cpf_cnpj` é armazenado com cast Eloquent `encrypted` e `hidden` (nunca serializado em claro);
  `documento_hash` (HMAC-SHA256, mesma chave/mecanismo de `Empreiteiro`) é usado para busca por
  igualdade do valor limpo — busca parcial deixou de ser suportada.
- `alvara_numero`/`alvara_validade` em `cemetery_operators` são campos **calculados/espelhados**
  a partir do credenciamento de maior validade ainda não vencida (`OperadorCemiterioService::
  sincronizarCredencialVigente()`), mantidos por compatibilidade com consultas existentes.
- `cemetery_burials.coveiro_id`/`pedreiro_id` são FKs nullable adicionadas de forma aditiva:
  preenchidas apenas quando o formulário seleciona um operador cadastrado; `coveiro_nome`/
  `pedreiro_nome` continuam sendo a fonte de verdade para os registros legados migrados do
  Clipper, que não têm ID confiável.

## 2. Regras de Negócio

| Regra | Descrição | Implementação |
|---|---|---|
| RN-OP-001 | Documento pessoal nunca em texto puro | `OperadorCemiterio::$hidden`/`$casts['cpf_cnpj' => 'encrypted']`; API expõe apenas `documento_mascarado` |
| RN-OP-002 | Segmentação por necrópole | `park_id` nullable (`null` = atua em todas as necrópoles do tenant); listagem filtra por `park_id` |
| RN-OP-003 | Histórico de credenciamento com integridade | `OperadorCemiterioService::credenciar()` cria `OperadorLicenca` com hash SHA-256 do arquivo, sem apagar credenciamentos anteriores |
| RN-OP-004 | Alerta de vencimento (30 dias) | `OperadorCemiterioService::statusCredenciamento()`/`statusSaudeOcupacional()` — `valido`\|`a_vencer`\|`vencido`\|`sem_credenciamento`/`nao_informado` |
| RN-OP-005 | Sanções administrativas com histórico | `OperadorCemiterioService::sancionar()` cria `OperadorPenalidade`; `descredenciamento` também marca `situacao = inativo` |
| RN-OP-006 | Sancionado não pode ser vinculado a nova execução | `OperadorCemiterioService::validarDisponibilidade()` lança `RegraNegocioException` (422, `operador.suspenso`/`operador.descredenciado`) para suspensão vigente ou descredenciamento; chamada por `OperacaoService::vincularOperadores()` antes de criar/atualizar `Inumacao` |
| RN-OP-007 | Override de suspensão auditado | Suspensão aceita override explícito (`override_suspensao` + `justificativa_override` obrigatória) por usuário com `cemiterios.cadastros.manage`, registrado em `audit_logs` (`operador.suspensao.override`); descredenciamento nunca aceita override |
| RN-OP-008 | Vínculo por ID prioritário sobre nome | `OperadorCemiterioController::historico()` consulta `WHERE coveiro_id = ? OR (coveiro_id IS NULL AND coveiro_nome IN (...))` — união sem duplicar, sem exigir ID nos registros legados |
| RN-OP-009 | Leitura e gestão como permissões distintas | `cemiterios.cadastros.view` (leitura) é separada de `cemiterios.cadastros.manage` (escrita); seeder concede `.view` automaticamente a quem já tinha `.manage` |
| RN-OP-010 | Migração de dados idempotente | `cemiterio:criptografar-documentos-operadores` criptografa `cpf_cnpj` legado in-place e cria o primeiro `OperadorLicenca` a partir do alvará vigente, dentro de uma transação por tenant; roda várias vezes sem duplicar nem reprocessar valores já criptografados |

## 3. Endpoints da API

Prefixo `api/cemiterios`, middleware `auth:sanctum` + `tenant.resolve` + `module-access:cemiterios`
(`RouteServiceProvider` do módulo).

| Método | Rota | Ação | Permissão |
|---|---|---|---|
| GET | `/operadores` | Listagem paginada com filtros (`tipo`, `situacao`, `status_alvara`, `status_saude_ocupacional`, `park_id`, `q`) e estatísticas consolidadas | `cemiterios.cadastros.view` |
| POST | `/operadores` | Cadastrar coveiro/pedreiro (aceita `alvara_numero`/`alvara_validade` legados, viram o 1º credenciamento) | `cemiterios.cadastros.manage` |
| GET | `/operadores/{id}` | Detalhe (inclui `status_credenciamento`, `status_saude_ocupacional`) | `cemiterios.cadastros.view` |
| PUT | `/operadores/{id}` | Atualizar dados cadastrais | `cemiterios.cadastros.manage` |
| GET | `/operadores/{id}/historico` | Histórico operacional (inumações vinculadas por ID ou nome legado) | `cemiterios.cadastros.view` |
| GET | `/operadores/{id}/licencas` | Histórico de credenciamentos (alvarás) | `cemiterios.cadastros.view` |
| POST | `/operadores/{id}/licencas` | Novo credenciamento (upload opcional do documento) | `cemiterios.cadastros.manage` |
| GET | `/operadores/{id}/penalidades` | Histórico de sanções administrativas | `cemiterios.cadastros.view` |
| POST | `/operadores/{id}/penalidades` | Nova sanção (advertência/suspensão/descredenciamento) | `cemiterios.cadastros.manage` |

A criação/atualização de `Inumacao` (`POST /inumacoes`, `PUT /inumacoes/{id}`) aceita os campos
opcionais `coveiro_id`/`pedreiro_id` (além de `coveiro_nome`/`pedreiro_nome` em texto livre) e
`override_suspensao`/`justificativa_override` para o caso de exceção de RN-OP-007.

Autorização é sempre server-side (Form Requests dedicados + `AutorizaPermissao::autorizar()` nos
controllers de leitura). O isolamento por tenant vem do escopo global `TenantAware` — um recurso
de outro tenant nunca é encontrado (404).

## 4. Exceções e Códigos HTTP

| Exceção | HTTP | Quando |
|---|---|---|
| `Illuminate\Validation\ValidationException` | 422 | Payload inválido (Form Requests) |
| `Illuminate\Auth\Access\AuthorizationException` / `abort_unless` | 403 | Usuário sem a permissão exigida |
| `Modules\Cemiterios\Support\RegraNegocioException` | 422 | `operador.suspenso`, `operador.descredenciado`, `operador.override_sem_justificativa` (ver RN-OP-006/007), com `code` legível no corpo da resposta |
| `Illuminate\Database\Eloquent\ModelNotFoundException` | 404 | Recurso inexistente ou de outro tenant |

## 5. Configuração por Tenant (`config('cemiterios.saude_ocupacional')`)

Definida em `Modules/Cemiterios/Config/config.php`:

| Chave | Padrão | Uso |
|---|---|---|
| `aso_periodicidade_dias` | 365 | Referência de periodicidade do ASO (Atestado de Saúde Ocupacional) |
| `requisitos_legais` | placeholder (ver §6) | Exames/documentos de saúde ocupacional exigidos por legislação municipal |

## 6. Pergunta em Aberto — Requisitos de Saúde Ocupacional

O campo `requisitos_legais` está com o valor placeholder:

```
[REQUISITOS DE SAÚDE OCUPACIONAL — CONFIRMAR LEGISLAÇÃO MUNICIPAL]
```

**Confirmar junto à Prefeitura de Araucária/PR** (tenant piloto) a lista exata de exames/
documentos de saúde ocupacional exigidos por legislação municipal para coveiros (ex.:
periodicidade do ASO conforme PCMSO, NRs aplicáveis), que varia por município. Até a
confirmação, apenas a validade do ASO e a data do último registro de entrega/treinamento de EPI
são rastreadas, sem validar o conteúdo exigido.

## 7. Comando de Migração de Dados

| Comando | Uso | Função |
|---|---|---|
| `cemiterio:criptografar-documentos-operadores` | Sob demanda (`--tenant`, `--dry-run`) | Criptografa `cpf_cnpj` em texto puro existente e recalcula `documento_hash`; para operadores com `alvara_numero`/`alvara_validade` preenchidos e sem nenhum credenciamento registrado, cria o primeiro `OperadorLicenca` (RN-OP-010) |

## 8. Testes

Suíte em `Modules/Cemiterios/Tests/Feature/OperadoresTest.php` (endpoints, filtros, bloqueio de
sancionado, criptografia/busca por hash, migração de dados, permissões) e
`OperadorCemiterioServiceTest.php` (credenciamento, sanção, `validarDisponibilidade` e override
auditado) — cobrem também isolamento multi-tenant via descoberta automática de modelos em
`TenantIsolationTest.php`.
