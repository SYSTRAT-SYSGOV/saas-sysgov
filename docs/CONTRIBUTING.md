# Guia de Contribuição e Ciclo de Vida de Módulos — SYSGOV

Este documento descreve o fluxo oficial e padronizado para criação, registro, provisionamento e integração de novos módulos de negócio no ecossistema **SYSGOV**.

---

## 🏛️ 1. Princípios Arquiteturais Obrigatórios
- **Backend (`apps/api`)**: Monólito modular Laravel 13 (`nwidart/laravel-modules`) em `Modules/{Nome}`.
- **Isolamento de Dados Multi-Tenant**: Toda tabela possui coluna `tenant_id` obrigatória, índice composto iniciando por `tenant_id` e models usando a trait `App\Models\Concerns\TenantAware`.
- **Frontend (`apps/web-client`)**: App Shell React 19 + TypeScript + Tailwind CSS com roteamento dinâmico orientado a metadados via `MODULE_REGISTRY`.
- **SDK Compartilhado (`packages/sdk`)**: Contratos modulares isolados em `packages/sdk/src/modules/{alias}` para evitar colisões com o núcleo.
- **Padrão Visual Estrito**: Dados técnicos e numéricos (R$, %, CNPJ, CPF, datas, códigos) obrigatoriamente formatados com `JetBrains Mono` (`font-mono tabular-nums`). Cores e tokens extraídos unicamente de `DESIGN_SYSTEM.md`.
- **Case de pastas PHP igual ao namespace**: em `apps/api`, o caminho de qualquer arquivo PHP (incluindo maiúsculas/minúsculas) deve bater exatamente com o namespace declarado nele — ex.: `Database\Seeders\FooSeeder` mora em `database/Seeders/FooSeeder.php`, nunca `database/seeders/`. Isso importa porque filesystems case-insensitive (Windows, macOS padrão) deixam passar uma pasta com case errado sem erro nenhum, mas o autoload do Composer quebra silenciosamente em produção/CI (Linux) — a classe some do autoload sem exception nenhuma até alguém tentar usá-la. **Não dependa só de revisão visual**: rode `composer dump-autoload --optimize --strict-psr` em `apps/api` (o CI já faz isso a cada push/PR) — ele falha o build se qualquer classe tiver esse tipo de divergência.

---

## 🚀 2. Fluxo Ponta a Ponta: "Novo Módulo"

O fluxo completo para que um novo módulo de negócio seja concebido e apareça no painel do cliente compõe-se de 7 etapas:

```
[1. make:module] ──> [2. Contrato SDK] ──> [3. Componente Client] ──> [4. module:register]
                                                                               │
[7. Cliente (Roteamento & Sidebar)] <── [6. Provisionamento] <── [5. generate:registry]
```

### Passo 1 — Executar o Scaffold do Backend
No diretório `apps/api`:
```bash
php artisan make:module Frota
```
O comando gera automaticamente em `apps/api/Modules/Frota/`:
- `module.json` (metadados de módulo, ícone, permissões e rota padrão).
- `Providers/FrotaServiceProvider.php` e `Providers/RouteServiceProvider.php`.
- `Routes/api.php` protegidas por `['api', 'auth:sanctum', 'resolve.tenant']`.
- `Models/FrotaItem.php` com trait `TenantAware`.
- `Database/Migrations/..._create_frota_items_table.php` (com `tenant_id` e índices compostos).
- `Policies/FrotaItemPolicy.php` (autorização server-side).
- `Http/Controllers/FrotaController.php` (com auditoria e publicação Outbox).
- `Tests/Feature/TenantIsolationTest.php` (teste de isolamento multi-tenant).

Execute as migrations:
```bash
php artisan migrate
```

Valide o isolamento:
```bash
php artisan test --filter=TenantIsolationTest
```

---

### Passo 2 — Padronizar o Contrato no SDK (`packages/sdk`)
Cada módulo novo declara seus tipos e métodos em uma pasta isolada dentro de `packages/sdk/src/modules/{alias}/`:

1. Crie a pasta `packages/sdk/src/modules/frota/`.
2. Adicione `types.ts`:
   ```ts
   export interface FrotaVeiculo {
     id: number;
     tenant_id: number;
     placa: string;
     modelo: string;
     ano: number;
     status: string;
   }
   export interface CreateFrotaVeiculoInput {
     placa: string;
     modelo: string;
     ano: number;
   }
   ```
