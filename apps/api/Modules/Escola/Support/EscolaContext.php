<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use App\Support\TenantContext;
use LogicException;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Unidade;

/**
 * Escola de trabalho da requisição (D1) — espelho do TenantContext. Nas rotas dos módulos de
 * educação é definida pelo middleware `escola`; fora delas (comandos, seeders, testes) é
 * definida explicitamente ou cai na escola única do tenant.
 */
final class EscolaContext
{
    private ?Escola $escola = null;

    public function __construct(private readonly TenantContext $tenant) {}

    public function set(Escola $escola): void
    {
        $this->escola = $escola;
    }

    public function clear(): void
    {
        $this->escola = null;
    }

    public function hasEscola(): bool
    {
        return $this->escola !== null;
    }

    public function get(): Escola
    {
        return $this->escola ?? throw new LogicException('EscolaContext não foi resolvido.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }

    /**
     * A escola do tenant quando ele tem uma só — criada na primeira vez a partir da antiga
     * configuração da unidade (ou do nome do tenant). Com duas ou mais, não há escola implícita.
     */
    public function escolaUnicaDoTenant(): ?Escola
    {
        if (!$this->tenant->hasTenant()) {
            return null;
        }

        $escolas = Escola::query()->orderBy('id')->limit(2)->get();
        if ($escolas->count() === 1) {
            return $escolas->first();
        }
        if ($escolas->count() > 1) {
            return null;
        }

        $unidade = Unidade::query()->first();

        return Escola::create([
            'nome' => $unidade !== null ? $unidade->nome : $this->tenant->get()->name,
            'logo_path' => $unidade?->logo_path,
        ]);
    }
}
