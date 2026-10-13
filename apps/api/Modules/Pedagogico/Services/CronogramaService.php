<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class CronogramaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array{ano_letivo: int, periodo: int, data_inicio: string, data_fim: string} $dados */
    public function criar(array $dados): Cronograma
    {
        $this->validarAno($dados);

        return DB::transaction(function () use ($dados): Cronograma {
            $cronograma = Cronograma::create($dados);
            $this->auditar('cronograma', 'criado', $cronograma->id, null, $cronograma->toArray());

            return $cronograma;
        });
    }

    /** @param array{ano_letivo: int, periodo: int, data_inicio: string, data_fim: string} $dados */
    public function atualizar(Cronograma $cronograma, array $dados): Cronograma
    {
        $this->validarAno($dados);

        return DB::transaction(function () use ($cronograma, $dados): Cronograma {
            $antes = $cronograma->toArray();
            $cronograma->update($dados);
            $this->auditar('cronograma', 'atualizado', $cronograma->id, $antes, $cronograma->toArray());

            return $cronograma;
        });
    }

    public function excluir(Cronograma $cronograma): void
    {
        DB::transaction(function () use ($cronograma): void {
            $antes = $cronograma->toArray();
            $cronograma->delete();
            $this->auditar('cronograma', 'excluido', $cronograma->id, $antes, null);
        });
    }

    /** Ativo hoje; senão o mais próximo de hoje no ano corrente; senão o mais próximo em qualquer ano. */
    public function vigente(): ?Cronograma
    {
        $hoje = Carbon::today();
        $ativo = Cronograma::query()->whereDate('data_inicio', '<=', $hoje)->whereDate('data_fim', '>=', $hoje)->orderBy('data_inicio')->first();
        if ($ativo !== null) {
            return $ativo;
        }
        $maisProximo = fn ($lista) => $lista->sortBy(fn (Cronograma $c): int => (int) abs($c->data_fim->diffInDays($hoje)))->first();

        return $maisProximo(Cronograma::query()->where('ano_letivo', $hoje->year)->get())
            ?? $maisProximo(Cronograma::query()->get());
    }

    /** @param array{ano_letivo: int, data_inicio: string, data_fim: string} $dados */
    private function validarAno(array $dados): void
    {
        $ano = (string) $dados['ano_letivo'];
        foreach (['data_inicio' => 'início', 'data_fim' => 'fim'] as $campo => $rotulo) {
            $anoData = substr($dados[$campo], 0, 4);
            if ($anoData !== $ano) {
                throw ValidationException::withMessages([$campo => "A data de {$rotulo} ({$anoData}) não condiz com o ano letivo ({$ano})."]);
            }
        }
    }
}
