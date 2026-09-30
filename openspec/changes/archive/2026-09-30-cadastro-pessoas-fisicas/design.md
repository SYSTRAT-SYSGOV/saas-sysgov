# Design

## Context

O módulo `Pessoas` (`apps/api/Modules/Pessoas`) foi concebido como repositório mestre de identidade civil (MDM) para o ecossistema SYSGOV. Sua implementação base atual já contém entidades estruturadas (`Pessoa`, `PessoaVinculo`, `PessoaDocumento`, `PessoaEndereco`, `PessoaContato`, `PessoaUsuario`, `PessoaIntegracao`, `PessoaSyncLog`) e um frontend funcional em `apps/web-client/src/modules/pessoas`.

No entanto, a arquitetura atual apresenta lacunas críticas em relação às diretrizes do `AGENTS.md` e aos padrões do monorepo:
1. Validação dispersa inline nos controllers em vez de Form Requests tipados e dedicados.
2. Serialização direta de instâncias do Eloquent sem camada de API Resources, trazendo riscos de exposição indevida de dados ou inconsistência de campos sensíveis sob a LGPD.
3. Ausência de uma `PessoaPolicy` registrada, operando com traits genéricas e sem travas de recurso (ex.: bloquear exclusão de pessoas com vínculos vigentes).
4. Sub-entidades (documentos, endereços e contatos) sem endpoints RESTful completos de alteração (PUT) e remoção (DELETE), e ausência de lógica transacional para assegurar no máximo um contato principal por tipo (`celular`, `email`, `telefone`).
5. Busca de pessoas sensível a formatação de CPF (pontuação/traço).
6. Frontend concentrado em um arquivo monolítico (`PessoasModule.tsx` com mais de 21 KB) sem hooks desacoplados.
7. Módulos consumidores (Cemitério, RH, Finance, Protocolo) sem a chave mestra `pessoa_id` nas suas tabelas e sem utilitário de resolução no SDK.

Para maiores detalhes de motivação, consulte [proposal.md](./proposal.md).

## Goals / Non-Goals

**Goals:**
- **Camada de Validação Robusta**: Criar 12 Form Requests dedicados em `Http/Requests`, com validação matemática de CPF (`Documento::valido`), unicidade restrita ao tenant (`tenant_id, cpf_hash`) ignorando o próprio ID em atualizações, e integridade cronológica de vínculos (`inicio <= fim`).
- **Camada de Serialização Segura**: Criar API Resources dedicados em `Http/Resources`, garantindo que apenas `cpf_mascarado` seja retornado, blindando `cpf` puro e `cpf_hash` de qualquer serialização externa.
- **Autorização e Trava de Integridade**: Criar `PessoaPolicy` mapeando permissões `cadastros.pessoas.*` e impedindo a exclusão de pessoas com vínculos ativos.
- **CRUD Completo de Sub-Entidades**: Disponibilizar rotas PUT e DELETE para documentos, endereços e contatos, com promoção transacional atômica de contato principal por tipo.
- **Busca Sanitizada**: Tratar consultas por CPF de 11 dígitos via hash sanitizado diretamente na requisição, mantendo busca aproximada por nome como fallback.
- **Auditoria Transacional Total**: Registrar toda mutação no `AuditLogger` (`audit_logs`) com before/after e tenant_id.
- **Assincronismo Estrito na Importação**: Garantir que o endpoint de importação opere exclusivamente via publicação no `outbox_events` / fila, retornando HTTP 202 com consulta em `sync-logs`.
- **Fatoração Frontend no Padrão do Monorepo**: Decompor o frontend em views e custom hooks (`usePessoas`, `useVinculos`), incorporando componentes canônicos do `@sysgov/ui`.
- **Contratos no SDK (@sysgov/sdk)**: Atualizar `PessoasClient` e tipos correspondentes com métodos para sub-entidades e lookup por documento.
- **Integração Piloto de MDM**: Adicionar `pessoa_id` nullable nas tabelas satélites de Cemitérios, RH, Finance e Protocolo, implementando a vinculação no fluxo de operadores de cemitério.

**Non-Goals:**
- Implementação de algoritmos de deduplicação fuzzy baseados em inteligência artificial.
- Federação ou sincronização multi-direcional entre diferentes bases municipais consorciadas.
- Construção de interfaces para o painel de administração da plataforma (`apps/web`), mantendo o foco no painel do cliente (`apps/web-client`).
- Alterações que quebrem contratos existentes da API v1.

