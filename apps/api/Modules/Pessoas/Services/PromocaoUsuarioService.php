<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Models\Role;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;
use Modules\Pessoas\Support\RegraNegocioException;

/**
 * Promove uma pessoa existente a usuário do SYSGOV: cria a conta imediatamente
 * (senha nula, redefinida no primeiro acesso), nunca automaticamente.
 */
final readonly class PromocaoUsuarioService
{
    public function __construct(private AuditLogger $audit) {}

    public function promover(Pessoa $pessoa, string $email, Role $role, ?int $promovidoPor): PessoaUsuario
    {
        if ($pessoa->usuario()->exists()) {
            throw new RegraNegocioException('pessoa.ja_promovida', 'Esta pessoa já possui usuário vinculado.');
        }

        return DB::transaction(function () use ($pessoa, $email, $role, $promovidoPor): PessoaUsuario {
            $usuario = User::create([
                'name' => $pessoa->nome,
                'email' => $email,
                'password' => null,
                'is_active' => true,
            ]);

            $usuario->tenants()->attach($pessoa->tenant_id, [
                'role_id' => $role->id,
                'status' => 'active',
                'is_primary' => true,
            ]);
            $usuario->roles()->syncWithoutDetaching([$role->id]);

            $vinculo = $pessoa->usuario()->create([
                'user_id' => $usuario->id,
                'promovido_em' => now(),
                'promovido_por' => $promovidoPor,
            ]);

            $this->audit->record('pessoas', 'pessoa.promovida_usuario', "Pessoa #{$pessoa->id}", null, [
                'pessoa_id' => $pessoa->id,
                'user_id' => $usuario->id,
            ]);

            return $vinculo;
        });
    }
}
