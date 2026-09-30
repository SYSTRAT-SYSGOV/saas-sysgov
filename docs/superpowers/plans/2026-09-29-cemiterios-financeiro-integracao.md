# Cemitérios — Integração ERP Financeiro e Cadastro Único do Munícipe: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a aba Financeiro do módulo Cemitérios para consultar o cadastro único de munícipes da prefeitura ao cadastrar concessionários e para exportar/confirmar o pagamento de guias com o ERP financeiro externo da prefeitura, sem quebrar nenhum fluxo manual existente.

**Architecture:** Duas integrações plugáveis por tenant (`driver` fixo `generic_rest` + `field_mappings` configuráveis), seguindo exatamente o padrão já usado em `Modules\Capd\Models\RhIntegracao`/`RhIntegrationService`: tabelas de configuração por tenant, adapter HTTP genérico, efeito externo sempre assíncrono via `App\Support\OutboxPublisher` + `App\Events\OutboxMessage`, autenticação inbound por API key em cabeçalho customizado. Consulta ao cadastro único é síncrona e pontual (sem importação em massa); exportação de guia ao ERP é assíncrona (Outbox); confirmação de pagamento do ERP é um endpoint público autenticado por API key, mesmo modelo de `RhApiController`.

**Tech Stack:** Laravel 13 / PHP 8.4 (`apps/api/Modules/Cemiterios`), React 19 + TS (`apps/web-client/src/modules/cemiterios`), PHPUnit, Vitest/tsc.

**Spec:** `docs/superpowers/specs/2026-09-29-cemiterios-financeiro-integracao-design.md`

## Global Constraints

- Toda tabela nova tem `tenant_id` com índice; todo model novo usa `App\Models\Concerns\TenantAware`.
- Todo módulo precisa de teste de isolamento por tenant cobrindo toda tabela nova — `Modules\Cemiterios\Tests\Feature\TenantIsolationTest::modelos()` descobre modelos automaticamente via `glob(Models/*.php)`, então `TenantIsolationTest::popular()` **precisa** ganhar uma linha de cada model novo, senão o teste existente quebra.
- Nenhuma chamada HTTP externa dentro do ciclo de uma requisição do painel — sempre `OutboxPublisher::dispatch()`/`->publish()` e um listener em `Event::listen(OutboxMessage::class, ...)`, processado por `php artisan outbox:process`.
- Toda mutação relevante é registrada via `App\Support\AuditLogger::record(string $module, string $action, string $resource, ?array $before, ?array $after)`.
- Autorização é sempre no servidor via `AutorizaPermissao::autorizar($request, 'permissao')`; nunca confiar em nada vindo do frontend.
- Valores monetários seguem em `int` centavos — nenhum `float` novo.
- Dados de terceiro sensíveis (CPF/RG/NIS/nome da mãe) usam `'encrypted'` no `$casts` do Eloquent, seguindo o padrão de `Concessionario`.
- Commits em Conventional Commits; `composer test` (backend) e `npm run typecheck` (frontend, workspace `apps/web-client`) devem passar antes de cada commit que altera código.

## Review Focus

- Integração de ERP inativa ou inexistente para o tenant: emitir uma guia SHALL continuar funcionando normalmente e a guia permanece `erp_status = 'nao_enviada'`, sem exceção visível ao usuário (Task 8/9).
- CPF/CNPJ não encontrado (ou API externa fora do ar) na consulta ao Cadastro Único: o cadastro manual do concessionário SHALL continuar possível, sem travar a tela (Task 3).
- Falha de rede/HTTP ao exportar a guia ao ERP: a guia SHALL ficar marcada `erp_status = 'erro'` com `erp_ultimo_erro` preenchido, sem derrubar o worker do Outbox nem duplicar o envio no próximo processamento (Task 9).
- Confirmação de pagamento duplicada (o ERP chama o webhook duas vezes para a mesma guia): a segunda chamada SHALL ser rejeitada com erro de regra de negócio, nunca sobrescrever `pago_em`/`valor_pago_centavos` silenciosamente (Task 10).
- Confirmação de pagamento com a API key de um tenant tentando baixar guia de outro tenant (`erp_referencia_externa`/`numero` colidentes entre tenants): SHALL retornar 404, nunca baixar a guia errada (Task 10).

---

## Task 1: Concessionário — campos compatíveis com o Cadastro Único

**Files:**
- Create: `apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120000_add_cadastro_unico_fields_to_concession_holders.php`
- Modify: `apps/api/Modules/Cemiterios/Models/Concessionario.php`
- Modify: `apps/api/Modules/Cemiterios/Http/Controllers/ConcessaoController.php:258-283` (método `validarTitular`)
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (novo arquivo)

**Interfaces:**
- Produces: colunas `rg`, `data_nascimento`, `nome_mae`, `nis`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cadastro_unico_ref`, `sincronizado_em`, `fonte` (`'manual'|'cadastro_unico'`, default `'manual'`) em `concession_holders`; todas nullable exceto `fonte`.

- [ ] **Step 1: Escrever o teste que falha**

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: docs/superpowers/specs/2026-09-29-cemiterios-financeiro-integracao-design.md */
final class IntegracoesTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_cadastra_concessionario_com_campos_do_cadastro_unico(): void
    {
        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/cemiterios/concessionarios', [
                'nome' => 'Maria Titular',
                'documento' => $this->cpfValido(),
                'rg' => '1234567',
                'data_nascimento' => '1970-05-10',
                'nome_mae' => 'Joana Titular',
                'nis' => '12345678901',
                'cep' => '80000-000',
                'logradouro' => 'Rua das Flores',
                'numero' => '100',
                'bairro' => 'Centro',
                'cidade' => 'Curitiba',
                'uf' => 'PR',
                'base_legal' => 'execucao_contrato',
            ]);

        $resposta->assertCreated();
        $titular = Concessionario::findOrFail($resposta->json('id'));
        self::assertSame('1234567', $titular->rg);
        self::assertSame('1970-05-10', $titular->data_nascimento->toDateString());
        self::assertSame('Joana Titular', $titular->nome_mae);
        self::assertSame('Curitiba', $titular->cidade);
        self::assertSame('manual', $titular->fonte);
        self::assertNull($titular->sincronizado_em);
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php`
Expected: FAIL — `422 Unprocessable` (campos desconhecidos não são rejeitados, mas também não persistem) ou erro de coluna inexistente (`SQLSTATE... no such column: rg`), pois a migration e a validação ainda não existem.

- [ ] **Step 3: Migration**

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->string('rg')->nullable()->after('documento');
            $table->date('data_nascimento')->nullable()->after('rg');
            $table->string('nome_mae')->nullable()->after('data_nascimento');
            $table->string('nis')->nullable()->after('nome_mae');
            $table->string('cep', 9)->nullable()->after('endereco');
            $table->string('logradouro')->nullable()->after('cep');
            $table->string('numero', 20)->nullable()->after('logradouro');
            $table->string('complemento')->nullable()->after('numero');
            $table->string('bairro')->nullable()->after('complemento');
            $table->string('cidade')->nullable()->after('bairro');
            $table->string('uf', 2)->nullable()->after('cidade');
            $table->string('cadastro_unico_ref')->nullable()->after('uf');
            $table->timestamp('sincronizado_em')->nullable()->after('cadastro_unico_ref');
            $table->string('fonte', 20)->default('manual')->after('sincronizado_em');
        });
    }

    public function down(): void
    {
        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->dropColumn([
                'rg', 'data_nascimento', 'nome_mae', 'nis', 'cep', 'logradouro', 'numero',
                'complemento', 'bairro', 'cidade', 'uf', 'cadastro_unico_ref', 'sincronizado_em', 'fonte',
            ]);
        });
    }
};
```

Depois, editar `Concessionario.php` — trocar o bloco `protected $casts` por:

```php
    protected $casts = [
        'documento' => 'encrypted',
        'email' => 'encrypted',
        'telefone' => 'encrypted',
        'rg' => 'encrypted',
        'nome_mae' => 'encrypted',
        'nis' => 'encrypted',
        'titular_falecido' => 'boolean',
        'data_falecimento_titular' => 'date',
        'data_nascimento' => 'date',
        'sincronizado_em' => 'datetime',
    ];
```

E adicionar as propriedades no docblock acima da classe (após `@property string|null $endereco`):

```php
 * @property string|null $rg
 * @property \Illuminate\Support\Carbon|null $data_nascimento
 * @property string|null $nome_mae
 * @property string|null $nis
 * @property string|null $cep
 * @property string|null $logradouro
 * @property string|null $numero
 * @property string|null $complemento
 * @property string|null $bairro
 * @property string|null $cidade
 * @property string|null $uf
 * @property string|null $cadastro_unico_ref
 * @property \Illuminate\Support\Carbon|null $sincronizado_em
 * @property string $fonte
