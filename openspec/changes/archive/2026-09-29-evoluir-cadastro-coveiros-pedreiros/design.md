# Design

## Context

`OperadorCemiterio` (`cemetery_operators`) é hoje um cadastro achatado: um único
`alvara_numero`/`alvara_validade` por registro, `cpf_cnpj` em texto puro, sem `park_id`, sem
sanções, sem saúde ocupacional. O mesmo módulo já resolveu o mesmo problema para
`Empreiteiro` (`cemetery_contractors`), com três tabelas satélite já em produção e testadas:

- `AlvaraAnual` (`cemetery_contractor_licenses`): `contractor_id`, `numero`, `validade`, `arquivo` — histórico de credenciamentos.
- `AlvaraObra` (`cemetery_contractor_works`): alvará específico por obra.
- `Penalidade` (`cemetery_contractor_penalties`): `contractor_id`, `tipo`, `inicio`, `fim`, `motivo`, `arquivo`.
- `Empreiteiro::documento` é `encrypted` + `hidden`, com `documento_mascarado` calculado via `Documento::mascarar()`.

`Documento` (`Modules\Cemiterios\Support\Documento`) já expõe `somenteDigitos()`, `hash()` e
(usado por `Empreiteiro`) uma forma de mascaramento — reaproveitável sem nova dependência.

`Inumacao` grava `coveiro_nome`/`pedreiro_nome` como texto livre porque essas colunas foram
criadas para acomodar a migração de dados legados do Clipper (ver
`2026_09_24_210000_add_regras_clipper_to_cemetery_tables.php`), onde não existe um ID de
operador confiável. Ver proposal.md - Why para a motivação completa.

## Goals / Non-Goals

**Goals:**
- Elevar `OperadorCemiterio` ao mesmo padrão de maturidade de `Empreiteiro` (documento
  protegido, histórico de credenciamento, sanções), reaproveitando os padrões já validados.
- Vínculo por ID entre profissional e execução operacional para registros novos, sem quebrar o
  histórico legado.
- Superfície de saúde/segurança ocupacional mínima (ASO, EPI) com o mesmo mecanismo de alerta já
  usado para vencimento de alvará.

**Non-Goals:**
- Não migrar/retrofit os registros legados de `coveiro_nome`/`pedreiro_nome` para `coveiro_id`/
  `pedreiro_id` — ficam como estão, o vínculo por ID vale só para lançamentos novos.
- Não construir um módulo de RH completo (folha de ponto, escalas, férias) — apenas os registros
  de credenciamento, sanção e saúde ocupacional descritos na spec.
- Não implementar assinatura eletrônica dos documentos anexados (alvará, ASO, processo de
  sanção) — upload com hash de integridade é suficiente neste change.
- Não definir o texto legal exato de saúde ocupacional exigido — fica como configuração
  placeholder a confirmar (ver proposal.md - Impact).

## Decisions

### 1. Tabelas satélite dedicadas, espelhando o padrão de `Empreiteiro` (não uma tabela genérica compartilhada)
Criar `cemetery_operator_licenses` e `cemetery_operator_penalties` como tabelas próprias, com a
mesma forma de `cemetery_contractor_licenses`/`cemetery_contractor_penalties`, em vez de tentar
generalizar uma tabela `licenses`/`penalties` compartilhada entre `Empreiteiro` e
`OperadorCemiterio`. Alternativa considerada: uma tabela polimórfica única (`licensable_type`/
`licensable_id`). Rejeitada porque o módulo já tem duas tabelas paralelas não-polimórficas para
o mesmo conceito aplicado a Empreiteiros, e unificar agora exigiria migrar dados de produção de
Empreiteiros sem necessidade — o ganho de reuso não paga o risco da migração. Consistência com o
padrão já em produção pesa mais que DRY neste caso.

### 2. Hash de integridade no documento do alvará de operador (além do que `AlvaraAnual` já faz)
`cemetery_operator_licenses` ganha uma coluna `hash` (SHA-256), que `AlvaraAnual` não tem hoje.
Justificativa: o padrão mais recente do módulo para documento com relevância legal
(`sucessao_documentos`, deste mesmo trimestre) já inclui verificação de integridade; não faz
sentido introduzir uma tabela nova em 2026 sem o padrão mais atual. Não é MODIFIED em
`AlvaraAnual` — fica como diferença justificada, não retrofit do que já existe.

### 3. `cpf_cnpj` criptografado via cast Eloquent `encrypted`, reaproveitando `Documento::mascarar()`
Mesma abordagem de `Empreiteiro`: `protected $casts = ['cpf_cnpj' => 'encrypted']`, `protected
$hidden = ['cpf_cnpj']`, `protected $appends = ['documento_mascarado']`. A busca por documento
(`orWhere('cpf_cnpj', 'like', ...)`) deixa de funcionar sobre o campo criptografado — passa a
usar `documento_hash` (já existente na tabela) para busca por igualdade do valor limpo,
exatamente como esse hash já é calculado hoje em `store()`/`update()`. Busca parcial por
documento deixa de ser suportada (trade-off aceito, documentado no risco abaixo).

### 4. `park_id` nullable direto em `cemetery_operators` (não uma tabela pivot N:N)
Um operador pode atuar em "todas as necrópoles" (`park_id = null`) ou em uma necrópole
específica. Alternativa considerada: tabela pivot `cemetery_operator_park` para múltiplas
necrópoles específicas por operador. Rejeitada por YAGNI — nenhum requisito pede "operador atua
em exatamente estas 2 de 5 necrópoles"; o caso real é "só nesta necrópole" ou "em todas". Uma
coluna nullable resolve com uma migração muito mais simples e sem novo relacionamento.

