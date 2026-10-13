<?php

declare(strict_types=1);

namespace Modules\Ata\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Ata\Models\Ata;
use Modules\Ata\Services\SecretariaAtaService;

/**
 * Escopo por secretaria e sigilo (spec: Ata sigilosa e escopo por secretaria). Quem tem ata.manage enxerga todas
 * as atas do tenant; os demais só as das secretarias da sua lotação. Ata sigilosa: só o autor e ata.manage.
 * As regras de estado (o que pode em rascunho/finalizada) ficam no AtaService.
 */
final class AtaPolicy
{
    public function __construct(
        private readonly SecretariaAtaService $secretarias,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'ata.view') || $this->gerencia($user);
    }

    /** Enxerga a ata na lista (sigilosa aparece mascarada para quem não pode abrir). */
    public function listar(User $user, Ata $ata): bool
    {
        return $this->doTenant($ata) && ($this->gerencia($user) || ($this->pode($user, 'ata.view') && $this->daSecretaria($user, $ata)));
    }

    /** Abre o conteúdo e o PDF. */
    public function view(User $user, Ata $ata): bool
    {
        if (!$this->listar($user, $ata)) {
            return false;
        }

        return !$ata->sigilosa || $this->gerencia($user) || $ata->criado_por === $user->id;
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'ata.create') || $this->gerencia($user);
    }

    public function update(User $user, Ata $ata): bool
    {
        return $this->view($user, $ata) && $this->create($user);
    }

    public function sign(User $user, Ata $ata): bool
    {
        return $this->view($user, $ata) && ($this->pode($user, 'ata.sign') || $this->gerencia($user));
    }

    public function finalize(User $user, Ata $ata): bool
    {
        return $this->view($user, $ata) && ($this->pode($user, 'ata.finalize') || $this->gerencia($user));
    }

    public function delete(User $user, Ata $ata): bool
    {
        return $this->doTenant($ata) && $this->gerencia($user);
    }

    public function gerencia(User $user): bool
    {
        return $this->pode($user, 'ata.manage');
    }

    public function auditar(User $user): bool
    {
        return $this->pode($user, 'ata.audit') || $this->gerencia($user);
    }

    /** Secretaria em que o usuário pode criar ata. */
    public function criarNaSecretaria(User $user, int $orgUnitId): bool
    {
        return $this->create($user) && ($this->gerencia($user) || in_array($orgUnitId, $this->secretarias->secretariasDoUsuario($user), true));
    }

    private function daSecretaria(User $user, Ata $ata): bool
    {
        return in_array($ata->org_unit_id, $this->secretarias->secretariasDoUsuario($user), true);
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Ata $ata): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $ata->tenant_id === $context->id();
    }
}
