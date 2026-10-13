<?php

declare(strict_types=1);

namespace Modules\Passeio\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Services\Concerns\RegistraMutacao;

/** Veículos do passeio e mapa de assentos. */
final class FrotaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array<string, mixed> $dados */
    public function criarVeiculo(Passeio $passeio, array $dados): Veiculo
    {
        return DB::transaction(function () use ($passeio, $dados): Veiculo {
            $veiculo = Veiculo::create([...$dados, 'passeio_id' => $passeio->id]);
            $this->auditar('veiculo', 'criado', $veiculo->id, null, $veiculo->toArray(), ['passeio_id' => $passeio->id]);

            return $veiculo;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizarVeiculo(Veiculo $veiculo, array $dados): Veiculo
    {
        return DB::transaction(function () use ($veiculo, $dados): Veiculo {
            if (isset($dados['capacidade'])) {
                $ocupados = $veiculo->assentos()->lockForUpdate()->get(['numero']);
                $capacidade = (int) $dados['capacidade'];
                if ($ocupados->count() > $capacidade || $ocupados->contains(fn (Assento $a): bool => $a->numero > $capacidade)) {
                    throw ValidationException::withMessages(['capacidade' => "O veículo tem {$ocupados->count()} assento(s) ocupado(s) (maior número: {$ocupados->max('numero')}); libere-os antes de reduzir a capacidade."]);
                }
            }
            $antes = $veiculo->toArray();
            $veiculo->update($dados);
            $this->auditar('veiculo', 'atualizado', $veiculo->id, $antes, $veiculo->toArray());

            return $veiculo;
        });
    }

    /** Exclusão lógica; os assentos do veículo são liberados. */
    public function excluirVeiculo(Veiculo $veiculo): void
    {
        DB::transaction(function () use ($veiculo): void {
            $antes = $veiculo->toArray();
            $veiculo->assentos()->delete();
            $veiculo->delete();
            $this->auditar('veiculo', 'excluido', $veiculo->id, $antes, null);
        });
    }

    public function ocupar(Veiculo $veiculo, int $numero, int $alunoId): Assento
    {
        if ($numero < 1 || $numero > $veiculo->capacidade) {
            throw ValidationException::withMessages(['numero' => "O assento deve estar entre 1 e {$veiculo->capacidade}."]);
        }

        return DB::transaction(function () use ($veiculo, $numero, $alunoId): Assento {
            $inscrito = Inscricao::query()->where('passeio_id', $veiculo->passeio_id)->where('aluno_id', $alunoId)->where('vai', true)->exists();
            if (!$inscrito) {
                throw new DomainException('O aluno precisa estar inscrito no passeio, com "vai no passeio" marcado.');
            }
            $ocupante = Assento::query()->where('veiculo_id', $veiculo->id)->where('numero', $numero)->lockForUpdate()->first();
            if ($ocupante !== null && $ocupante->aluno_id !== $alunoId) {
                throw new DomainException("O assento {$numero} já está ocupado.");
            }
            $outro = Assento::query()->where('passeio_id', $veiculo->passeio_id)->where('aluno_id', $alunoId)->lockForUpdate()->first();
            if ($outro !== null && $outro->id !== $ocupante?->id) {
                throw new DomainException("O aluno já tem o assento {$outro->numero} neste passeio.");
            }
            $assento = $ocupante ?? Assento::create(['passeio_id' => $veiculo->passeio_id, 'veiculo_id' => $veiculo->id, 'numero' => $numero, 'aluno_id' => $alunoId]);
            $this->auditar('assento', 'ocupado', $assento->id, null, $assento->toArray(), ['veiculo_id' => $veiculo->id, 'numero' => $numero]);

            return $assento;
        });
    }

    public function liberar(Veiculo $veiculo, int $numero): void
    {
        DB::transaction(function () use ($veiculo, $numero): void {
            $assento = Assento::query()->where('veiculo_id', $veiculo->id)->where('numero', $numero)->first();
            if ($assento === null) {
                return;
            }
            $antes = $assento->toArray();
            $assento->delete();
            $this->auditar('assento', 'liberado', $assento->id, $antes, null, ['veiculo_id' => $veiculo->id, 'numero' => $numero]);
        });
    }
}