```

Em `ConcessaoController.php`, dentro de `validarTitular` (`ConcessaoController.php:258-283`), adicionar estas regras ao array retornado por `$request->validate([...])`, logo após a linha `'data_falecimento_titular' => ['nullable', 'date'],`:

```php
            'rg' => ['nullable', 'string', 'max:20'],
            'data_nascimento' => ['nullable', 'date', 'before:today'],
            'nome_mae' => ['nullable', 'string', 'max:255'],
            'nis' => ['nullable', 'string', 'max:20'],
            'cep' => ['nullable', 'string', 'max:9'],
            'logradouro' => ['nullable', 'string', 'max:255'],
            'numero' => ['nullable', 'string', 'max:20'],
            'complemento' => ['nullable', 'string', 'max:100'],
            'bairro' => ['nullable', 'string', 'max:100'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'uf' => ['nullable', 'string', 'size:2'],
            'cadastro_unico_ref' => ['nullable', 'string', 'max:100'],
            'fonte' => ['sometimes', Rule::in(['manual', 'cadastro_unico'])],
```

E em `storeTitular`/`updateTitular` (`ConcessaoController.php:55-83`), logo antes de `Concessionario::create($dados + ...)` e de `$titular->update($dados)` respectivamente, inserir:

```php
        if (($dados['fonte'] ?? null) === 'cadastro_unico') {
            $dados['sincronizado_em'] = now();
        }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120000_add_cadastro_unico_fields_to_concession_holders.php apps/api/Modules/Cemiterios/Models/Concessionario.php apps/api/Modules/Cemiterios/Http/Controllers/ConcessaoController.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): concessionario ganha campos compativeis com cadastro unico do municipe"
```

---

## Task 2: Tabela e modelo de integração do Cadastro Único

**Files:**
- Create: `apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120100_create_cemetery_cadastro_unico_integracoes_table.php`
- Create: `apps/api/Modules/Cemiterios/Models/CadastroUnicoIntegracao.php`
- Modify: `apps/api/Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php:109-215` (`popular()`, `$this->ids` não precisa mudar)
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar teste)

**Interfaces:**
- Produces: `Modules\Cemiterios\Models\CadastroUnicoIntegracao` — colunas `id, tenant_id, nome, driver, api_url, api_token, field_mappings (array), is_active (bool), ultima_consulta_em (datetime), timestamps`. `TenantAware`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao `IntegracoesTest.php`:

```php
    public function test_integracao_de_cadastro_unico_e_isolada_por_tenant(): void
    {
        \Modules\Cemiterios\Models\CadastroUnicoIntegracao::create([
            'nome' => 'Cadastro Único Municipal',
            'driver' => 'generic_rest',
            'api_url' => 'https://prefeitura.example/api/cadastro-unico',
            'is_active' => true,
        ]);

        self::assertSame(1, \Modules\Cemiterios\Models\CadastroUnicoIntegracao::count());

        $outroTenant = $this->criarTenant('outro-tenant');
        $this->noTenant($outroTenant);
        self::assertSame(0, \Modules\Cemiterios\Models\CadastroUnicoIntegracao::count());
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_integracao_de_cadastro_unico_e_isolada_por_tenant`
Expected: FAIL — classe `CadastroUnicoIntegracao` não existe.

- [ ] **Step 3: Migration e model**

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_cadastro_unico_integracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('driver', 20)->default('generic_rest');
            $table->string('api_url', 500)->nullable();
            $table->text('api_token')->nullable();
            $table->json('field_mappings')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('ultima_consulta_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_cadastro_unico_integracoes');
    }
};
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Configuração por tenant da consulta ao cadastro único de munícipes da
 * prefeitura (fora do SYSGOV). Consulta pontual por CPF, nunca sincronização
 * em massa (LGPD — RN-05).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $driver
 * @property string|null $api_url
 * @property string|null $api_token
 * @property array<string, string>|null $field_mappings
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $ultima_consulta_em
 */
final class CadastroUnicoIntegracao extends Model
{
    use TenantAware;

    protected $table = 'cemetery_cadastro_unico_integracoes';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['api_token'];

    protected $casts = [
        'field_mappings' => 'array',
        'is_active' => 'boolean',
        'ultima_consulta_em' => 'datetime',
    ];
}
```

Em `TenantIsolationTest.php`, dentro de `popular()` (`TenantIsolationTest.php:109-215`), adicionar antes da linha `$this->ids = [...]`:

```php
        \Modules\Cemiterios\Models\CadastroUnicoIntegracao::create([
            'nome' => 'Cadastro Único Municipal', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api',
        ]);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php`
Expected: PASS (inclui o teste genérico `test_tenant_b_nao_le_nenhuma_tabela_do_tenant_a`, que agora também cobre `CadastroUnicoIntegracao` automaticamente).

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120100_create_cemetery_cadastro_unico_integracoes_table.php apps/api/Modules/Cemiterios/Models/CadastroUnicoIntegracao.php apps/api/Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): tabela e modelo de integracao do cadastro unico do municipe"
```

---

## Task 3: Adapter genérico e serviço de consulta ao Cadastro Único

**Files:**
- Create: `apps/api/Modules/Cemiterios/Contracts/CadastroUnicoAdapterInterface.php`
- Create: `apps/api/Modules/Cemiterios/Services/Adapters/GenericHttpCadastroUnicoAdapter.php`
- Create: `apps/api/Modules/Cemiterios/Services/CadastroUnicoService.php`
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar testes)

**Interfaces:**
- Consumes: `Modules\Cemiterios\Models\CadastroUnicoIntegracao` (Task 2); `App\Support\AuditLogger::record()`; `Modules\Cemiterios\Support\Documento::somenteDigitos()`/`mascarar()`.
- Produces: `CadastroUnicoService::consultar(string $documento): ?array` — chamado pelas Tasks 4 e 5.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_consulta_ao_cadastro_unico_mapeia_campos_e_audita(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            'prefeitura.example/*' => \Illuminate\Support\Facades\Http::response([
                'nomeCompleto' => 'João da Silva',
                'documentoRg' => '9876543',
                'endereco' => ['cep' => '80000-000', 'bairro' => 'Centro'],
            ]),
        ]);
        \Modules\Cemiterios\Models\CadastroUnicoIntegracao::create([
            'nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api',
            'is_active' => true, 'field_mappings' => ['nome' => 'nomeCompleto', 'rg' => 'documentoRg'],
        ]);

        $resultado = app(\Modules\Cemiterios\Services\CadastroUnicoService::class)->consultar($this->cpfValido());

        self::assertSame('João da Silva', $resultado['nome']);
        self::assertSame('9876543', $resultado['rg']);
        self::assertSame('80000-000', $resultado['cep']);
        self::assertSame(1, \App\Models\AuditLog::where('action', 'cadastro_unico.consultado')->count());
    }

    public function test_consulta_sem_integracao_ativa_devolve_null(): void
    {
        $resultado = app(\Modules\Cemiterios\Services\CadastroUnicoService::class)->consultar($this->cpfValido());

        self::assertNull($resultado);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_consulta`
Expected: FAIL — classe `CadastroUnicoService` não existe.

- [ ] **Step 3: Implementação**

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Contracts;

interface CadastroUnicoAdapterInterface
{
    /** @return array<string, mixed>|null */
    public function consultar(string $documentoLimpo): ?array;
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services\Adapters;

use Illuminate\Support\Facades\Http;
use Modules\Cemiterios\Contracts\CadastroUnicoAdapterInterface;
use Modules\Cemiterios\Models\CadastroUnicoIntegracao;
use RuntimeException;

/** Adapter HTTP genérico e configurável (driver `generic_rest`) — sem contrato fixo por fornecedor. */
final class GenericHttpCadastroUnicoAdapter implements CadastroUnicoAdapterInterface
{
    public function __construct(private readonly CadastroUnicoIntegracao $integracao) {}