## Decisions

### 1. Centralização da Validação em Form Requests Dedicados
- **Decisão**: Criar classes específicas derivadas de `Illuminate\Foundation\Http\FormRequest` em `apps/api/Modules/Pessoas/Http/Requests/`:
  - `StorePessoaRequest`, `UpdatePessoaRequest`
  - `StoreVinculoRequest`, `EncerrarVinculoRequest`
  - `StoreDocumentoRequest`, `UpdateDocumentoRequest`
  - `StoreEnderecoRequest`, `UpdateEnderecoRequest`
  - `StoreContatoRequest`, `UpdateContatoRequest`
  - `PromoverPessoaRequest`, `ImportarPessoaRequest`
- **Justificativa**: Garante validação prévia ao controller, tipagem estrita de entrada, reutilização e clareza nas mensagens de erro (HTTP 422). O cálculo de unicidade de CPF no update utiliza `Rule::unique('pessoas', 'cpf_hash')->where('tenant_id', $tenantId)->ignore($pessoa->id)`.
- **Alternativas consideradas**:
  - Validação inline em controllers: rejeitada por poluir a camada de orquestração e dificultar reutilização em testes.
  - Validação na camada de serviços: rejeitada porque validações de formato e integridade de protocolo HTTP pertencem à camada de requisição.

### 2. Blindagem de Dados Sensíveis com API Resources
- **Decisão**: Implementar `PessoaResource`, `PessoaVinculoResource`, `PessoaDocumentoResource`, `PessoaEnderecoResource` e `PessoaContatoResource` em `apps/api/Modules/Pessoas/Http/Resources/`.
- **Justificativa**: API Resources estabelecem um contrato imutável de saída. Mesmo que um model seja alterado ou contenha atributos confidenciais, o resource garante que apenas `cpf_mascarado` seja retornado, omitindo `cpf` e `cpf_hash`.
- **Alternativas consideradas**:
  - Utilizar apenas a propriedade `$hidden` do Eloquent Model: rejeitada porque conversões acidentais ou métodos específicos podem vazar dados brutos, além de não padronizar formatações de datas e relações aninhadas.

### 3. Autorização Granular e Regras de Negócio de Recurso via `PessoaPolicy`
- **Decisão**: Criar `PessoaPolicy` com métodos `viewAny`, `view`, `create`, `update`, `delete`, `promote` e `import`, registrando-a no `AuthServiceProvider` do módulo.
  - A regra `delete` verifica se a pessoa possui vínculos vigentes (`vinculos()->whereNull('fim')->orWhere('fim', '>=', now()->toDateString())->exists()`). Caso existam vínculos ativos, a exclusão é rejeitada com código HTTP 403 / exceção de domínio.
- **Justificativa**: Cumpre rigorosamente a exigência do `AGENTS.md` para RBAC e integridade referencial de negócio.
- **Alternativas consideradas**:
  - Checagens manuais com `abort_if` espalhadas pelos métodos dos controllers: rejeitada por dispersão de regras e fragilidade na manutenção.

### 4. Transação Atômica para Contato Principal Único por Tipo
- **Decisão**: A criação, alteração ou exclusão de contatos ocorre dentro de transações de banco de dados (`DB::transaction`).
  - Se um contato é marcado como principal (`principal = true`), todos os outros contatos do mesmo tipo daquela pessoa têm `principal` alterado para `false`.
  - Se um contato principal é excluído, o sistema busca o contato mais recente daquele mesmo tipo da pessoa e o promove a principal (`principal = true`). Se nenhum outro contato daquele tipo restar, a regra é satisfeita naturalmente.
- **Justificativa**: Evita estados intermediários inconsistentes ou concorrência na definição do contato de notificação prioritário.
- **Alternativas consideradas**:
  - Triggers no banco de dados MySQL: rejeitada para manter a lógica de negócio visível, testável e auditável na camada de serviços da aplicação.

### 5. Normalização de Busca por CPF na Listagem
- **Decisão**: No método `listar` de `PessoaService`, o parâmetro de busca `q` tem seus caracteres não-numéricos extraídos via `Documento::somenteDigitos($q)`.
  - Se a string resultante tiver exatamente 11 dígitos, a consulta pesquisa por `cpf_hash = Documento::hash($digitos)`.
  - Caso contrário, a consulta aplica busca textual `where('nome', 'like', "%{$q}%")`.
