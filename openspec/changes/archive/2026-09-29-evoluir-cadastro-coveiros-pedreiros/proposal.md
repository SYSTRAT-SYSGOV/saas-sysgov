# Proposal

## Why

O cadastro de coveiros e pedreiros (`OperadorCemiterio` / aba "Coveiros e Pedreiros") é hoje um
CRUD raso: CPF/CNPJ gravado em texto puro e devolvido sem máscara na API (violação de boa
prática de proteção de dados pessoais, já corrigida para o cadastro de Empreiteiros do mesmo
módulo), apenas um alvará "corrente" por pedreiro sem histórico nem upload do documento, nenhum
registro de advertência/suspensão/descredenciamento, nenhuma segmentação por necrópole em
tenants com múltiplos cemitérios, e o vínculo entre o profissional e as inumações que ele
executou é feito por **casamento de texto livre** (`coveiro_nome`/`pedreiro_nome` comparados com
`nome`) em vez de chave estrangeira — frágil para homônimos, mudanças de nome ou erros de
digitação em um registro com relevância sanitária e legal. O módulo já resolveu exatamente os
mesmos problemas para o cadastro de Empreiteiros (`Empreiteiro` + `AlvaraAnual` + `AlvaraObra` +
`Penalidade`, documento criptografado e mascarado) — este change eleva Coveiros e Pedreiros ao
mesmo padrão de maturidade já validado no próprio módulo, mais os pontos específicos de
credenciamento municipal e saúde ocupacional que só se aplicam a esta categoria de profissional.

## What Changes

- Criptografar e mascarar `cpf_cnpj` no cadastro de operadores (mesmo padrão de
  `Empreiteiro::documento`), deixando de expor o documento em claro na API. **BREAKING**: o
  campo `cpf_cnpj` deixa de vir em texto puro nas respostas da API; o consumidor passa a receber
  `documento_mascarado`.
- Adicionar `park_id` (nullável = atuação em todas as necrópoles do tenant) para segmentar
  coveiros/pedreiros por cemitério em tenants com múltiplas necrópoles.
- Substituir os campos únicos `alvara_numero`/`alvara_validade` por um histórico de
  credenciamentos (`cemetery_operator_licenses`), com upload do documento do alvará (hash
  SHA-256, mesmo padrão de `sucessao_documentos`) e renovação rastreável — mantendo os campos
  atuais como "credencial vigente" calculada, sem quebrar consultas existentes.
- Criar registro de sanções (`cemetery_operator_penalties`, espelhando
  `cemetery_contractor_penalties`): advertência, suspensão temporária e descredenciamento, com
  motivo, período de vigência e anexo opcional do processo administrativo.
- Adicionar rastreamento leve de saúde e segurança ocupacional exigido para a categoria: validade
  do ASO (Atestado de Saúde Ocupacional) e registro de entrega/treinamento de EPI, com alertas de
  vencimento no mesmo padrão dos alvarás.
- Vincular `Inumacao.coveiro_id` / `Inumacao.pedreiro_id` (FKs nullable para `cemetery_operators`)
  para novos lançamentos feitos pela própria aplicação, preservando `coveiro_nome`/`pedreiro_nome`
  como estavam para os registros históricos migrados do Clipper (que não têm ID confiável).
  `OperadorCemiterioController::historico()` passa a priorizar o vínculo por ID e cair para o
  casamento por nome apenas nos registros legados sem `coveiro_id`/`pedreiro_id`.
- Separar a permissão de leitura da aba (`cemiterios.cadastros.view`, nova) da permissão de
  gestão (`cemiterios.cadastros.manage`, já existente) — hoje a aba inteira é liberada apenas
  pela permissão genérica `cemiterios.view`, sem controle de leitura dedicado.
- Evoluir a UI (`OperadoresView.tsx`) para expor o histórico de credenciamentos, sanções, ASO/EPI
  e o filtro por necrópole, seguindo os componentes já usados no módulo (`@sysgov/ui`,
  `StatusChip`, `DataTable`, padrão de drawer de histórico já existente).

## Capabilities

### New Capabilities
- `cemiterio/cadastro-operadores`: cadastro, credenciamento (alvará com histórico e documento),
  sanções administrativas, segmentação por necrópole, rastreamento de saúde/segurança
  ocupacional e vínculo operacional rastreável de coveiros e pedreiros credenciados.

### Modified Capabilities
(nenhuma — nenhum requisito das specs existentes de `cemiterio/*` descreve o cadastro de
coveiros/pedreiros hoje; o vínculo com inumações é tratado como requisito novo dentro da
capacidade acima, não como alteração de `cemiterio/operacoes-ordens-servico`, cujos requisitos
atuais não mencionam a identidade do operador.)

## Impact

- **Backend**: `Modules/Cemiterios/Models/OperadorCemiterio.php`, novo
  `OperadorLicenca`/`OperadorPenalidade`, `OperadorCemiterioController.php`, nova
  `OperadorCemiterioService` (para concentrar a lógica hoje solta no controller, seguindo o
  padrão `EmpreiteiroService`), migrations aditivas em `cemetery_operators` +
  `Inumacao`/`inumações`, `module.json` (nova permissão), testes de
  `Modules/Cemiterios/Tests/Feature/OperadoresTest.php`.
- **Frontend**: `apps/web-client/src/modules/cemiterios/views/OperadoresView.tsx`, `api.ts`
  (tipos e métodos), possíveis novos componentes de histórico de credenciamento/sanções
  seguindo `@sysgov/ui`.
- **Dados existentes**: migração aditiva e retrocompatível — `alvara_numero`/`alvara_validade`
  continuam existindo como campos calculados/espelhados a partir do credenciamento vigente; sem
  perda de dados dos operadores já cadastrados.
- **Pergunta em aberto**: a lista exata de exames/documentos de saúde ocupacional exigidos por
  legislação municipal para coveiros (ex.: periodicidade do ASO conforme PCMSO, NRs aplicáveis)
  varia por município — este change usa um placeholder de configuração
  `[REQUISITOS DE SAÚDE OCUPACIONAL — CONFIRMAR LEGISLAÇÃO MUNICIPAL]`, no mesmo padrão já usado
  para a base legal de sucessão hereditária, a ser confirmado junto à Prefeitura de Araucária/PR.