### 5. `coveiro_id`/`pedreiro_id` como FKs nullable adicionadas a `Inumacao` (aditivo, não substitui as colunas de nome)
`coveiro_nome`/`pedreiro_nome` continuam existindo e sendo a fonte de verdade para registros
legados. As novas FKs nullable são preenchidas apenas quando o formulário de nova inumação/obra
seleciona um operador cadastrado (autocomplete vinculado a `cemetery_operators.id`), em vez de
digitar o nome livre. `OperadorCemiterioController::historico()` passa a consultar `WHERE
coveiro_id = ? OR (coveiro_id IS NULL AND (coveiro_nome = ? OR coveiro_nome = ?))` — prioriza o
vínculo por ID e só cai para o casamento por nome nos registros que não têm o ID preenchido.

### 6. Bloqueio de vinculação a sancionados feito no `OperadorCemiterioService`, não em trigger de banco
A checagem "operador suspenso/descredenciado não pode ser vinculado a nova execução" (spec:
Profissional Sancionado Não Pode Ser Alocado a Nova Execução) fica em um método de serviço
(`OperadorCemiterioService::validarDisponibilidade()`), chamado pelos pontos de entrada que hoje
criam `Inumacao`/`AlvaraObra` com um operador selecionado. Alternativa (constraint/trigger de
banco) rejeitada: o padrão de regra de negócio do módulo inteiro é `RegraNegocioException` em
camada de serviço (422 com código legível), não erro de banco — manter consistência com o resto
do módulo (`SucessaoService`, `EmpreiteiroService`) importa mais que a garantia adicional de um
trigger.

### 7. `OperadorCemiterioService` novo, extraindo a lógica hoje solta no controller
`OperadorCemiterioController` hoje monta queries e regra de negócio diretamente no controller
(sem service). Este change extrai para `OperadorCemiterioService` (abrir credenciamento,
registrar sanção, validar disponibilidade, calcular indicadores), seguindo o padrão já
estabelecido em todo o resto do módulo (`SucessaoService`, `EmpreiteiroService`,
`OperacaoService`) — consistência arquitetural, não um requisito de comportamento novo.

## Risks / Trade-offs

- **[Risco] Perda de busca parcial por CPF/CNPJ** ao criptografar o campo → **Mitigação**: busca
  passa a ser por igualdade via `documento_hash` (documento completo, sem máscara/formatação);
  a UI já normaliza o campo de busca antes de enviar, mesmo comportamento que `Empreiteiro` já
  tem hoje para o mesmo problema.
- **[Risco] Coluna `cpf_cnpj` de texto puro já existente carrega dados não criptografados** →
  **Mitigação**: migration de dados (não só de schema) que lê os registros existentes, recalcula
  `documento_hash` a partir do valor limpo e reescreve `cpf_cnpj` através do cast `encrypted`
  antes de finalizar; roda dentro de uma transação por tenant, idempotente (verifica se o valor
  já parece criptografado antes de reprocessar).
- **[Risco] Vínculo por ID nas novas inumações exige que o formulário de operação passe a
  usar autocomplete em vez de texto livre** → **Mitigação**: front-end mantém o campo de texto
  livre como fallback quando nenhum operador cadastrado corresponde (ex.: mutirão eventual,
  terceirizado pontual não credenciado) — `coveiro_id`/`pedreiro_id` continuam nullable.
- **[Risco] Bloqueio de vinculação a sancionado pode impedir emergência sanitária legítima
  (único pedreiro disponível na necrópole)** → **Mitigação**: descredenciamento bloqueia sempre;
  suspensão permite override explícito por usuário com `cemiterios.cadastros.manage`, registrado
  em auditoria com justificativa obrigatória (mesmo padrão de exceção já usado em transições
  sensíveis do módulo, ex.: `SucessaoService`).

## Migration Plan

1. Migration aditiva: `cemetery_operators.park_id` (FK nullable), `cemetery_operator_licenses`,
   `cemetery_operator_penalties`, `cemetery_operators.aso_validade`,
   `cemetery_operators.epi_ultimo_registro`; `inumacoes.coveiro_id`/`pedreiro_id` (FK nullable).
2. Migration de dados: criptografa `cpf_cnpj` existente in-place (ver risco acima); para cada
   operador com `alvara_numero`/`alvara_validade` preenchidos, cria a primeira linha em
   `cemetery_operator_licenses` (sem `arquivo`/`hash`, já que não há documento histórico
   anexado) para não perder o dado atual.
3. Backend: `OperadorCemiterioService`, atualização do controller e das Form Requests, nova
   permissão `cemiterios.cadastros.view` no `module.json` (concedida por padrão a quem já tem
   `cemiterios.cadastros.manage`, via seeder de RBAC).
4. Frontend: `OperadoresView.tsx` evolui incrementalmente — indicadores, filtro por necrópole,
   drawer de histórico de credenciamento/sanções — sem quebrar a tela atual durante o
   desenvolvimento (o `alvara_numero`/`alvara_validade` "vigente" continuam sendo os campos
   exibidos por padrão, calculados a partir do credenciamento mais recente).
5. Rollback: todas as migrations são aditivas exceto a de dados (criptografia); o `down()` da
   migration de dados descriptografa de volta antes de reverter o schema, para permitir rollback
   seguro em caso de problema em produção.
