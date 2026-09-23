<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\TenantContext;
use Illuminate\Support\Facades\Cache;
use Modules\Cemiterios\Models\Parametro;

/**
 * Parâmetros legais vigentes do município (ADR-003, D7). Cache por tenant,
 * invalidado a cada nova versão. Se o tenant ainda não tem parâmetros, a
 * primeira leitura grava os valores de referência do DRS.
 */
final readonly class ParametroService
{
    public function __construct(private TenantContext $tenant) {}

    public function vigente(): Parametro
    {
        return Cache::remember($this->chave(), 3600, function (): Parametro {
            return Parametro::query()
                ->where('vigencia_inicio', '<=', now())
                ->orderByDesc('vigencia_inicio')
                ->orderByDesc('id')
                ->first()
                ?? Parametro::create(['vigencia_inicio' => now()] + config('cemiterios.referencia'));
        });
    }

    /** @param array<string, mixed> $alteracoes */
    public function novaVersao(array $alteracoes, ?int $autorId): Parametro
    {
        $atual = $this->vigente()->only(array_keys(config('cemiterios.referencia')));

        $versao = Parametro::create(array_merge($atual, $alteracoes, [
            'vigencia_inicio' => now(),
            'autor_id' => $autorId,
        ]));

        Cache::forget($this->chave());

        return $versao;
    }

    private function chave(): string
    {
        return 'cemiterios:parametros:' . $this->tenant->id();
    }
}
