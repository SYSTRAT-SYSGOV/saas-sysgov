<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Turno;
use Modules\Escola\Services\Concerns\RegistraMutacao;

final class TurnoService
{
    use RegistraMutacao;

    /** Turnos criados para o tenant que nunca teve turnos (design D10). */
    public const PADROES = ['Manhã', 'Tarde', 'Noite'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @return Collection<int, Turno> */
    public function listar(): Collection
    {
        $this->garantirPadroes();

        return Turno::query()->withCount('turmas')->orderBy('ordem')->orderBy('nome')->get();
    }

    public function garantirPadroes(): void
    {
        if (Turno::withTrashed()->exists()) {
            return;
        }
        DB::transaction(function (): void {
            foreach (self::PADROES as $ordem => $nome) {
                Turno::create(['nome' => $nome, 'ordem' => $ordem + 1]);
            }
        });
    }

    /** @param array{nome: string, ordem?: int} $dados */
    public function criar(array $dados): Turno
    {
        return DB::transaction(function () use ($dados): Turno {
            $turno = Turno::create(['nome' => trim($dados['nome']), 'ordem' => $dados['ordem'] ?? ((int) Turno::max('ordem') + 1)]);
            $this->auditar('turno', 'criado', $turno->id, null, $turno->toArray());

            return $turno;
        });
    }

    /** @param array{nome?: string, ordem?: int} $dados */
    public function atualizar(Turno $turno, array $dados): Turno
    {
        return DB::transaction(function () use ($turno, $dados): Turno {
            $antes = $turno->toArray();
            $turno->update($dados);
            $this->auditar('turno', 'atualizado', $turno->id, $antes, $turno->toArray());

            return $turno;
        });
    }

    public function excluir(Turno $turno): void
    {
        if ($turno->turmas()->exists()) {
            throw new DomainException('Este turno tem turmas cadastradas e não pode ser excluído.');
        }
        DB::transaction(function () use ($turno): void {
            $antes = $turno->toArray();
            $turno->delete();
            $this->auditar('turno', 'excluido', $turno->id, $antes, null);
        });
    }
}
