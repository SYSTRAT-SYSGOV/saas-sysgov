<?php

declare(strict_types=1);

namespace Modules\Contracts\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\HttpResponseException;
use Modules\Contracts\Models\SupportTicket;
use Modules\Contracts\Services\SupportTicketService;
use Modules\Contracts\Tests\TestCase;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Regressão: SupportTicketController/SupportTicketService::resolveTenantId() engolia
 * qualquer exceção e retornava null, e o código então PULAVA o filtro de tenant em vez
 * de negar acesso — sem tenant resolvido, os endpoints listavam tickets de todos os
 * tenants. O fix falha fechado (aborta 403) em vez de falhar aberto.
 */
final class SupportTicketTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tickets_are_scoped_to_the_current_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a-ticket', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b-ticket', 'type' => 'prefeitura', 'status' => 'active']);

        $user = User::create(['name' => 'Requerente', 'email' => 'requerente@teste.gov', 'password' => 'StrongPass!123']);

        app(TenantContext::class)->set($tenantA);
        $service = app(SupportTicketService::class);
        $service->openTicket(['title' => 'Ticket A'], $user->id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, SupportTicket::query()->count());

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, SupportTicket::query()->count());
        app(TenantContext::class)->clear();
    }

    public function test_opening_a_ticket_without_tenant_context_fails_closed(): void
    {
        app(TenantContext::class)->clear();
        $service = app(SupportTicketService::class);

        try {
            $service->openTicket(['title' => 'Ticket órfão'], 1);
            self::fail('Esperava abort(403) por falta de tenant resolvido.');
        } catch (HttpResponseException|HttpExceptionInterface $e) {
            $status = $e instanceof HttpResponseException ? $e->getResponse()->getStatusCode() : $e->getStatusCode();
            self::assertSame(403, $status);
        }

        self::assertSame(0, SupportTicket::query()->withoutGlobalScopes()->count());
    }
}
