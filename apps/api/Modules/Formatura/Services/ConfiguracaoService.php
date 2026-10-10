<?php

declare(strict_types=1);

namespace Modules\Formatura\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Services\Concerns\RegistraMutacao;

final class ConfiguracaoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    public function doAno(int $anoLetivo): ?Configuracao
    {
        return Configuracao::query()->where('ano_letivo', $anoLetivo)->first();
    }

    /**
     * Cria ou atualiza a configuração do ano letivo (uma por tenant e ano).
     *
     * @param array<string, mixed> $dados
     */
    public function salvar(array $dados): Configuracao
    {
        return DB::transaction(function () use ($dados): Configuracao {
            $configuracao = Configuracao::query()->where('ano_letivo', $dados['ano_letivo'])->lockForUpdate()->first();
            $antes = $configuracao?->toArray();
            if ($configuracao === null) {
                $configuracao = Configuracao::create($dados);
            } else {
                $configuracao->update($dados);
            }
            $this->auditar('configuracao', $antes === null ? 'criada' : 'atualizada', $configuracao->id, $antes, $configuracao->toArray(), ['ano_letivo' => $configuracao->ano_letivo]);

            return $configuracao;
        });
    }
}