    public function consultar(string $documentoLimpo): ?array
    {
        if (empty($this->integracao->api_url)) {
            throw new RuntimeException('Integração de Cadastro Único não configurada: api_url ausente.');
        }

        $request = $this->integracao->api_token ? Http::withToken($this->integracao->api_token) : Http::asJson();
        $response = $request->get($this->integracao->api_url, ['documento' => $documentoLimpo]);

        if ($response->status() === 404) {
            return null;
        }
        if (!$response->successful()) {
            throw new RuntimeException('Falha ao consultar o Cadastro Único: ' . $response->body());
        }

        $corpo = $response->json();
        $mapeamento = $this->integracao->field_mappings ?? [];
        $campo = fn (string $nossoCampo, string $padrao) => data_get($corpo, $mapeamento[$nossoCampo] ?? $padrao);

        return array_filter([
            'nome' => $campo('nome', 'nome'),
            'rg' => $campo('rg', 'rg'),
            'data_nascimento' => $campo('data_nascimento', 'data_nascimento'),
            'nome_mae' => $campo('nome_mae', 'nome_mae'),
            'nis' => $campo('nis', 'nis'),
            'cep' => $campo('cep', 'endereco.cep'),
            'logradouro' => $campo('logradouro', 'endereco.logradouro'),
            'numero' => $campo('numero', 'endereco.numero'),
            'complemento' => $campo('complemento', 'endereco.complemento'),
            'bairro' => $campo('bairro', 'endereco.bairro'),
            'cidade' => $campo('cidade', 'endereco.cidade'),
            'uf' => $campo('uf', 'endereco.uf'),
            'cadastro_unico_ref' => $campo('cadastro_unico_ref', 'id'),
        ], fn ($valor) => $valor !== null);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\AuditLogger;
use Modules\Cemiterios\Models\CadastroUnicoIntegracao;
use Modules\Cemiterios\Services\Adapters\GenericHttpCadastroUnicoAdapter;
use Modules\Cemiterios\Support\Documento;

/** Consulta pontual ao cadastro único da prefeitura (fora do SYSGOV); sem integração ativa, cai para digitação manual. */
final readonly class CadastroUnicoService
{
    public function __construct(private AuditLogger $audit) {}

    /** @return array<string, mixed>|null */
    public function consultar(string $documento): ?array
    {
        $documentoLimpo = Documento::somenteDigitos($documento);
        $integracao = CadastroUnicoIntegracao::where('is_active', true)->first();

        if (!$integracao) {
            return null;
        }

        $resultado = (new GenericHttpCadastroUnicoAdapter($integracao))->consultar($documentoLimpo);
        $integracao->update(['ultima_consulta_em' => now()]);

        $this->audit->record(
            'cemiterios',
            'cadastro_unico.consultado',
            'Documento ' . Documento::mascarar($documentoLimpo),
            null,
            ['encontrado' => $resultado !== null],
        );

        return $resultado;
    }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_consulta`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Contracts/CadastroUnicoAdapterInterface.php apps/api/Modules/Cemiterios/Services/Adapters/GenericHttpCadastroUnicoAdapter.php apps/api/Modules/Cemiterios/Services/CadastroUnicoService.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): adapter generico e servico de consulta ao cadastro unico"
```

---

## Task 4: Endpoints de configuração e consulta do Cadastro Único

**Files:**
- Create: `apps/api/Modules/Cemiterios/Http/Controllers/CadastroUnicoIntegracaoController.php`
- Create: `apps/api/Modules/Cemiterios/Http/Controllers/CadastroUnicoConsultaController.php`
- Modify: `apps/api/Modules/Cemiterios/Routes/api.php` (adicionar rotas)
- Modify: `apps/api/Modules/Cemiterios/module.json` (nova permissão `cemiterios.integracoes.manage`)
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar testes)

**Interfaces:**
- Consumes: `CadastroUnicoService::consultar()` (Task 3), `GenericHttpCadastroUnicoAdapter` (Task 3), `AutorizaPermissao::autorizar()`.
- Produces: `GET/POST /api/cemiterios/integracoes/cadastro-unico`, `PUT /api/cemiterios/integracoes/cadastro-unico/{integracao}`, `POST /api/cemiterios/integracoes/cadastro-unico/testar`, `GET /api/cemiterios/cadastro-unico/consultar?documento=`.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_configura_e_consulta_cadastro_unico_via_api(): void
    {
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)->postJson('/api/cemiterios/integracoes/cadastro-unico', [
            'nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true,
        ])->assertCreated();

        self::assertSame(1, \Modules\Cemiterios\Models\CadastroUnicoIntegracao::count());

        \Illuminate\Support\Facades\Http::fake(['prefeitura.example/*' => \Illuminate\Support\Facades\Http::response(['nome' => 'Ana'])]);

        $documento = $this->cpfValido();
        $this->como($admin, $this->tenant)
            ->getJson('/api/cemiterios/cadastro-unico/consultar?documento=' . $documento)
            ->assertOk()
            ->assertJsonPath('dados.nome', 'Ana');
    }

    public function test_gerenciar_integracoes_exige_permissao(): void
    {
        $usuario = $this->usuario($this->tenant, ['cemiterios.concessoes.manage']);

        $this->como($usuario, $this->tenant)
            ->postJson('/api/cemiterios/integracoes/cadastro-unico', ['nome' => 'X', 'driver' => 'generic_rest'])
            ->assertForbidden();
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter "test_configura_e_consulta_cadastro_unico_via_api|test_gerenciar_integracoes_exige_permissao"`
Expected: FAIL — rota 404.

- [ ] **Step 3: Implementação**

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\CadastroUnicoIntegracao;
use Modules\Cemiterios\Services\Adapters\GenericHttpCadastroUnicoAdapter;
use Modules\Cemiterios\Support\Documento;

final class CadastroUnicoIntegracaoController extends Controller
{
    use AutorizaPermissao;

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');

        return response()->json(CadastroUnicoIntegracao::first());
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');

        return response()->json(CadastroUnicoIntegracao::create($this->validar($request)), 201);
    }

    public function update(Request $request, CadastroUnicoIntegracao $integracao): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');
        $integracao->update($this->validar($request));

        return response()->json($integracao);
    }

    public function testar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');
        $dados = $request->validate(['documento' => ['required', 'string']]);
        $integracao = CadastroUnicoIntegracao::where('is_active', true)->firstOrFail();
        $resultado = (new GenericHttpCadastroUnicoAdapter($integracao))->consultar(Documento::somenteDigitos($dados['documento']));

        return response()->json(['encontrado' => $resultado !== null, 'dados' => $resultado]);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:100'],
            'driver' => ['required', 'string', Rule::in(['generic_rest'])],
            'api_url' => ['nullable', 'url', 'max:500'],
            'api_token' => ['nullable', 'string'],
            'field_mappings' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Services\CadastroUnicoService;

final class CadastroUnicoConsultaController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly CadastroUnicoService $servico) {}

    public function consultar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.concessoes.manage');
        $dados = $request->validate(['documento' => ['required', 'string']]);

        return response()->json(['dados' => $this->servico->consultar($dados['documento'])]);
    }
}
```

Em `Routes/api.php`, adicionar os `use` no topo (junto aos demais) e, após a seção `// Financeiro` (`Routes/api.php:112-122`), inserir:

```php
// Integrações (Cadastro Único do Munícipe)
Route::get('/integracoes/cadastro-unico', [CadastroUnicoIntegracaoController::class, 'index']);
Route::post('/integracoes/cadastro-unico', [CadastroUnicoIntegracaoController::class, 'store']);
Route::put('/integracoes/cadastro-unico/{integracao}', [CadastroUnicoIntegracaoController::class, 'update']);
Route::post('/integracoes/cadastro-unico/testar', [CadastroUnicoIntegracaoController::class, 'testar']);
Route::get('/cadastro-unico/consultar', [CadastroUnicoConsultaController::class, 'consultar']);
```

Em `module.json`, dentro do objeto `permissions` (`module.json:30-51`), adicionar antes da linha final:

```json
        "cemiterios.integracoes.manage": "Gerenciar integrações com cadastro único e ERP financeiro da prefeitura",
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Http/Controllers/CadastroUnicoIntegracaoController.php apps/api/Modules/Cemiterios/Http/Controllers/CadastroUnicoConsultaController.php apps/api/Modules/Cemiterios/Routes/api.php apps/api/Modules/Cemiterios/module.json apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): endpoints de configuracao e consulta do cadastro unico do municipe"
```

---

## Task 5: Formulário de concessionário — novos campos e busca no Cadastro Único

**Files:**
- Modify: `apps/web-client/src/modules/cemiterios/api.ts` (tipos e endpoints)
- Modify: `apps/web-client/src/modules/cemiterios/views/ConcessoesView.tsx:48,190,227-236`

**Interfaces:**
- Consumes: `GET /cemiterios/cadastro-unico/consultar?documento=` (Task 4); `POST/PUT /cemiterios/concessionarios` (já existente, agora aceitando os campos novos da Task 1).
- Produces: `cemiteriosApi.consultarCadastroUnico(documento: string)`, `cemiteriosApi.integracaoCadastroUnico()`, `cemiteriosApi.salvarIntegracaoCadastroUnico()`, `cemiteriosApi.testarCadastroUnico()` (os três últimos usados pela Task 12).

- [ ] **Step 1: Escrever o teste que falha**

Não há teste automatizado de UI nesta base (o padrão do módulo usa `npm run typecheck` + verificação manual — ver `FinanceiroTest.php`/plano anterior `2026-09-14-capd-cit-dashboard.md`). O "teste que falha" aqui é o `typecheck`, que aponta os tipos ainda inexistentes.

Run: `cd apps/web-client && npm run typecheck`
Expected: nenhuma mudança ainda — este step só confirma que o typecheck está limpo antes de editar (baseline).

- [ ] **Step 2: Confirmar baseline**

Run: `cd apps/web-client && npm run typecheck`
Expected: PASS (0 erros) — ponto de partida antes das edições dos steps 3-4.

- [ ] **Step 3: `api.ts`**

No `interface Concessionario` (`api.ts:82-88`), adicionar após `bairro?: string | null; cidade?: string | null; uf?: string | null;`:

```ts
  rg?: string | null; data_nascimento?: string | null; nome_mae?: string | null; nis?: string | null;
  cadastro_unico_ref?: string | null; sincronizado_em?: string | null; fonte?: 'manual' | 'cadastro_unico';
```

Adicionar, próximo à interface `Preco` (`api.ts:423`):

```ts
export interface CadastroUnicoIntegracao {
  id: number; nome: string; driver: string; api_url: string | null; field_mappings: Record<string, string> | null;
  is_active: boolean; ultima_consulta_em: string | null;
}
```

No objeto `cemiteriosApi` (`api.ts:663`), na seção `// Concessões` (`api.ts:730-741`), adicionar após `historicoConcessao`:

```ts
  consultarCadastroUnico: (documento: string) => get<{ dados: Record<string, unknown> | null }>('/cadastro-unico/consultar', { documento }),
  integracaoCadastroUnico: () => get<CadastroUnicoIntegracao | null>('/integracoes/cadastro-unico'),
  salvarIntegracaoCadastroUnico: (dados: Partial<CadastroUnicoIntegracao> & { api_token?: string }) =>
    dados.id ? put<CadastroUnicoIntegracao>(`/integracoes/cadastro-unico/${dados.id}`, dados) : post<CadastroUnicoIntegracao>('/integracoes/cadastro-unico', dados),
  testarCadastroUnico: (documento: string) => post<{ encontrado: boolean; dados: Record<string, unknown> | null }>('/integracoes/cadastro-unico/testar', { documento }),
```

- [ ] **Step 4: `ConcessoesView.tsx`**

Em `ConcessoesView.tsx:48`, trocar:

```tsx
  const [modal, setModal] = useState<'concessao' | 'titular' | null>(null);
```

por:

```tsx
  const [modal, setModal] = useState<'concessao' | 'titular' | 'buscar-cpf' | null>(null);
  const [dadosBuscados, setDadosBuscados] = useState<Partial<Concessionario> | null>(null);
```

Em `ConcessoesView.tsx:190`, trocar:

```tsx
            <Button variant="outline" onClick={() => setModal('titular')}>Novo concessionário</Button>
```

por:

```tsx
            <Button variant="outline" onClick={() => { setDadosBuscados(null); setModal('titular'); }}>Novo concessionário</Button>
            <Button variant="outline" onClick={() => setModal('buscar-cpf')}>Buscar no Cadastro Único</Button>
```

Em `ConcessoesView.tsx:227-236`, trocar o bloco do `FormModal aberto={modal === 'titular'}` por:

```tsx
      <FormModal aberto={modal === 'buscar-cpf'} titulo="Buscar no Cadastro Único" rotuloEnviar="Buscar" onFechar={() => setModal(null)}
        campos={[{ nome: 'documento', rotulo: 'CPF', obrigatorio: true }]}
        onEnviar={async (v) => {
          const resultado = await cemiteriosApi.consultarCadastroUnico(String(v.documento));
          if (!resultado.dados) {
            setAviso('Nenhum registro encontrado no Cadastro Único para este CPF.');
            return;
          }
          setDadosBuscados({ ...resultado.dados, documento: String(v.documento), fonte: 'cadastro_unico' } as Partial<Concessionario>);
          setModal('titular');
        }} />
      <FormModal aberto={modal === 'titular'} titulo="Novo concessionário" onFechar={() => setModal(null)} iniciais={dadosBuscados ?? { base_legal: 'execucao_contrato' }}
        campos={[
          { nome: 'nome', rotulo: 'Nome / razão social', obrigatorio: true },
          { nome: 'documento', rotulo: 'CPF ou CNPJ', obrigatorio: true, dica: 'Armazenado cifrado; exibido mascarado.' },
          { nome: 'rg', rotulo: 'RG' }, { nome: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'date' },
          { nome: 'nome_mae', rotulo: 'Nome da mãe' }, { nome: 'nis', rotulo: 'NIS' },
          { nome: 'email', rotulo: 'E-mail' }, { nome: 'telefone', rotulo: 'Telefone' }, { nome: 'endereco', rotulo: 'Endereço' },
          { nome: 'cep', rotulo: 'CEP' }, { nome: 'logradouro', rotulo: 'Logradouro' }, { nome: 'numero', rotulo: 'Número' },
          { nome: 'complemento', rotulo: 'Complemento' }, { nome: 'bairro', rotulo: 'Bairro' }, { nome: 'cidade', rotulo: 'Cidade' }, { nome: 'uf', rotulo: 'UF' },
          { nome: 'base_legal', rotulo: 'Base legal', tipo: 'select', opcoes: [
            { value: 'execucao_contrato', label: 'Execução de contrato' }, { value: 'obrigacao_legal', label: 'Obrigação legal' }, { value: 'consentimento', label: 'Consentimento' },
          ] },
        ]}
        onEnviar={async (v) => { await cemiteriosApi.criarTitular(v as Partial<Concessionario> & { documento: string }); await titulares.recarregar(); }} />
```

- [ ] **Step 5: Rodar typecheck e commit**

Run: `cd apps/web-client && npm run typecheck`
Expected: PASS (0 erros)

```bash
git add apps/web-client/src/modules/cemiterios/api.ts apps/web-client/src/modules/cemiterios/views/ConcessoesView.tsx
git commit -m "feat(cemiterios): busca no cadastro unico e novos campos no cadastro de concessionario"
```

---

## Task 6: Guia — campo `contribuinte_documento` e preenchimento automático

**Files:**
- Create: `apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120200_add_erp_fields_to_cemetery_charges.php`
- Modify: `apps/api/Modules/Cemiterios/Models/Guia.php`
- Modify: `apps/api/Modules/Cemiterios/Services/GuiaService.php:34-48,50-67` (`emitirParaConcessao`, `segundaVia`)
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar teste)

**Interfaces:**
- Produces: colunas `contribuinte_documento` (encrypted), `erp_status` (`'nao_enviada'|'enviada'|'confirmada'|'erro'`, default `'nao_enviada'`), `erp_referencia_externa`, `erp_enviado_em`, `erp_ultimo_erro` em `cemetery_charges`; `Guia->contribuinte_documento_mascarado` (appended, análogo a `Concessionario->documento_mascarado`).

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_guia_de_concessao_recebe_documento_do_titular_e_status_erp_inicial(): void
    {
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));

        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');