- **Justificativa**: Permite que usuários busquem CPFs digitados com pontos e traços sem que o sistema precise decifrar todos os registros em memória.
- **Alternativas consideradas**:
  - Pesquisa descritiva sobre o campo cifrado: inviável, pois `encrypted` no Laravel utiliza IV aleatório e impede consultas SQL diretas por igualdade; o `cpf_hash` determinístico é o mecanismo padrão canônico do sistema.

### 6. Integração MDM Satélite via Foreign Key Nullable (`pessoa_id`)
- **Decisão**: Criar migrations seguras nos módulos dependentes:
  - `operadores_cemiterios` em `Modules/Cemiterios`: coluna `pessoa_id` nullable, `foreign('pessoa_id')->references('id')->on('pessoas')->nullOnDelete()`, acompanhada de índice composto `['tenant_id', 'pessoa_id']`.
  - Atualização do `OperadorCemiterioService` e controller para aceitar `pessoa_id` opcional, associando o operador à pessoa correspondente.
  - Migrations preparatórias com o mesmo padrão para `rh_servidores` (ou equivalentes), `finance_fornecedores` e `protocolo_requerentes`.
- **Justificativa**: Não força migrações disruptivas de dados legados, viabiliza adoção progressiva e mantém integridade referencial multi-tenant.
- **Alternativas consideradas**:
  - Tornar `pessoa_id` obrigatório imediatamente: causaria quebra em registros legados sem cadastro prévio em Pessoas.

### 7. Decomposição Modular do Frontend no Web-Client
- **Decisão**: Refatorar `apps/web-client/src/modules/pessoas`:
  - `hooks/usePessoas.ts`: Gerencia paginação, filtros de busca, carregamento e ações CRUD de pessoas.
  - `hooks/useVinculos.ts`: Gerencia adição e encerramento de vínculos com vigência.
  - `hooks/useSubEntidades.ts`: Gerencia documentos, endereços e contatos (com suas regras de edição/exclusão).
  - `views/PessoasListView.tsx`: Listagem com filtros, badges de vínculo e ações rápidas.
  - `views/PessoaDetailView.tsx`: Detalhe da pessoa com abas para vínculos, documentos, endereços, contatos e histórico.
  - `views/PessoaFormModal.tsx`: Cadastro e edição com os componentes do `@sysgov/ui`.
- **Justificativa**: Melhora manutenibilidade, reuso e segue o padrão modular do módulo `Cemiterios`.

## Risks / Trade-offs

- **[Risco de Conflito em Importações Concorrentes]**: Duas requisições simultâneas de importação para o mesmo CPF podem tentar criar o registro em paralelo.
  - *Mitigação*: O worker processa os eventos sequencialmente por tenant/CPF através de lock de cache no Redis (`Redis::funnel` ou `Cache::lock`) antes de executar a criação ou deduplicação.
- **[Risco de Exclusão de Contato Principal sem Sucessor]**: Se a pessoa tiver apenas um telefone e ele for excluído, o tipo fica sem contato principal.
  - *Mitigação*: Isso é um comportamento válido de negócio: a flag é simplesmente liberada sem provocar exceções.
- **[Risco de Bloqueio em Módulos Satélites por Falha em Pessoas]**: Se a criação de pessoa falhar durante o cadastro de um operador de cemitério, o operador não seria criado se dependesse síncrona e estritamente de pessoas.
  - *Mitigação*: `pessoa_id` é nullable; o SDK permite resolver a pessoa previamente ou cadastrá-la antes do vínculo satélite, garantindo resiliência.

## Migration Plan

1. **Backend - Fase 1 (Core Pessoas)**:
   - Implementar Form Requests, Resources e PessoaPolicy.
   - Atualizar rotas e controllers em `Modules/Pessoas`.
   - Implementar testes de feature e isolamento de tenant.
2. **Backend - Fase 2 (Integração Piloto e Consumidores)**:
   - Rodar migration em `Modules/Cemiterios` adicionando `pessoa_id` em `operadores_cemiterios`.
   - Adicionar migrations correspondentes em RH, Finance e Protocolo.
   - Adaptar `OperadorCemiterioService` para suportar `pessoa_id`.
3. **SDK - Fase 3**:
   - Atualizar `packages/sdk/src/modules/pessoas` com novos endpoints de sub-entidades e lookup.
4. **Frontend - Fase 4**:
   - Refatorar `apps/web-client/src/modules/pessoas` em views e hooks utilizando `@sysgov/ui`.
   - Testar navegação, CRUD de sub-entidades e filtros de busca.
