# Proposal

## Why

O módulo de Cadastro de Pessoas (`apps/api/Modules/Pessoas`) é a base canônica de dados mestres (Master Data Management - MDM) para todo o ecossistema SYSGOV, unificando identidades civis de munícipes, servidores, prestadores e contribuintes sem duplicar registros entre módulos verticais. Atualmente, a implementação base possui lacunas de robustez arquitetural: ausência de Form Requests dedicados, falta de API Resources para garantir que dados sensíveis (CPF em texto puro ou `cpf_hash`) nunca sejam serializados, ausência de uma `PessoaPolicy` com regras de recurso (como a trava de exclusão de pessoas com vínculos vigentes), e falta de CRUD completo (PUT/DELETE) para sub-entidades (documentos, endereços e contatos com garantia de unicidade de contato principal por tipo). Esta proposta estabelece a evolução necessária para transformar o módulo no repositório mestre de identidade civil, integrando-o de forma piloto aos operadores de cemitério e disponibilizando contratos no SDK para consumo por RH, Finance e Protocolo, sem qualquer quebra de compatibilidade na API v1.

## What Changes

- **Validação Centralizada e Tipada (Form Requests)**: Criação de `StorePessoaRequest`, `UpdatePessoaRequest`, `StoreVinculoRequest`, `EncerrarVinculoRequest`, `StoreDocumentoRequest`, `UpdateDocumentoRequest`, `StoreEnderecoRequest`, `UpdateEnderecoRequest`, `StoreContatoRequest`, `UpdateContatoRequest`, `PromoverPessoaRequest` e `ImportarPessoaRequest`. Inclui validação algorítmica de CPF (`Documento::valido`), unicidade restrita ao tenant (`tenant_id, cpf_hash`) com exclusão do próprio registro em atualizações, e validação de vigência temporal de vínculos (`inicio <= fim`).
- **Serialização Estrita e Proteção LGPD (API Resources)**: Criação de `PessoaResource`, `PessoaVinculoResource`, `PessoaDocumentoResource`, `PessoaEnderecoResource` e `PessoaContatoResource`, garantindo que apenas `cpf_mascarado` seja retornado nas respostas JSON, blindando `cpf` puro e `cpf_hash` de qualquer exposição externa.
- **Autorização e Regras de Negócio de Recurso (Policy)**: Criação de `PessoaPolicy` registrada no `AuthServiceProvider`, mapeando as permissões `cadastros.pessoas.*` e aplicando travas de integridade referencial de negócio: bloqueio de exclusão física ou lógica de pessoa com vínculos ativos (exigindo encerramento prévio), e permissões estritas para promoção a usuário (`cadastros.pessoas.promote`) e importação (`cadastros.pessoas.import`).
- **CRUD Completo de Sub-Entidades com Garantia de Contato Principal**: Adição de rotas RESTful PUT e DELETE para documentos, endereços e contatos, com lógica transacional atômica que assegura no máximo um contato principal por tipo (`celular`, `email`, `telefone`). Ao excluir ou desmarcar o contato principal, o sistema promove automaticamente outro contato do mesmo tipo ou libera a sinalização.
- **Busca Normalizada por CPF**: Ajuste no endpoint de listagem para que consultas contendo 11 dígitos numéricos (com ou sem pontuação/máscara) realizem busca direta por `cpf_hash` sanitizado, com fallback transparente para pesquisa textual por nome.
- **Auditoria Transacional Abrangente**: Registro sistemático de auditoria via `AuditLogger` em todas as mutações (criação, edição, exclusão, sub-entidades, promoção, importação e deduplicações) com detalhamento de autor, tenant e estados anterior/posterior.
- **Processamento Assíncrono de Importação**: Garantia de que a requisição de importação apenas despache evento na tabela `outbox_events` / fila de segundo plano, assegurando resposta HTTP imediata (202 Accepted) e acompanhamento transparente via `sync-logs`.
- **Fatoração do Frontend Web-Client**: Decomposição de `PessoasModule.tsx` em hooks modulares (`usePessoas`, `useVinculos`) e views especializadas no padrão adotado em cemitérios, incluindo interfaces para edição e exclusão de documentos, endereços e contatos com componentes canônicos do `@sysgov/ui`.
- **Expansão do SDK (@sysgov/sdk)**: Atualização do cliente e tipagens TypeScript para cobrir o CRUD de sub-entidades e disponibilizar método de lookup por documento para consumo simplificado por outros módulos.
- **Habilitação de Consumo Master Data**: Adição de migrations seguras com coluna `pessoa_id` (foreignId nullable com índice composto `[tenant_id, pessoa_id]`) nos módulos Cemitérios, RH, Finance e Protocolo, implementando integração piloto no cadastro e gestão de operadores de cemitério.

## Capabilities

### New Capabilities
<!-- Nenhuma capacidade inteiramente nova foi introduzida como módulo isolado; a evolução ocorre sobre o domínio existente de Pessoas. -->

### Modified Capabilities
- `pessoas`: Adiciona requisitos obrigatórios de validação formal por Form Requests, serialização estrita sem exposição de CPF via API Resources, controle fino de autorização e integridade via PessoaPolicy, operações completas de atualização e exclusão de sub-entidades com contato principal exclusivo por tipo, normalização de busca por CPF formatado, auditoria transacional de mutações, assincronismo na importação e referência cadastral unificada via `pessoa_id` para módulos consumidores.

## Impact

- **Backend (`apps/api/Modules/Pessoas`)**:
  - Novos arquivos em `Http/Requests/` (12 requests dedicados).
  - Novos arquivos em `Http/Resources/` (5 resources dedicados).
  - Nova policy `Policies/PessoaPolicy.php` e registro em `Providers/AuthServiceProvider.php`.
  - Rotas ampliadas em `Routes/api.php` para PUT e DELETE de sub-entidades.
  - Atualização dos controllers `PessoaController`, `ImportacaoController` e `PromocaoController`.
  - Ajustes em `Services/PessoaService.php` e `Services/VinculoService.php`.
  - Criação de factories e seeders para o módulo.
- **Backend Consumidor (`apps/api/Modules/Cemiterios`, `RH`, `Finance`, `Protocolo`)**:
  - Novas migrations adicionando `pessoa_id` (nullable) nas tabelas principais de referência (iniciando por `operadores_cemiterios`).
- **Frontend (`apps/web-client/src/modules/pessoas`)**:
  - Fatiamento de `PessoasModule.tsx` em `views/` e `hooks/`.
  - Formulários e ações de edição/remoção de documentos, endereços e contatos.
  - Alinhamento visual estrito ao `@sysgov/ui` e tipografia `font-mono tabular-nums` para dados técnicos.
- **SDK (`packages/sdk/src/modules/pessoas`)**:
  - Adição de métodos para CRUD de sub-entidades (`updateDocumento`, `deleteDocumento`, `updateEndereco`, etc.) e método utilitário de resolução/lookup por CPF.
- **Testes Automatizados**:
  - Testes de Form Requests, PessoaPolicy, exclusão protegida de pessoa com vínculos, promoção de contato principal, isolamento multi-tenant de CPF e assincronicidade de importação.