        self::assertNotNull($guia->contribuinte_documento);
        self::assertSame('nao_enviada', $guia->erp_status);
        self::assertStringContainsString('*', $guia->contribuinte_documento_mascarado);

        $segunda = app(\Modules\Cemiterios\Services\GuiaService::class)->segundaVia($guia);
        self::assertSame($guia->contribuinte_documento, $segunda->contribuinte_documento);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_guia_de_concessao_recebe_documento_do_titular`
Expected: FAIL — coluna `contribuinte_documento` não existe.

- [ ] **Step 3: Implementação**

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemetery_charges', function (Blueprint $table): void {
            $table->string('contribuinte_documento')->nullable()->after('contribuinte_nome');
            $table->string('erp_status', 15)->default('nao_enviada')->after('comprovante_arquivo');
            $table->string('erp_referencia_externa')->nullable()->after('erp_status');
            $table->timestamp('erp_enviado_em')->nullable()->after('erp_referencia_externa');
            $table->string('erp_ultimo_erro')->nullable()->after('erp_enviado_em');
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_charges', function (Blueprint $table): void {
            $table->dropColumn(['contribuinte_documento', 'erp_status', 'erp_referencia_externa', 'erp_enviado_em', 'erp_ultimo_erro']);
        });
    }
};
```

Em `Guia.php`, trocar o conteúdo inteiro da classe por:

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Modules\Cemiterios\Support\Documento;

/**
 * Guia de recolhimento própria (RF-22/23), agora exportável ao ERP financeiro
 * externo da prefeitura (docs/superpowers/specs/2026-09-29-cemiterios-financeiro-integracao-design.md).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $numero
 * @property string|null $origem_type
 * @property int|null $origem_id
 * @property int|null $holder_id
 * @property string $contribuinte_nome
 * @property string|null $contribuinte_documento
 * @property string $servico
 * @property int|null $exercicio
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $vencimento
 * @property string $situacao
 * @property int|null $original_id
 * @property \Illuminate\Support\Carbon|null $pago_em
 * @property int|null $valor_pago_centavos
 * @property string|null $comprovante_arquivo
 * @property int|null $baixado_por
 * @property string $erp_status
 * @property string|null $erp_referencia_externa
 * @property \Illuminate\Support\Carbon|null $erp_enviado_em
 * @property string|null $erp_ultimo_erro
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Guia extends Model
{
    use TenantAware;

    protected $table = 'cemetery_charges';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['contribuinte_documento'];

    protected $casts = [
        'valor_centavos' => 'integer',
        'valor_pago_centavos' => 'integer',
        'exercicio' => 'integer',
        'vencimento' => 'date',
        'pago_em' => 'date',
        'erp_enviado_em' => 'datetime',
        'contribuinte_documento' => 'encrypted',
    ];

    protected $appends = ['vencida', 'contribuinte_documento_mascarado'];

    public function getVencidaAttribute(): bool
    {
        return $this->situacao === 'emitida' && $this->vencimento->isBefore(today());
    }

    public function getContribuinteDocumentoMascaradoAttribute(): ?string
    {
        if (!$this->contribuinte_documento) {
            return null;
        }
        try {
            return Documento::mascarar($this->contribuinte_documento);
        } catch (\Throwable) {
            return null;
        }
    }
}
```

Em `GuiaService.php`, no método `emitirParaConcessao` (`GuiaService.php:34-48`), trocar:

```php
            'contribuinte_nome' => $titular->nome,
```

por:

```php
            'contribuinte_nome' => $titular->nome,
            'contribuinte_documento' => $titular->documento,
```

E no método `segundaVia` (`GuiaService.php:50-67`), trocar:

```php
            return $this->emitir($original->only([
                'origem_type', 'origem_id', 'holder_id', 'contribuinte_nome', 'servico', 'exercicio', 'valor_centavos',
            ]) + [
```

por:

```php
            return $this->emitir($original->only([
                'origem_type', 'origem_id', 'holder_id', 'contribuinte_nome', 'contribuinte_documento', 'servico', 'exercicio', 'valor_centavos',
            ]) + [
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php Modules/Cemiterios/Tests/Feature/FinanceiroTest.php`
Expected: PASS (inclui os testes financeiros já existentes, que não devem quebrar)

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120200_add_erp_fields_to_cemetery_charges.php apps/api/Modules/Cemiterios/Models/Guia.php apps/api/Modules/Cemiterios/Services/GuiaService.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): guia ganha documento do contribuinte e status de exportacao ao erp"
```

---

## Task 7: Tabela e modelo de integração do ERP financeiro

**Files:**
- Create: `apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120300_create_cemetery_erp_integracoes_table.php`
- Create: `apps/api/Modules/Cemiterios/Models/ErpIntegracao.php`
- Modify: `apps/api/Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php` (`popular()`)
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar teste)

**Interfaces:**
- Produces: `Modules\Cemiterios\Models\ErpIntegracao` — colunas `id, tenant_id, nome, driver, api_url, api_token, api_key (único, autogerado), webhook_url, webhook_secret (autogerado), field_mappings (array), is_active (bool), ultima_sincronizacao_em, timestamps`.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_integracao_erp_gera_api_key_automaticamente_e_e_isolada_por_tenant(): void
    {
        $integracao = \Modules\Cemiterios\Models\ErpIntegracao::create([
            'nome' => 'ERP Betha', 'driver' => 'generic_rest', 'api_url' => 'https://erp.example/api',
        ]);

        self::assertNotEmpty($integracao->api_key);
        self::assertStringStartsWith('erp_', $integracao->api_key);

        $outroTenant = $this->criarTenant('outro-tenant-erp');
        $this->noTenant($outroTenant);
        self::assertSame(0, \Modules\Cemiterios\Models\ErpIntegracao::count());
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_integracao_erp_gera_api_key`
Expected: FAIL — classe `ErpIntegracao` não existe.

- [ ] **Step 3: Migration e model**

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_erp_integracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('driver', 20)->default('generic_rest');
            $table->string('api_url', 500)->nullable();
            $table->text('api_token')->nullable();
            $table->string('api_key')->nullable();
            $table->string('webhook_url', 500)->nullable();
            $table->string('webhook_secret')->nullable();
            $table->json('field_mappings')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('ultima_sincronizacao_em')->nullable();
            $table->timestamps();

            $table->unique('api_key');
            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_erp_integracoes');
    }
};
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Configuração por tenant da integração com o ERP financeiro da prefeitura
 * (fora do SYSGOV): envio de guias emitidas e confirmação de pagamento.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $driver
 * @property string|null $api_url
 * @property string|null $api_token
 * @property string|null $api_key
 * @property string|null $webhook_url
 * @property string|null $webhook_secret
 * @property array<string, string>|null $field_mappings
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $ultima_sincronizacao_em
 */
final class ErpIntegracao extends Model
{
    use TenantAware;

