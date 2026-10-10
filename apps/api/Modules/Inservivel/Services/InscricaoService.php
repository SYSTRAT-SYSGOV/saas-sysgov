<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;

/** Participação da entidade nos lotes publicados (spec: Portal da entidade; Validade dos documentos; D15). */
final class InscricaoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ValidadeDocumentoService $validade,
    ) {}

    public function participar(Entidade $entidade, Lote $lote, ?string $ip): Interesse
    {
        if ($entidade->status !== StatusEntidade::Habilitada) {
            throw new AuthorizationException('Apenas entidades habilitadas pelo Patrimônio podem participar dos lotes.');
        }
        $bloqueios = $this->validade->bloqueios($entidade);
        if ($bloqueios !== []) {
            $lista = implode(', ', array_map(fn (array $b): string => "{$b['nome']} (venceu em " . date('d/m/Y', (int) strtotime($b['validade'])) . ')', $bloqueios));

            throw new DomainException("Documento obrigatório vencido: {$lista}. Envie o documento atualizado para voltar a participar.");
        }

        return DB::transaction(function () use ($entidade, $lote, $ip): Interesse {
            $atual = Lote::query()->lockForUpdate()->findOrFail($lote->id);
            if ($atual->status !== StatusLote::Publicado) {
                throw new DomainException('Este lote não está recebendo inscrições.');
            }
            $existente = Interesse::query()->where('entidade_id', $entidade->id)->where('lote_id', $lote->id)->first();
            if ($existente !== null) {
                return $existente;
            }
            $interesse = Interesse::query()->create(['entidade_id' => $entidade->id, 'lote_id' => $lote->id, 'ip' => $ip]);
            $this->auditar('lote', 'inscricao_criada', $lote->id, null, ['entidade_id' => $entidade->id, 'ip' => $ip]);

            return $interesse;
        });
    }

    public function desistir(Entidade $entidade, Lote $lote): void
    {
        DB::transaction(function () use ($entidade, $lote): void {
            $atual = Lote::query()->lockForUpdate()->findOrFail($lote->id);
            if ($atual->status !== StatusLote::Publicado) {
                throw new DomainException('Só é possível desistir enquanto o lote está publicado.');
            }
            $apagadas = Interesse::query()->where('entidade_id', $entidade->id)->where('lote_id', $lote->id)->delete();
            if ($apagadas > 0) {
                $this->auditar('lote', 'inscricao_removida', $lote->id, ['entidade_id' => $entidade->id], null);
            }
        });
    }
}
