# Proposal

## Why

O módulo de Cadastro de Pessoas (MDM) do SYSGOV hoje modela exclusivamente pessoa física (CPF), mas
módulos satélites como Cemitérios (concessionários, empreiteiros) e, no futuro, Licitações/Contratos
precisam registrar pessoas jurídicas (CNPJ) como fornecedores, contratadas, concessionárias e
credenciadas. Sem suporte nativo a jurídica no cadastro central, cada módulo tende a duplicar sua
própria lógica de cadastro e validação de CNPJ, fragmentando o master data e quebrando o propósito do
MDM único. Esta mudança evolui o módulo Pessoas existente para suportar pessoa jurídica como um
segundo tipo da mesma entidade, mantendo compatibilidade com o contrato de API já consumido por
Cemitérios e demais integrações.

## What Changes

- Adiciona o campo `tipo` (`fisica` | `juridica`, padrão `fisica`, NOT NULL) à tabela `pessoas`,
  mantendo física e jurídica na mesma entidade — sem nova tabela ou módulo.
- Generaliza as colunas de documento: `cpf`/`cpf_hash` passam a representar o documento de
  identificação da pessoa (CPF para física, CNPJ para jurídica), com a unicidade migrando de
  `(tenant_id, cpf_hash)` para `(tenant_id, tipo, documento_hash)` — migração segura com backfill de
  `tipo = 'fisica'` nos registros existentes e checagem de duplicidade latente antes de criar o índice.
- Adiciona campos exclusivos de jurídica (nullable): `razao_social`, `nome_fantasia`,
  `inscricao_estadual`, `inscricao_municipal`, `porte`, `natureza_juridica`, `responsavel_id` (FK para
  uma pessoa física do próprio MDM, representante legal/administrador).
- Estende `Modules\Pessoas\Support\Documento` para validar dígitos verificadores de CNPJ, além de CPF,
  e gerar hash/máscara (`00.000.000/0000-00`) para ambos.
- Cria a tabela e o fluxo de **quadro societário** (`pessoa_socios`): vincula uma pessoa jurídica a
  sócios que são pessoas físicas do mesmo tenant no próprio MDM (sem duplicar dados civis), com
  percentual de participação, papel (sócio, sócio-administrador, representante legal) e vigência.
- Amplia `PessoaVinculo::TIPOS` com papéis de jurídica: `fornecedor`, `contratada`, `concessionaria`,
  `permissionaria`, `credenciada`, mantendo os tipos de física já existentes.
- Torna `StorePessoaRequest`/`UpdatePessoaRequest` condicionais por tipo (física exige nome e CPF;
  jurídica exige razão social e CNPJ), com mensagens de validação específicas por tipo.
- Bloqueia a promoção a usuário (`PromocaoUsuarioService`/`PessoaPolicy::promote`) para pessoa
  jurídica — promoção continua exclusiva de pessoa física.
- Torna tipo-aware os fluxos de importação assíncrona (`ImportacaoPessoaService`,
  `GenericHttpPessoaImportAdapter`), exportação (`PessoaExportService`) e busca/listagem
  (`PessoaService::listar`), deduplicando e buscando por `documento_hash` dentro do tipo.
- Generaliza o componente compartilhado `PessoaPicker`/`PessoaPickerOption` (`@sysgov/ui`, hoje
  consumido também por Cemitérios) e o SDK (`@sysgov/sdk/modules/pessoas`) para exibir/buscar por
  razão social e CNPJ, preservando o contrato atual para os consumidores de pessoa física.
  **BREAKING** (apenas para quem acessa o tipo exportado diretamente): `PessoaPickerOption.cpf_mascarado`
  é generalizado para um identificador mascarado dinâmico — o alias `cpf_mascarado` é mantido para
  compatibilidade.
- Adiciona ao wizard do cliente (`NovaPessoaWizard`) um primeiro passo de seleção de tipo
  (física/jurídica) que ramifica os campos seguintes, e uma seção de quadro societário no detalhe de
  pessoa jurídica.
- Nenhuma mudança no contrato público de API para consumidores de pessoa física: o campo de entrada
  `cpf` continua aceito quando `tipo=fisica`, e a serialização mantém `cpf_mascarado` como alias.

## Capabilities

### Modified Capabilities

- `pessoas`: unicidade de documento passa a ser por tipo (física × jurídica nunca colidem), suporte a
  pessoa jurídica com campos próprios, quadro societário, vínculos ampliados com papéis de jurídica,
  bloqueio de promoção a usuário para jurídica, e busca/serialização/exportação/importação tipo-aware.

## Impact

- **Backend** (`apps/api/Modules/Pessoas`): migrations (nova coluna `tipo` e campos de jurídica,
  migração de unicidade, nova tabela `pessoa_socios`), `Models\Pessoa`, novo `Models\PessoaSocio`,
  `Support\Documento`, `Http\Requests\{Store,Update}PessoaRequest`, novos Form Requests de sócio,
  `Http\Resources\PessoaResource`, `Services\{PessoaService,VinculoService,PromocaoUsuarioService,
  ImportacaoPessoaService,PessoaExportService}`, novo `Services\QuadroSocietarioService` (ou equivalente),
  `Services\Adapters\GenericHttpPessoaImportAdapter`, `Policies\PessoaPolicy`, `Models\PessoaVinculo`
  (constante `TIPOS`), rotas (`Routes/api.php`) e suíte de testes (unicidade, migração, quadro
  societário, promoção, isolamento de tenant).
- **SDK** (`packages/sdk/src/modules/pessoas`): `types.ts` (tipo, campos de jurídica, `PessoaSocio`,
  `TipoVinculoPessoa` ampliado) e `client.ts` (métodos de quadro societário).
- **Design system** (`packages/ui/src/components/PessoaPicker.tsx`, `PessoaFormModal.tsx`): tipo de
  opção e rótulo dinâmico por tipo de pessoa — afeta todos os consumidores atuais, incluindo
  `apps/web-client/src/modules/cemiterios/*` (ConcessoesView, EmpreiteirosView, OperadoresView,
  ModalDetalheJazigo, ModalEditarConcessionario, HerdeirosTable, ModalNovaInumacao).
- **Frontend cliente** (`apps/web-client/src/modules/pessoas`): `NovaPessoaWizard`, `PessoaDetailView`,
  `PessoasListView`, `hooks/usePessoaPicker`, `hooks/usePessoas`, `api.ts`.
- Sem impacto em `apps/web` (painel admin) nesta mudança — fora de escopo v1.
- Sem chamada síncrona externa nova; qualquer validação online futura de CNPJ fica registrada como
  pergunta em aberto (ver `design.md`), a ser implementada via Outbox + cache se aprovada.