    protected $table = 'cemetery_erp_integracoes';

    protected $guarded = ['id', 'tenant_id'];

    protected $hidden = ['api_token', 'webhook_secret'];

    protected $casts = [
        'field_mappings' => 'array',
        'is_active' => 'boolean',
        'ultima_sincronizacao_em' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->api_key ??= 'erp_' . Str::random(40);
            $model->webhook_secret ??= 'whsec_' . Str::random(32);
        });
    }
}
```

Em `TenantIsolationTest.php`, na `popular()`, adicionar junto à linha do `CadastroUnicoIntegracao` (Task 2):

```php
        \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP Betha', 'driver' => 'generic_rest']);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Database/Migrations/2026_09_29_120300_create_cemetery_erp_integracoes_table.php apps/api/Modules/Cemiterios/Models/ErpIntegracao.php apps/api/Modules/Cemiterios/Tests/Feature/TenantIsolationTest.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): tabela e modelo de integracao com erp financeiro da prefeitura"
```

---

## Task 8: `GuiaService::emitir()` publica evento no Outbox

**Files:**
- Modify: `apps/api/Modules/Cemiterios/Services/GuiaService.php:15-31`
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar teste)

**Interfaces:**
- Consumes: `App\Support\OutboxPublisher::publish(string $type, array $payload, ?int $tenantId = null): OutboxEvent`.
- Produces: evento Outbox `event_type = 'cemiterios.guia_emitida'`, `payload = ['guia_id' => int, 'tenant_id' => int]`, consumido pela Task 9.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_emitir_guia_publica_evento_no_outbox(): void
    {
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));

        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');

        $evento = \App\Models\OutboxEvent::where('event_type', 'cemiterios.guia_emitida')->first();
        self::assertNotNull($evento);
        self::assertSame($guia->id, $evento->payload['guia_id']);
        self::assertSame('pending', $evento->status);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_emitir_guia_publica_evento_no_outbox`
Expected: FAIL — nenhum evento é criado.

- [ ] **Step 3: Implementação**

Em `GuiaService.php`, adicionar o import `use App\Support\OutboxPublisher;` e trocar o construtor (`GuiaService.php:15-20`):

```php
final readonly class GuiaService
{
    public function __construct(
        private PrecoService $precos,
        private ParametroService $parametros,
        private OutboxPublisher $outbox,
    ) {}
```

E o método `emitir()` (`GuiaService.php:22-31`):

```php
    /** @param array<string, mixed> $dados */
    public function emitir(array $dados): Guia
    {
        return DB::transaction(function () use ($dados): Guia {
            $ano = (int) now()->year;
            $sequencia = Guia::where('numero', 'like', "%/{$ano}")->lockForUpdate()->count() + 1;

            $guia = Guia::create($dados + ['numero' => "{$sequencia}/{$ano}", 'situacao' => 'emitida']);
            $this->outbox->publish('cemiterios.guia_emitida', ['guia_id' => $guia->id, 'tenant_id' => $guia->tenant_id]);

            return $guia;
        });
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php Modules/Cemiterios/Tests/Feature/FinanceiroTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Services/GuiaService.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): emitir guia publica evento no outbox para exportacao futura ao erp"
```

---

## Task 9: Adapter, serviço e listener de exportação da guia ao ERP

**Files:**
- Create: `apps/api/Modules/Cemiterios/Contracts/ErpFinanceiroAdapterInterface.php`
- Create: `apps/api/Modules/Cemiterios/Services/Adapters/GenericHttpErpAdapter.php`
- Create: `apps/api/Modules/Cemiterios/Services/ErpIntegrationService.php`
- Create: `apps/api/Modules/Cemiterios/Listeners/ExportarGuiaErpListener.php`
- Modify: `apps/api/Modules/Cemiterios/Providers/CemiteriosServiceProvider.php:47-58`
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar testes)

