# Proposal

## Why

O SYSGOV não possui um núcleo de processos administrativos: cada módulo (Requerimentos, Licita, Cemitérios etc.) registra sua própria tramitação, sem numeração oficial única, sem trilha de localização e sem controle de tempo de permanência por setor. Isso contraria as boas práticas do Governo Federal (referência SEI) e a Lei nº 14.129/2021 (Governo Digital), que exigem processo eletrônico rastreável, com prazos e responsabilização.

O módulo **Protocolo** cria esse núcleo como serviço único com duas portas de entrada — **externa** (cidadão, empresas, outros órgãos) e **interna** (memorandos, ofícios internos, despachos e pareceres que geram ato administrativo) — e com vínculo polimórfico genérico, permitindo que qualquer módulo atual ou futuro se conecte a um processo sem acoplamento rígido. Comunicação informal (e-mail institucional, intranet, mensageria) permanece fora do protocolo.

## What Changes

- **Novo módulo Laravel `Protocolo`** em `apps/api/Modules/Protocolo`, gerado por `php artisan make:module Protocolo`, com `requires: ["Admin", "OrgChart", "Pessoas"]` e sem dependência de módulos de negócio.
- **Modelo de dados tenant-aware** (prefixo `protocolo_`): processos, tipos de tramitação configuráveis, andamentos, documentos, atributos dinâmicos, vínculos polimórficos e sequência de numeração.
- **Numeração oficial `NNNN/AAAA`** sequencial por tenant/ano, gerada em transação com lock.
- **Criação em cascata atômica**: processo + documentos + atributos + primeiro andamento em uma única transação.
- **Tramitação com histórico imutável**: andamento atual único por processo (`and_atual`), ponteiro `ultimo_andamento_id`, registro de recebimento e envio, tempo de permanência por órgão/usuário, rastreamento de localização e alerta de prazos excedidos.
- **Vínculo polimórfico genérico** (`entidade_tipo` + `entidade_id`) com endpoints para criar, consultar e remover vínculos.
- **Promoção de requerimento a processo** (origem externa) via vínculo polimórfico `entidade_tipo='requerimento'`, atualizando `Proposicao.vinculacao_processo_id` na mesma transação, por meio de um contrato de extensão registrado pelo próprio módulo Requerimentos (o Protocolo não referencia classes do Requerimentos).
- **Hierarquia pai-filho** entre processos (`processo_pai_id`).
- **Atributos dinâmicos** com 7 tipos (numerico, texto, lista, lista_multipla, data, decimal, texto_longo), cujo catálogo de tipos e validação ficam em serviço central transversal reutilizável.
- **Dashboard por secretaria/órgão** com contadores por status, origem e tempo médio de tramitação.
- **RBAC**: `protocolo.processos.{view,create,update,tramitar,vincular,promover_requerimento,rastrear,relatorios,delete}` e `protocolo.tipos_tramitacao.manage` (adicionada para a administração de tipos), com escopo ABAC por unidade (`OrgScope`).
- **Frontend `web-client`**: módulo lazy-loaded em `apps/web-client/src/modules/protocolo` (listagem, wizard de criação, promoção de requerimento, detalhe com abas, tramitação, rastreamento, tempo de permanência, dashboard), usando exclusivamente `@sysgov/ui`, e tipos de contrato em `@sysgov/sdk`.
- **Ajuste aditivo no módulo `Requerimentos`**: registro do adaptador de vínculo `requerimento` no seu ServiceProvider, ativo somente quando o Protocolo estiver habilitado.
- **ADRs** ADR-008 a ADR-011 em `openspec/adrs/`.

## Capabilities

### New Capabilities

- `protocolo/processos`: Abertura e ciclo de vida do processo administrativo — numeração `NNNN/AAAA`, origem externa/interna, cascata atômica, hierarquia pai-filho, busca e acompanhamento, exclusão controlada, autorização e auditoria.
- `protocolo/tramitacao`: Andamentos entre órgãos com histórico imutável, andamento atual único, recebimento/envio, tempo de permanência, localização, prazos excedidos e tipos de tramitação configuráveis por tenant.
- `protocolo/vinculos`: Vínculo polimórfico genérico entre processo e entidades de qualquer módulo, e promoção de requerimento a processo.
- `protocolo/documentos-atributos`: Anexação de documentos com integridade (hash) e atributos dinâmicos tipados e validados.
- `protocolo/painel-gestao`: Dashboard e indicadores de processos por secretaria/órgão, status, origem e tempo médio de tramitação.

### Modified Capabilities

<!-- Nenhuma. O ajuste no módulo Requerimentos é aditivo (registro de adaptador) e não altera requisitos de specs principais existentes; a spec de Requerimentos ainda está em change não arquivada (`criar-modulo-requerimentos`). -->

## Impact

- **Backend**: novo `apps/api/Modules/Protocolo` (migrations, models, policies, form requests, services, rotas, seeders, testes); novo serviço transversal de atributos dinâmicos em `apps/api/app/Support`; registro aditivo de adaptador em `Modules/Requerimentos/Providers`.
- **Banco de dados**: 7 novas tabelas `protocolo_*` com `tenant_id` e índices compostos iniciando por tenant; FKs para `org_units`, `pessoas` e `users`.
- **API**: novos endpoints sob `/api/protocolo/*` protegidos por Sanctum, `ResolveTenant` e policies.
- **Frontend**: novo módulo em `apps/web-client/src/modules/protocolo`; regeneração do `moduleRegistry.generated.ts` via `npm run generate:registry`; novos tipos em `packages/sdk`.
- **Armazenamento**: arquivos de documentos no storage de objetos, em caminho segregado por tenant.
- **Sem chamadas externas** em v1; sem valores monetários no escopo (caso surjam, `App\Support\Money`).
- **Fora de escopo (v1)**: módulo Normas, assinatura eletrônica avançada, PJe, workflow gráfico drag-and-drop, diários oficiais externos, integração com SEI/sistemas externos de protocolo, chat interno.
