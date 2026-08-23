---
name: sysgov-module-scaffolding
description: Guia completo para criação, expansão e integração de novos módulos de negócio no ecossistema SYSGOV (Laravel Modular + React App Shell), garantindo conformidade com multi-tenant estrito, isolamento de dados, padrão Outbox, auditoria imutável e Design System.
---

# SYSGOV — Skill de Criação e Expansão de Módulos de Negócio

Esta skill orienta qualquer Inteligência Artificial (ou desenvolvedor) na criação de novos módulos no ecossistema **SYSGOV**, garantindo conformidade arquitetural com o monólito modular Laravel (`apps/api`), frontend React (`apps/web`), SDK TypeScript (`packages/sdk`) e Design System (`packages/ui`).

---

## 🎯 Regras Inegociáveis (Golden Rules)

1. **Unidade de Implantação**: Todo código de backend DEVE residir em `apps/api/Modules/{NomeDoModulo}` como um módulo independente gerenciado pelo pacote `nwidart/laravel-modules`.
2. **Multi-Tenant Estrito**: Toda tabela de negócio DEVE ter `tenant_id` obrigatório + índices compostos iniciando por `tenant_id`. Todo model DEVE usar a trait `TenantAware`.
3. **Padrão Outbox**: NUNCA fazer chamadas HTTP externas síncronas em Controllers. Integrações com PNCP, bancos, Siconfi e notificações DEVEM ser gravadas como eventos na tabela `outbox_messages`.
4. **Valores Monetários**: NUNCA usar `float` para dinheiro. Use sempre centavos inteiros (`int $cents`) encapsulados pela classe `App\Support\Money`.
5. **Auditoria Obrigatória**: Toda mutação de dados (criação, edição, exclusão) DEVE registrar um log na tabela `audit_logs` usando `AuditLogger`.
6. **Frontend Tipografia**: Qualquer dado numérico, monetário (R$), percentual (%), CNPJ, CPF, datas ou códigos DEVE usar `JetBrains Mono` (`font-mono tabular-nums`).

---

## 🚀 Passo a Passo para Criar um Novo Módulo

### Passo 1: Executar o Scaffold com o Comando Oficial

No diretório `apps/api`, execute:
```bash
php artisan make:module {NomeDoModulo}
```
*Exemplo: `php artisan make:module Obras` ou `php artisan make:module Protocol`*

Este comando gera automaticamente a estrutura oficial completa em `apps/api/Modules/{NomeDoModulo}`:
```text
Modules/{NomeDoModulo}/
├── Config/
├── Database/
│   ├── Migrations/               # Migration tenant-aware com índices compostos
│   └── Seeders/
├── Events/                       # Eventos de domínio
├── Http/
│   ├── Controllers/             # Controllers com injeção de Audit e Outbox
│   ├── Middleware/
│   ├── Requests/                # Form Requests de validação
│   └── Resources/               # API Resources para serialização JSON
├── Listeners/
├── Models/                      # Models Eloquent usando a trait TenantAware
├── Policies/                    # Policies server-side de autorização de objeto
├── Providers/
│   ├── {Nome}ServiceProvider.php
│   └── RouteServiceProvider.php # Rotas api/{modulo} com auth:sanctum e resolve.tenant
├── Routes/
│   └── api.php
├── Services/                    # Lógica de negócio e regras de domínio
├── Tests/
│   └── Feature/
│       └── TenantIsolationTest.php # Teste automatizado de isolamento Tenant A vs Tenant B
└── module.json                  # Metadados de prioridade, providers e menu
```

---

### Passo 2: Definir a Migration (`Database/Migrations/`)

Certifique-se de que toda migration siga o padrão:
```php
Schema::create('{alias}_items', function (Blueprint $table): void {
    $table->id();
    $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
    $table->string('code')->nullable();
    $table->string('title');
    $table->unsignedBigInteger('amount_cents')->default(0); // Centavos inteiros
    $table->string('status')->default('active');
    $table->json('metadata')->nullable();
    $table->timestamps();

    // Índices obrigatórios:
    $table->index(['tenant_id', 'created_at']);
    $table->index(['tenant_id', 'status']);
    $table->unique(['tenant_id', 'code']); // Unicidade por município
});
```

---

### Passo 3: Configurar o Model com `TenantAware` (`Models/`)

```php
namespace Modules\{Nome}\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class {Nome}Item extends Model
{
    use TenantAware; // Injeta Global Scope e auto-set de tenant_id

    protected $table = '{alias}_items';
    protected $fillable = ['tenant_id', 'code', 'title', 'amount_cents', 'status', 'metadata'];
    protected $casts = [
        'tenant_id' => 'integer',
        'amount_cents' => 'integer',
        'metadata' => 'array',
    ];
}
```

---

### Passo 4: Controller com Auditoria e Outbox (`Http/Controllers/`)

```php
namespace Modules\{Nome}\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\{Nome}\Models\{Nome}Item;

final class {Nome}Controller extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:0'],
        ]);

        $item = {Nome}Item::create($validated);

        // Trilha imutável
        $this->audit->record('{alias}', 'item.created', "{Nome}Item #{$item->id}", null, $item->toArray());

        // Evento assíncrono na Outbox
        $this->outbox->publish('{alias}', 'ItemCreated', ['id' => $item->id, 'title' => $item->title]);

        return response()->json($item, 201);
    }
}
```

---

### Passo 5: Executar Teste de Isolamento Multi-Tenant

Execute a suíte de testes em `apps/api`:
```bash
php artisan test --filter=TenantIsolationTest
```

O teste valida obrigatoriamente que:
1. Registros criados no **Tenant A** não aparecem no **Tenant B**.
2. É impossível criar registros sem o contexto do tenant resolvido (`LogicException`).

---

### Passo 6: Integração no Frontend (`apps/web`)

1. **Registrar Navegação**: Em `apps/web/src/config/adminNavigation.ts`, adicione o novo item no grupo correspondente.
2. **Criar Tela/Componente**: Em `apps/web/src/components/`, crie o componente de visualização utilizando a paleta oficial (Dark Navy, Emerald, Indigo, Cyan, Amber, Rose).
3. **Formatação Técnica**: Use `<span className="font-mono tabular-nums">` para todos os valores de R$, % e códigos.
4. **Lazy Loading**: Importe o componente sob demanda via `React.lazy` no `DashboardPage.tsx` ou App Shell.

---

## ✅ Checklist de Qualidade antes de Concluir

- [ ] Migration possui coluna `tenant_id` e índice composto `['tenant_id', '...']`?
- [ ] Model inclui a trait `TenantAware`?
- [ ] Valores em dinheiro usam centavos inteiros (`amount_cents`), nunca `float`?
- [ ] Ações de mutação chamam `$audit->record(...)` e `$outbox->publish(...)`?
- [ ] Frontend usa `font-mono tabular-nums` para dados técnicos?
- [ ] Teste de isolamento multi-tenant passou com sucesso?