**Interfaces:**
- Consumes: evento Outbox `cemiterios.guia_emitida` (Task 8); `App\Events\OutboxMessage`; `ErpIntegracao` (Task 7).
- Produces: `ErpIntegrationService::exportar(Guia $guia): void`; `ErpIntegrationService::confirmarPagamento(...)` (assinatura completa na Task 10 — este task só cria `exportar()`).

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_listener_exporta_guia_ao_erp_com_sucesso(): void
    {
        \Illuminate\Support\Facades\Http::fake(['erp.example/*' => \Illuminate\Support\Facades\Http::response(['referencia_externa' => 'ERP-999'])]);
        \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP', 'driver' => 'generic_rest', 'api_url' => 'https://erp.example/api', 'is_active' => true]);

        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');

        $this->artisan('outbox:process')->assertSuccessful();

        $guia->refresh();
        self::assertSame('enviada', $guia->erp_status);
        self::assertSame('ERP-999', $guia->erp_referencia_externa);
    }

    public function test_listener_marca_erro_quando_erp_falha(): void
    {
        \Illuminate\Support\Facades\Http::fake(['erp.example/*' => \Illuminate\Support\Facades\Http::response('fora do ar', 500)]);
        \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP', 'driver' => 'generic_rest', 'api_url' => 'https://erp.example/api', 'is_active' => true]);

        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');

        $this->artisan('outbox:process')->assertSuccessful();

        $guia->refresh();
        self::assertSame('erro', $guia->erp_status);
        self::assertNotNull($guia->erp_ultimo_erro);
    }

    public function test_sem_integracao_ativa_guia_permanece_nao_enviada(): void
    {
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');

        $this->artisan('outbox:process')->assertSuccessful();

        self::assertSame('nao_enviada', $guia->refresh()->erp_status);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter "test_listener_exporta_guia_ao_erp_com_sucesso|test_listener_marca_erro_quando_erp_falha|test_sem_integracao_ativa_guia_permanece_nao_enviada"`
Expected: FAIL — `erp_status` continua `nao_enviada` mesmo com integração ativa (nada consome o evento ainda).

- [ ] **Step 3: Implementação**

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Contracts;

interface ErpFinanceiroAdapterInterface
{
    /**
     * @param array<string, mixed> $payload
     * @return array{referencia_externa: string|null}
     */
    public function enviarGuia(array $payload): array;
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services\Adapters;

use Illuminate\Support\Facades\Http;
use Modules\Cemiterios\Contracts\ErpFinanceiroAdapterInterface;
use Modules\Cemiterios\Models\ErpIntegracao;
use RuntimeException;

/** Adapter HTTP genérico e configurável (driver `generic_rest`) — sem contrato fixo por fornecedor de ERP. */
final class GenericHttpErpAdapter implements ErpFinanceiroAdapterInterface
{
    public function __construct(private readonly ErpIntegracao $integracao) {}

    public function enviarGuia(array $payload): array
    {
        if (empty($this->integracao->api_url)) {
            throw new RuntimeException('Integração com o ERP financeiro não configurada: api_url ausente.');
        }

        $mapeamento = $this->integracao->field_mappings ?? [];
        $corpo = [];
        foreach ($payload as $campo => $valor) {
            $corpo[$mapeamento[$campo] ?? $campo] = $valor;
        }

        $request = $this->integracao->api_token ? Http::withToken($this->integracao->api_token) : Http::asJson();
        $response = $request->post($this->integracao->api_url, $corpo);

        if (!$response->successful()) {
            throw new RuntimeException('Falha ao enviar guia ao ERP financeiro: ' . $response->body());
        }

        return ['referencia_externa' => $response->json('referencia_externa') ?? $response->json('id')];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\AuditLogger;
use Modules\Cemiterios\Models\ErpIntegracao;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Services\Adapters\GenericHttpErpAdapter;
use Throwable;

/** Exportação assíncrona de guias ao ERP financeiro externo e confirmação de pagamento (inbound). */
final readonly class ErpIntegrationService
{
    public function __construct(
        private AuditLogger $audit,
        private GuiaService $guias,
    ) {}

    public function exportar(Guia $guia): void
    {
        $integracao = ErpIntegracao::where('tenant_id', $guia->tenant_id)->where('is_active', true)->first();
        if (!$integracao) {
            return;
        }

        try {
            $resultado = (new GenericHttpErpAdapter($integracao))->enviarGuia([
                'numero' => $guia->numero,
                'contribuinte_nome' => $guia->contribuinte_nome,
                'contribuinte_documento' => $guia->contribuinte_documento,
                'servico' => $guia->servico,
                'valor_centavos' => $guia->valor_centavos,
                'vencimento' => $guia->vencimento->toDateString(),
            ]);

            $guia->update([
                'erp_status' => 'enviada',
                'erp_referencia_externa' => $resultado['referencia_externa'] ?? null,
                'erp_enviado_em' => now(),
                'erp_ultimo_erro' => null,
            ]);
            $this->audit->record('cemiterios', 'guia.erp_exportada', "Guia #{$guia->id}", null, $guia->toArray());
        } catch (Throwable $e) {
            $guia->update(['erp_status' => 'erro', 'erp_ultimo_erro' => $e->getMessage()]);
            $this->audit->record('cemiterios', 'guia.erp_falha_exportacao', "Guia #{$guia->id}", null, ['erro' => $e->getMessage()]);
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Listeners;

use App\Events\OutboxMessage;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Services\ErpIntegrationService;

/** Exportação da guia ao ERP financeiro externo, assíncrona via Outbox (nunca no ciclo da requisição). */
final class ExportarGuiaErpListener
{
    public const TIPO = 'cemiterios.guia_emitida';

    public function __construct(private readonly ErpIntegrationService $erp) {}

    public function handle(OutboxMessage $mensagem): void
    {
        if ($mensagem->event->event_type !== self::TIPO) {
            return;
        }

        $guia = Guia::find($mensagem->event->payload['guia_id']);
        if ($guia) {
            $this->erp->exportar($guia);
        }
    }
}
```

Em `CemiteriosServiceProvider.php`, adicionar o import `use Modules\Cemiterios\Listeners\ExportarGuiaErpListener;` e, após a linha `Event::listen(OutboxMessage::class, SucessaoEventListener::class);` (`CemiteriosServiceProvider.php:56`):

```php
        Event::listen(OutboxMessage::class, ExportarGuiaErpListener::class);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Contracts/ErpFinanceiroAdapterInterface.php apps/api/Modules/Cemiterios/Services/Adapters/GenericHttpErpAdapter.php apps/api/Modules/Cemiterios/Services/ErpIntegrationService.php apps/api/Modules/Cemiterios/Listeners/ExportarGuiaErpListener.php apps/api/Modules/Cemiterios/Providers/CemiteriosServiceProvider.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): exportacao assincrona de guias ao erp financeiro via outbox"
```

---

## Task 10: Confirmação de pagamento pelo ERP (inbound) e baixa automática

**Files:**
- Modify: `apps/api/Modules/Cemiterios/Services/GuiaService.php` (método `baixar`)
- Modify: `apps/api/Modules/Cemiterios/Services/ErpIntegrationService.php` (adicionar `confirmarPagamento`)
- Create: `apps/api/Modules/Cemiterios/Http/Controllers/Api/ErpApiController.php`
- Create: `apps/api/Modules/Cemiterios/Routes/erp.php`
- Modify: `apps/api/Modules/Cemiterios/Providers/RouteServiceProvider.php:25-46`
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar testes)

