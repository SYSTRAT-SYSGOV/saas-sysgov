<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Services\Concerns\RegistraMutacao;

final class TrimestreService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array{ano_letivo: int, numero: int, data_inicio: string, data_fim: string} $dados */
    public function criar(array $dados): Trimestre
    {
        return DB::transaction(function () use ($dados): Trimestre {
            $this->garantirLivre((int) $dados['ano_letivo'], (int) $dados['numero']);
            $trimestre = Trimestre::create($dados);
            $this->auditar('trimestre', 'criado', $trimestre->id, null, $trimestre->toArray());

            return $trimestre;
        });
    }

    /** @param array{ano_letivo: int, numero: int, data_inicio: string, data_fim: string} $dados */
    public function atualizar(Trimestre $trimestre, array $dados): Trimestre
    {
        return DB::transaction(function () use ($trimestre, $dados): Trimestre {
            $this->garantirLivre((int) $dados['ano_letivo'], (int) $dados['numero'], $trimestre->id);
            $antes = $trimestre->toArray();
            $trimestre->update($dados);
            $this->auditar('trimestre', 'atualizado', $trimestre->id, $antes, $trimestre->toArray());

            return $trimestre;
        });
    }

    public function excluir(Trimestre $trimestre): void
    {
        DB::transaction(function () use ($trimestre): void {
            $antes = $trimestre->toArray();
            $trimestre->delete();
            $this->auditar('trimestre', 'excluido', $trimestre->id, $antes, null);
        });
    }

    private function garantirLivre(int $ano, int $numero, ?int $ignorarId = null): void
    {
        $emUso = Trimestre::query()
            ->where('ano_letivo', $ano)
            ->where('numero', $numero)
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
        if ($emUso) {
            throw ValidationException::withMessages(['numero' => "O {$numero}º trimestre de {$ano} já está cadastrado."]);
        }
    }
}