3. Adicione `client.ts`:
   ```ts
   import type { ApiRequester, BaseModuleClient } from '../base';
   import type { FrotaVeiculo, CreateFrotaVeiculoInput } from './types';

   export class FrotaModuleClient implements BaseModuleClient {
     readonly moduleName = 'frota';
     constructor(private readonly api: ApiRequester) {}

     async list(): Promise<{ data: FrotaVeiculo[] }> {
       return this.api.request('/frota');
     }
     async create(input: CreateFrotaVeiculoInput): Promise<{ data: FrotaVeiculo }> {
       return this.api.request('/frota', { method: 'POST', body: JSON.stringify(input) });
     }
   }
   ```
4. Adicione `index.ts`:
   ```ts
   export * from './types';
   export * from './client';
   ```
5. Registre a exportação em `packages/sdk/src/index.ts`:
   ```ts
   export * as FrotaSdk from './modules/frota';
   export * from './modules/frota';
   ```

---

### Passo 3 — Criar o Componente no Web-Client
Crie a tela do módulo em `apps/web-client/src/modules/frota/FrotaModule.tsx`:
```tsx
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export const FrotaModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Frotas"
        subtitle="Controle de veículos oficiais, manutenções e abastecimento"
      />
      {/* Conteúdo do módulo seguindo o DESIGN_SYSTEM.md */}
    </div>
  );
};

export default FrotaModule;
```
> **Nota:** Todos os dados técnicos (placas, quilometragens, valores em R$, datas) devem usar `<span className="font-mono tabular-nums">`.

---

### Passo 4 — Registrar o Módulo no Catálogo da Plataforma
No diretório `apps/api`:
```bash
php artisan module:register Frota
```
O comando lê o `module.json` e realiza atomicamente em transação:
1. Registra/atualiza o módulo no catálogo (`modules`).
2. Cria as permissões padrão (`frota.view`, `frota.create`, `frota.update`, `frota.delete`) na tabela `permissions` e as vincula ao módulo (`module_permission`).
3. Cria o grupo de menu correspondente (`menu_groups`), cria o item de menu padrão (`menu_items`) e vincula o grupo ao registro do módulo.

---

### Passo 5 — Atualizar o Registry do Cliente
Execute o gerador automático:
```bash
npm run generate:registry
```
O script `scripts/generate-module-registry.js`:
- Inspeciona os módulos registrados no backend.
- Conecta o componente `FrotaModule.tsx` ao registro de rotas.
- Atualiza `apps/web-client/src/config/moduleRegistry.generated.ts`.

> **Zero Edição Manual no Shell:** O `AppRouter.tsx` do `web-client` itera automaticamente sobre `MODULE_REGISTRY`. O novo módulo ganha sua rota, proteção de permissão e lazy loading **sem que nenhuma linha de `AppRouter.tsx` precise ser editada**!

---

### Passo 6 — Provisionar o Módulo para o Tenant
No painel administrativo SYSTRAT (`apps/web`, porta 5173):
1. Acesse **Organizações & Tenants**.
2. Selecione o município/cliente desejado.
3. Na seção de Módulos, ative o módulo **Frota**.
4. Defina o valor mensal acordado e a vigência contratual.

Alternativamente, via CLI/tinker em ambiente de desenvolvimento:
```php
$tenant = Tenant::where('slug', 'araucaria-pr')->first();
$module = Module::where('alias', 'frota')->first();
$tenant->modules()->syncWithoutDetaching([$module->id => ['enabled' => true]]);
```

---

### Passo 7 — Verificação no Navegador
1. Inicie os servidores de desenvolvimento:
   ```bash
   npm run dev:all
   ```
2. Acesse o portal do cliente (`http://localhost:5174`).
3. Ao logar com um usuário com permissão `frota.view`:
   - O item **Gestão de Frotas** aparece automaticamente na Sidebar dentro do grupo configurado.
   - Ao clicar no link, o `AppRouter` carrega o componente sob demanda via `React.lazy`.
   - Se o usuário não possuir a permissão ou se o módulo for desativado para o tenant, a barreira de segurança redireciona para `403 Forbidden`.

---

## 📋 3. Checklist de Qualidade antes do Merge (Gate Obrigatório)

- [ ] A migration possui `tenant_id` obrigatório e índices compostos `['tenant_id', ...]`?
- [ ] O Model Eloquent utiliza a trait `TenantAware`?
- [ ] O `TenantIsolationTest` está verde (validação de isolamento entre Tenant A e Tenant B)?
- [ ] O contrato do SDK foi declarado em `packages/sdk/src/modules/{alias}` sem poluir o núcleo?
- [ ] O `moduleRegistry` foi atualizado via `npm run generate:registry`?
- [ ] Nenhuma linha de `AppRouter.tsx` precisou de edição manual forçada?
- [ ] Todos os dados numéricos, monetários, percentuais e códigos no frontend usam `font-mono tabular-nums`?
- [ ] `npm run typecheck` e `npm run build` executam com código de saída 0 em todos os workspaces?