**Interfaces:**
- Consumes: `ErpIntegracao->api_key` (Task 7); `GuiaService::baixar()`.
- Produces: `POST /api/cemiterios-erp/confirmar-pagamento` (cabeçalho `X-Cemiterios-ERP-Key`), `ErpIntegrationService::confirmarPagamento(ErpIntegracao $integracao, string $referenciaExterna, string $pagoEm, int $valorPagoCentavos): Guia`.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_bloqueia_confirmacao_sem_api_key_valida(): void
    {
        $this->postJson('/api/cemiterios-erp/confirmar-pagamento', ['referencia_externa' => 'X', 'pago_em' => today()->toDateString(), 'valor_pago' => '10.00'])
            ->assertStatus(401);

        $this->withHeader('X-Cemiterios-ERP-Key', 'chave-invalida')
            ->postJson('/api/cemiterios-erp/confirmar-pagamento', ['referencia_externa' => 'X', 'pago_em' => today()->toDateString(), 'valor_pago' => '10.00'])
            ->assertStatus(403);
    }

    public function test_erp_confirma_pagamento_e_baixa_a_guia_automaticamente(): void
    {
        $integracao = \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP', 'driver' => 'generic_rest', 'is_active' => true]);
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');
        $guia->update(['erp_referencia_externa' => 'ERP-777']);

        $this->withHeader('X-Cemiterios-ERP-Key', $integracao->api_key)
            ->postJson('/api/cemiterios-erp/confirmar-pagamento', [
                'referencia_externa' => 'ERP-777', 'pago_em' => today()->toDateString(), 'valor_pago' => '10.00',
            ])
            ->assertOk();

        $guia->refresh();
        self::assertSame('paga', $guia->situacao);
        self::assertSame('confirmada', $guia->erp_status);
        self::assertNull($guia->comprovante_arquivo);
    }

    public function test_confirmacao_duplicada_e_rejeitada(): void
    {
        $integracao = \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP', 'driver' => 'generic_rest', 'is_active' => true]);
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');
        $guia->update(['erp_referencia_externa' => 'ERP-888']);

        $payload = ['referencia_externa' => 'ERP-888', 'pago_em' => today()->toDateString(), 'valor_pago' => '10.00'];
        $this->withHeader('X-Cemiterios-ERP-Key', $integracao->api_key)->postJson('/api/cemiterios-erp/confirmar-pagamento', $payload)->assertOk();
        $this->withHeader('X-Cemiterios-ERP-Key', $integracao->api_key)->postJson('/api/cemiterios-erp/confirmar-pagamento', $payload)->assertUnprocessable();
    }

    public function test_confirmacao_nao_baixa_guia_de_outro_tenant(): void
    {
        $jazigo = $this->novoJazigo(2);
        $concessao = \Modules\Cemiterios\Models\Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        app(\Modules\Cemiterios\Services\PrecoService::class)->novaVigencia('renovacao', 1000, \Carbon\CarbonImmutable::parse('2026-01-01'));
        $guia = app(\Modules\Cemiterios\Services\GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');
        $guia->update(['erp_referencia_externa' => 'ERP-COMPARTILHADA']);

        $outroTenant = $this->criarTenant('outro-tenant-erp-confirma');
        $this->noTenant($outroTenant);
        $integracaoOutroTenant = \Modules\Cemiterios\Models\ErpIntegracao::create(['nome' => 'ERP outro', 'driver' => 'generic_rest', 'is_active' => true]);
        app(\App\Support\TenantContext::class)->clear();

        $this->withHeader('X-Cemiterios-ERP-Key', $integracaoOutroTenant->api_key)
            ->postJson('/api/cemiterios-erp/confirmar-pagamento', ['referencia_externa' => 'ERP-COMPARTILHADA', 'pago_em' => today()->toDateString(), 'valor_pago' => '10.00'])
            ->assertNotFound();
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter "confirma|confirmacao"`
Expected: FAIL — rota 404.

- [ ] **Step 3: Implementação**

Em `GuiaService.php`, trocar a assinatura do método `baixar` (`GuiaService.php:69`):

```php
    public function baixar(Guia $guia, string $pagoEm, int $valorPago, ?string $comprovante, ?int $autorId): Guia
```

(o corpo do método não muda — `comprovante_arquivo` já aceitava ser gravado com o valor recebido).

Em `ErpIntegrationService.php`, adicionar ao final da classe (antes do `}` de fechamento):

```php
    public function confirmarPagamento(ErpIntegracao $integracao, string $referenciaExterna, string $pagoEm, int $valorPagoCentavos): Guia
    {
        $guia = Guia::where('tenant_id', $integracao->tenant_id)
            ->where(fn ($query) => $query->where('erp_referencia_externa', $referenciaExterna)->orWhere('numero', $referenciaExterna))
            ->firstOrFail();

        $guia = $this->guias->baixar($guia, $pagoEm, $valorPagoCentavos, null, null);
        $guia->update(['erp_status' => 'confirmada']);

        $this->audit->record('cemiterios', 'guia.baixa_automatica_erp', "Guia #{$guia->id}", null, $guia->toArray());

        return $guia;
    }
```

`GuiaService::baixar()` já lança `RegraNegocioException` (HTTP 422 via `render()`) quando a guia não está `emitida` — cobre a confirmação duplicada sem código extra, e `firstOrFail()` já devolve 404 (via `ModelNotFoundException`, capturado pelo handler padrão do Laravel) quando a referência não existe **no tenant da integração** — cobre o caso de outro tenant sem código extra.

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Cemiterios\Models\ErpIntegracao;
use Modules\Cemiterios\Services\ErpIntegrationService;
use Modules\Cemiterios\Services\PrecoService;

final class ErpApiController extends Controller
{
    public function __construct(private readonly ErpIntegrationService $erp) {}

    private function resolveIntegracao(Request $request): ErpIntegracao
    {
        $apiKey = (string) ($request->header('X-Cemiterios-ERP-Key') ?? '');
        if (empty($apiKey)) {
            abort(401, 'Cabeçalho X-Cemiterios-ERP-Key ausente.');
        }

        $integracao = ErpIntegracao::where('api_key', $apiKey)->where('is_active', true)->first();
        if (!$integracao) {
            abort(403, 'Chave de API do ERP financeiro inválida ou inativa.');
        }

        return $integracao;
    }

    public function confirmarPagamento(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);
        $dados = $request->validate([
            'referencia_externa' => ['required', 'string'],
            'pago_em' => ['required', 'date'],
            'valor_pago' => ['required', 'string'],
        ]);

        $guia = $this->erp->confirmarPagamento(
            $integracao,
            $dados['referencia_externa'],
            $dados['pago_em'],
            PrecoService::centavos($dados['valor_pago']),
        );

        return response()->json(['guia_id' => $guia->id, 'situacao' => $guia->situacao]);
    }
}
```

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Controllers\Api\ErpApiController;

/* API aberta para o ERP financeiro externo da prefeitura (autenticação via X-Cemiterios-ERP-Key). */

Route::post('/confirmar-pagamento', [ErpApiController::class, 'confirmarPagamento'])->name('cemiterios.erp.confirmar-pagamento');
```

Em `RouteServiceProvider.php`, dentro de `map()` (`RouteServiceProvider.php:25-46`), adicionar após o grupo `api/public/cemiterios/{tenantSlug}`:

```php
        // ERP financeiro externo da prefeitura: confirmação de pagamento, autenticada por API key própria.
        Route::middleware(['api'])
            ->prefix('api/cemiterios-erp')
            ->group(__DIR__ . '/../Routes/erp.php');
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php Modules/Cemiterios/Tests/Feature/FinanceiroTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Services/GuiaService.php apps/api/Modules/Cemiterios/Services/ErpIntegrationService.php apps/api/Modules/Cemiterios/Http/Controllers/Api/ErpApiController.php apps/api/Modules/Cemiterios/Routes/erp.php apps/api/Modules/Cemiterios/Providers/RouteServiceProvider.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): confirmacao de pagamento pelo erp financeiro com baixa automatica da guia"
```

---

## Task 11: Painel de configuração do ERP financeiro

**Files:**
- Create: `apps/api/Modules/Cemiterios/Http/Controllers/ErpIntegracaoController.php`
- Modify: `apps/api/Modules/Cemiterios/Routes/api.php`
- Test: `apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php` (adicionar testes)

**Interfaces:**
- Produces: `GET/POST /api/cemiterios/integracoes/erp`, `PUT /api/cemiterios/integracoes/erp/{integracao}`, `POST /api/cemiterios/integracoes/erp/{integracao}/regenerate-key`.

- [ ] **Step 1: Escrever o teste que falha**

```php
    public function test_configura_e_regenera_chave_da_integracao_erp(): void
    {
        $admin = $this->admin($this->tenant);

        $criado = $this->como($admin, $this->tenant)->postJson('/api/cemiterios/integracoes/erp', [
            'nome' => 'ERP Betha', 'driver' => 'generic_rest', 'api_url' => 'https://erp.example/api', 'is_active' => true,
        ])->assertCreated()->json();

        self::assertStringStartsWith('erp_', $criado['api_key']);

        $novaChave = $this->como($admin, $this->tenant)
            ->postJson("/api/cemiterios/integracoes/erp/{$criado['id']}/regenerate-key")
            ->assertOk()->json('api_key');

        self::assertNotSame($criado['api_key'], $novaChave);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php --filter test_configura_e_regenera_chave_da_integracao_erp`
Expected: FAIL — rota 404.

- [ ] **Step 3: Implementação**

```php
<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\ErpIntegracao;

final class ErpIntegracaoController extends Controller
{
    use AutorizaPermissao;

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');

        return response()->json(ErpIntegracao::first());
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');

        return response()->json(ErpIntegracao::create($this->validar($request)), 201);
    }

    public function update(Request $request, ErpIntegracao $integracao): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');
        $integracao->update($this->validar($request));

        return response()->json($integracao);
    }

    public function regenerateKey(Request $request, ErpIntegracao $integracao): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.integracoes.manage');
        $integracao->update(['api_key' => 'erp_' . Str::random(40)]);

        return response()->json(['api_key' => $integracao->api_key]);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:100'],
            'driver' => ['required', 'string', Rule::in(['generic_rest'])],
            'api_url' => ['nullable', 'url', 'max:500'],
            'api_token' => ['nullable', 'string'],
            'field_mappings' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
```

Em `Routes/api.php`, após o bloco de rotas de `integracoes/cadastro-unico` (Task 4), adicionar:

```php
// Integrações (ERP Financeiro da Prefeitura)
Route::get('/integracoes/erp', [ErpIntegracaoController::class, 'index']);
Route::post('/integracoes/erp', [ErpIntegracaoController::class, 'store']);
Route::put('/integracoes/erp/{integracao}', [ErpIntegracaoController::class, 'update']);
Route::post('/integracoes/erp/{integracao}/regenerate-key', [ErpIntegracaoController::class, 'regenerateKey']);
```

(mais o `use Modules\Cemiterios\Http\Controllers\ErpIntegracaoController;` no topo do arquivo).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd apps/api && vendor/bin/phpunit Modules/Cemiterios/Tests/Feature/IntegracoesTest.php`
Expected: PASS — a suíte completa de `IntegracoesTest.php` criada nas Tasks 1-11 passa.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Modules/Cemiterios/Http/Controllers/ErpIntegracaoController.php apps/api/Modules/Cemiterios/Routes/api.php apps/api/Modules/Cemiterios/Tests/Feature/IntegracoesTest.php
git commit -m "feat(cemiterios): painel de configuracao da integracao com erp financeiro"
```

---

## Task 12: Frontend — aba "Integrações" em Financeiro e status do ERP nas Guias

**Files:**
- Modify: `apps/web-client/src/modules/cemiterios/api.ts` (tipos `ErpIntegracao`, `Guia.erp_status` etc., endpoints)
- Modify: `apps/web-client/src/modules/cemiterios/views/FinanceiroView.tsx`

**Interfaces:**
- Consumes: todos os endpoints das Tasks 4 e 11; `Guia.erp_status`/`erp_ultimo_erro` (Task 6).

- [ ] **Step 1: Confirmar baseline do typecheck**

Run: `cd apps/web-client && npm run typecheck`
Expected: PASS (0 erros) — ponto de partida antes das edições.

- [ ] **Step 2: `api.ts`**

No `interface Guia` (`api.ts:425-439`), adicionar após `comprovante_arquivo?: string | null;`:

```ts
  contribuinte_documento_mascarado?: string | null;
  erp_status: 'nao_enviada' | 'enviada' | 'confirmada' | 'erro';
  erp_referencia_externa?: string | null;
  erp_ultimo_erro?: string | null;
```

Adicionar, junto à interface `CadastroUnicoIntegracao` (criada na Task 5):

```ts
export interface ErpIntegracao {
  id: number; nome: string; driver: string; api_url: string | null; api_key: string | null; webhook_url: string | null;
  field_mappings: Record<string, string> | null; is_active: boolean; ultima_sincronizacao_em: string | null;
}
```

No objeto `cemiteriosApi`, na seção `// Financeiro` (`api.ts:800-811`), adicionar após `inadimplencia`:

