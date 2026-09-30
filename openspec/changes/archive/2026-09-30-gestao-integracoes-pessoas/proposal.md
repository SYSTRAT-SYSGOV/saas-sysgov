# Proposal

## Why

O módulo Pessoas já tem, desde a implementação original, o modelo de dados e o pipeline assíncrono para importar pessoas de sistemas de gestão da prefeitura (`PessoaIntegracao`, `PessoaSyncLog`, `GenericHttpPessoaImportAdapter`, fila via Outbox), mas nenhuma dessas peças é operável: não existe nenhuma rota nem tela para cadastrar uma conexão (`PessoaIntegracao`) por tenant, e a ação "Importar por CPF" da UI depende de haver uma integração ativa — hoje ela sempre falha, porque não há como criar essa configuração. Também não existe nenhuma forma de consultar `PessoaSyncLog` (sucessos, falhas, motivo da falha) nem de reprocessar manualmente uma sincronização que falhou. Esta mudança completa a superfície operável dessa integração que já existe no banco de dados e no backend, sem alterar o desenho de arquitetura já validado (adapter isolado, fila assíncrona, log obrigatório de cada tentativa).

## What Changes

- Endpoints de gestão de integrações (`PessoaIntegracao`) por tenant: listar, criar, editar e ativar/desativar uma conexão com o sistema de gestão da prefeitura (nome, URL, token de API, mapeamento de campos).
- **BREAKING (segurança)**: o `api_token` de `PessoaIntegracao`, hoje armazenado em texto plano na coluna (apenas oculto na serialização JSON), passa a ser armazenado cifrado no banco (`encrypted` cast), no mesmo padrão já usado para `cpf`/`nis` em `Pessoa`. Requer migração de dados dos registros existentes.
- Tela de gestão de integrações em `apps/web-client` (permissão dedicada), para cadastrar/editar essas conexões sem depender de acesso direto ao banco.
- Endpoint de listagem de `PessoaSyncLog` por tenant/integração, com filtro por status (sucesso/falha/não encontrado) e paginação.
- Painel de histórico de sincronização na UI: lista de tentativas com status, contadores e detalhes do erro.
- Ação de reprocessamento manual: a partir de um log com falha, disparar novamente a mesma sincronização (mesmo CPF, mesma integração) pelo fluxo assíncrono já existente (Outbox), sem duplicar o registro de pessoa.
- Fora de escopo desta mudança (decisão explícita): sincronização periódica/agendada (a importação continua sendo sob demanda, por CPF) e suporte a protocolos além de REST configurável (CSV/SFTP/SOAP).

## Capabilities

### New Capabilities
(nenhuma — esta mudança evolui a capability `pessoas` já existente, não introduz um novo domínio)

### Modified Capabilities
- `pessoas`: o requisito "Integração externa resiliente" passa a exigir que a configuração da integração (URL, credenciais, mapeamento de campos) seja gerenciável por um administrador do tenant através de uma interface própria, com credenciais nunca expostas em texto plano, e que o histórico de tentativas de sincronização seja consultável e reprocessável manualmente — não apenas registrado internamente em log.

## Impact

- **Backend** (`apps/api/Modules/Pessoas`): novo `IntegracaoController` (CRUD de `PessoaIntegracao`) e `SyncLogController` (listagem/reprocessamento de `PessoaSyncLog`); nova migração para cifrar `api_token`; novas permissões em `module.json`; rotas em `Routes/api.php`.
- **Frontend** (`apps/web-client/src/modules/pessoas`): novas telas/painéis de gestão de integrações e histórico de sincronização; novos métodos em `pessoasApi`/SDK.
- **SDK** (`packages/sdk/src/modules/pessoas`): novos tipos e métodos de cliente para as duas novas áreas.
- Nenhum impacto em outros módulos — a integração continua isolada dentro de Pessoas, consumida apenas via o pipeline assíncrono (Outbox) já existente.
