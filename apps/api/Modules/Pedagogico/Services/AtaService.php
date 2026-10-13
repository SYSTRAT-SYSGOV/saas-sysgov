<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Pedagogico\Enums\StatusAta;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Services\Concerns\RegistraMutacao;

final class AtaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $user): Ata
    {
        return DB::transaction(function () use ($dados, $user): Ata {
            $ata = Ata::create([...$dados, 'status' => StatusAta::Rascunho->value, 'registrado_por' => $user->id]);
            $this->auditar('ata', 'criada', $ata->id, null, $ata->toArray());

            return $ata;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Ata $ata, array $dados): Ata
    {
        if ($ata->statusEnum() !== StatusAta::Rascunho) {
            throw new DomainException('A ata está ' . $ata->status . ' e não pode ser editada.');
        }

        return DB::transaction(function () use ($ata, $dados): Ata {
            $antes = $ata->toArray();
            $ata->update($dados);
            $this->auditar('ata', 'atualizada', $ata->id, $antes, $ata->toArray());

            return $ata;
        });
    }

    public function alterarStatus(Ata $ata, StatusAta $novo): Ata
    {
        if (!$ata->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException("Não é possível passar a ata de \"{$ata->status}\" para \"{$novo->value}\".");
        }

        return DB::transaction(function () use ($ata, $novo): Ata {
            $antes = $ata->status;
            $ata->update(['status' => $novo->value]);
            $this->auditar('ata', $novo === StatusAta::Finalizada ? 'finalizada' : 'arquivada', $ata->id, ['status' => $antes], ['status' => $novo->value]);

            return $ata;
        });
    }

    /** Só rascunhos podem ser excluídos (finalizada/arquivada são documento oficial). Exclusão lógica. */
    public function excluir(Ata $ata): void
    {
        if ($ata->statusEnum() !== StatusAta::Rascunho) {
            throw new DomainException('Somente atas em rascunho podem ser excluídas.');
        }
        DB::transaction(function () use ($ata): void {
            $antes = $ata->toArray();
            $ata->delete();
            $this->auditar('ata', 'excluida', $ata->id, $antes, null);
        });
    }
}