```ts
  integracaoCadastroUnico: () => get<CadastroUnicoIntegracao | null>('/integracoes/cadastro-unico'),
  salvarIntegracaoCadastroUnico: (dados: Partial<CadastroUnicoIntegracao> & { api_token?: string }) =>
    dados.id ? put<CadastroUnicoIntegracao>(`/integracoes/cadastro-unico/${dados.id}`, dados) : post<CadastroUnicoIntegracao>('/integracoes/cadastro-unico', dados),
  testarCadastroUnico: (documento: string) => post<{ encontrado: boolean; dados: Record<string, unknown> | null }>('/integracoes/cadastro-unico/testar', { documento }),
  integracaoErp: () => get<ErpIntegracao | null>('/integracoes/erp'),
  salvarIntegracaoErp: (dados: Partial<ErpIntegracao> & { api_token?: string }) =>
    dados.id ? put<ErpIntegracao>(`/integracoes/erp/${dados.id}`, dados) : post<ErpIntegracao>('/integracoes/erp', dados),
  regenerarChaveErp: (id: number) => post<{ api_key: string }>(`/integracoes/erp/${id}/regenerate-key`),
```

(Nota: `integracaoCadastroUnico`, `salvarIntegracaoCadastroUnico` e `testarCadastroUnico` só devem ser adicionados aqui se a Task 5 ainda não os tiver adicionado — confirme com `grep -n "integracaoCadastroUnico" apps/web-client/src/modules/cemiterios/api.ts` antes de duplicar.)

- [ ] **Step 3: `FinanceiroView.tsx` — nova aba**

No topo do arquivo, trocar o import de `@/components/ui` (`FinanceiroView.tsx:4`):

```tsx
import { Button, Card, DataTable, Field, Input, KpiCard, StatusChip, Tabs } from '@/components/ui';
```

E os imports de tipos/API (`FinanceiroView.tsx:6`):

```tsx
import { cemiteriosApi, formatarCentavos, formatarData, type ErpIntegracao, type Guia, type Preco } from '../api';
```

Trocar o componente `FinanceiroView` (`FinanceiroView.tsx:21-31`) por:

```tsx
export const FinanceiroView: React.FC = () => {
  const [aba, setAba] = useState<'precos' | 'guias' | 'inadimplencia' | 'integracoes'>('guias');
  return (
    <div className="space-y-4">
      <Tabs items={[{ key: 'guias', label: 'Guias' }, { key: 'precos', label: 'Tabela de preços' }, { key: 'inadimplencia', label: 'Inadimplência' }, { key: 'integracoes', label: 'Integrações' }]} value={aba} onChange={setAba} />
      {aba === 'precos' && <Precos />}
      {aba === 'guias' && <Guias />}
      {aba === 'inadimplencia' && <Inadimplencia />}
      {aba === 'integracoes' && <Integracoes />}
    </div>
  );
};
```

Na coluna `situacao` da tabela de Guias (`FinanceiroView.tsx:91-111`), adicionar uma coluna após `{ id: 'situacao', ... }`:

```tsx
    {
      id: 'erp', header: 'ERP', cell: ({ row }) => {
        const rotulo: Record<Guia['erp_status'], string> = { nao_enviada: 'não enviada', enviada: 'enviada', confirmada: 'confirmada', erro: 'erro' };
        const variante: Record<Guia['erp_status'], 'neutral' | 'info' | 'success' | 'danger'> = { nao_enviada: 'neutral', enviada: 'info', confirmada: 'success', erro: 'danger' };
        return <StatusChip label={rotulo[row.original.erp_status]} variant={variante[row.original.erp_status]} title={row.original.erp_ultimo_erro ?? undefined} />;
      },
    },
```

- [ ] **Step 4: Componente `Integracoes`**

Adicionar ao final do arquivo (antes do fechamento, no mesmo nível de `Precos`/`Guias`/`Inadimplencia`):

```tsx
const Integracoes: React.FC = () => {
  const cadastroUnico = useDados(() => cemiteriosApi.integracaoCadastroUnico(), []);
  const erp = useDados(() => cemiteriosApi.integracaoErp(), []);
  const [modal, setModal] = useState<'cadastro_unico' | 'erp' | null>(null);
  const [testeDocumento, setTesteDocumento] = useState('');
  const [testeResultado, setTesteResultado] = useState<string | null>(null);
  const { erro, executar } = useAcao();

  return (
    <div className="space-y-4">
      <ErroBox erro={erro} />
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Cadastro Único do Munícipe</h3>
        <p className="text-xs text-muted-foreground">Consulta pontual de CPF no cadastro único da prefeitura ao cadastrar um concessionário.</p>
        <StatusChip label={cadastroUnico.dados?.is_active ? 'ativa' : 'inativa'} variant={cadastroUnico.dados?.is_active ? 'success' : 'neutral'} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setModal('cadastro_unico')}>{cadastroUnico.dados ? 'Editar configuração' : 'Configurar'}</Button>
        </div>
        {cadastroUnico.dados?.is_active && (
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
            <Field label="Testar com um CPF">
              <Input value={testeDocumento} onChange={(e) => setTesteDocumento(e.target.value)} />
            </Field>
            <Button size="sm" variant="outline" onClick={async () => {
              const r = await executar(() => cemiteriosApi.testarCadastroUnico(testeDocumento));
              setTesteResultado(r ? (r.encontrado ? 'Encontrado no cadastro único.' : 'Não encontrado.') : null);
            }}>Testar</Button>
            {testeResultado && <span className="text-xs">{testeResultado}</span>}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">ERP Financeiro da Prefeitura</h3>
        <p className="text-xs text-muted-foreground">Toda guia emitida é enviada automaticamente a este ERP; a confirmação de pagamento retorna por API.</p>
        <StatusChip label={erp.dados?.is_active ? 'ativa' : 'inativa'} variant={erp.dados?.is_active ? 'success' : 'neutral'} />
        {erp.dados?.api_key && <p className="text-xs">Chave de API (para o ERP chamar de volta): <span className="font-mono">{erp.dados.api_key}</span></p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setModal('erp')}>{erp.dados ? 'Editar configuração' : 'Configurar'}</Button>
          {erp.dados && (
            <Button size="sm" variant="outline" onClick={async () => { await executar(() => cemiteriosApi.regenerarChaveErp((erp.dados as ErpIntegracao).id)); await erp.recarregar(); }}>
              Gerar nova chave
            </Button>
          )}
        </div>
      </Card>

      <FormModal aberto={modal === 'cadastro_unico'} titulo="Cadastro Único do Munícipe" onFechar={() => setModal(null)}
        iniciais={cadastroUnico.dados ? { ...cadastroUnico.dados, field_mappings: JSON.stringify(cadastroUnico.dados.field_mappings ?? {}, null, 2) } : { driver: 'generic_rest' }}
        campos={[
          { nome: 'nome', rotulo: 'Nome da integração', obrigatorio: true },
          { nome: 'api_url', rotulo: 'URL da API', obrigatorio: true },
          { nome: 'api_token', rotulo: 'Token de autenticação' },
          { nome: 'field_mappings', rotulo: 'Mapeamento de campos (JSON)', tipo: 'textarea', dica: 'Ex.: {"nome": "nomeCompleto", "cep": "endereco.cep"}' },
          { nome: 'is_active', rotulo: 'Ativa', tipo: 'switch' },
        ]}
        onEnviar={async (v) => {
          const dados = { ...cadastroUnico.dados, ...v, field_mappings: v.field_mappings ? JSON.parse(String(v.field_mappings)) : {} };
          await cemiteriosApi.salvarIntegracaoCadastroUnico(dados);
          await cadastroUnico.recarregar();
        }} />

      <FormModal aberto={modal === 'erp'} titulo="ERP Financeiro da Prefeitura" onFechar={() => setModal(null)}
        iniciais={erp.dados ? { ...erp.dados, field_mappings: JSON.stringify(erp.dados.field_mappings ?? {}, null, 2) } : { driver: 'generic_rest' }}
        campos={[
          { nome: 'nome', rotulo: 'Nome da integração', obrigatorio: true },
          { nome: 'api_url', rotulo: 'URL da API (envio da guia)', obrigatorio: true },
          { nome: 'api_token', rotulo: 'Token de autenticação' },
          { nome: 'field_mappings', rotulo: 'Mapeamento de campos (JSON)', tipo: 'textarea', dica: 'Ex.: {"numero": "numeroTitulo", "valor_centavos": "valor"}' },
          { nome: 'is_active', rotulo: 'Ativa', tipo: 'switch' },
        ]}
        onEnviar={async (v) => {
          const dados = { ...erp.dados, ...v, field_mappings: v.field_mappings ? JSON.parse(String(v.field_mappings)) : {} };
          await cemiteriosApi.salvarIntegracaoErp(dados);
          await erp.recarregar();
        }} />
    </div>
  );
};
```

- [ ] **Step 5: Rodar typecheck, verificar manualmente e commit**

Run: `cd apps/web-client && npm run typecheck`
Expected: PASS (0 erros)

Verificação manual (`npm run dev:client`, ou `npm run dev` na raiz): abrir Cemitérios → Financeiro → aba "Integrações", configurar as duas integrações com uma URL fictícia, confirmar que salvam e reabrem preenchidas; abrir a aba "Guias" e confirmar que a nova coluna "ERP" aparece com o chip "não enviada" nas guias existentes.

```bash
git add apps/web-client/src/modules/cemiterios/api.ts apps/web-client/src/modules/cemiterios/views/FinanceiroView.tsx
git commit -m "feat(cemiterios): aba de integracoes em financeiro e status do erp nas guias"
```

---

## Após todas as tasks

Run: `cd apps/api && composer test && composer static` e `cd apps/web-client && npm run typecheck && npm test` — suíte completa deve passar antes de considerar o branch pronto para revisão.
