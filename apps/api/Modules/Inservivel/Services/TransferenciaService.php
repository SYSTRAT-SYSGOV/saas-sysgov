<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusTransferencia;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Transferência interna entre secretarias (spec: Transferência interna entre secretarias; D3, D11).
 *
 * Uma transferência aberta (anunciado ou solicitado) por bem, garantido com lock. A secretaria do servidor é a da
 * lotação no Organograma; o Gestor (inservivel.transferencias.aprovar) anuncia bens de qualquer secretaria.
 */
final class TransferenciaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ParametrosService $parametros,
        private readonly LotacaoService $lotacao,
        private readonly TenantContext $tenant,
    ) {}

    public function ehGestor(User $user): bool
    {
        return $user->hasPermission('inservivel.transferencias.aprovar', $this->tenant->id());
    }

    public function secretariaDe(User $user): ?OrgUnit
    {
        return $this->lotacao->secretariaDoUsuario($user);
    }

    public function anunciar(Bem $bem, User $user, ?string $observacao): Transferencia
    {
        if (!$this->ehGestor($user)) {
            $minha = $this->secretariaDe($user);
            if ($minha === null) {
                throw new DomainException('Seu usuário não tem lotação no Organograma. Peça ao administrador para vincular sua secretaria.');
            }
            if ($minha->id !== $bem->secretaria_unit_id) {
                throw new AuthorizationException('Só é possível anunciar bens da sua própria secretaria.');
            }
        }

        return DB::transaction(function () use ($bem, $user, $observacao): Transferencia {
            $atual = Bem::query()->lockForUpdate()->findOrFail($bem->id);
            $papel = $this->parametros->papelDe($atual->situacao_id);
            if (!in_array($papel, [PapelSituacao::Disponivel, PapelSituacao::Inservivel], true)) {
                throw new DomainException('Só bens disponíveis ou inservíveis podem ser anunciados para transferência.');
            }
            if (Transferencia::query()->where('bem_id', $atual->id)->whereIn('status', StatusTransferencia::abertas())->exists()) {
                throw new DomainException('Este bem já está anunciado para transferência.');
            }
            $transferencia = Transferencia::query()->create([
                'bem_id' => $atual->id, 'secretaria_origem_unit_id' => $atual->secretaria_unit_id, 'status' => StatusTransferencia::Anunciado,
                'situacao_anterior_id' => $atual->situacao_id, 'observacao' => $observacao, 'anunciado_por' => $user->id,
            ]);
            $atual->update(['situacao_id' => $this->parametros->idDoPapel(PapelSituacao::EmTransferencia)]);
            $this->auditar('transferencia', 'anunciada', $transferencia->id, null, $transferencia->toArray());

            return $transferencia;
        });
    }

    public function solicitar(Transferencia $transferencia, User $user): Transferencia
    {
        $minha = $this->secretariaDe($user);
        if ($minha === null) {
            throw new DomainException('Seu usuário não tem lotação no Organograma. Peça ao administrador para vincular sua secretaria antes de solicitar.');
        }

        return DB::transaction(function () use ($transferencia, $user, $minha): Transferencia {
            $atual = Transferencia::query()->lockForUpdate()->findOrFail($transferencia->id);
            if ($atual->status !== StatusTransferencia::Anunciado) {
                throw new DomainException('Este bem já foi solicitado ou a transferência foi concluída.');
            }
            if ($atual->secretaria_origem_unit_id === $minha->id) {
                throw new DomainException('Não é possível solicitar um bem da sua própria secretaria.');
            }
            $atual->update(['status' => StatusTransferencia::Solicitado, 'secretaria_destino_unit_id' => $minha->id, 'solicitado_por' => $user->id, 'data_solicitacao' => now()]);
            $this->auditar('transferencia', 'solicitada', $atual->id, null, ['destino' => $minha->id, 'solicitado_por' => $user->id]);

            return $atual;
        });
    }

    public function aprovar(Transferencia $transferencia, User $gestor): Transferencia
    {
        return DB::transaction(function () use ($transferencia, $gestor): Transferencia {
            $atual = $this->solicitadaComLock($transferencia);
            $bem = Bem::query()->lockForUpdate()->findOrFail($atual->bem_id);
            $antes = $bem->only(['secretaria_unit_id', 'setor_unit_id', 'situacao_id']);
            $bem->update([
                'secretaria_unit_id' => $atual->secretaria_destino_unit_id, 'setor_unit_id' => null,
                'situacao_id' => $this->parametros->idDoPapel(PapelSituacao::Disponivel),
            ]);
            $atual->update(['status' => StatusTransferencia::Aceito, 'decidido_por' => $gestor->id, 'data_conclusao' => now()]);
            $this->auditar('transferencia', 'aprovada', $atual->id, $antes, $bem->only(['secretaria_unit_id', 'setor_unit_id', 'situacao_id']));
            $this->publicar('TransferenciaAprovada', ['id' => $atual->id, 'bem_id' => $bem->id, 'origem' => $atual->secretaria_origem_unit_id, 'destino' => $atual->secretaria_destino_unit_id]);

            return $atual;
        });
    }

    /** O pedido fica Recusado (histórico) e um novo anúncio volta à vitrine para o mesmo bem (D11). */
    public function recusar(Transferencia $transferencia, User $gestor, string $motivo): Transferencia
    {
        return DB::transaction(function () use ($transferencia, $gestor, $motivo): Transferencia {
            $atual = $this->solicitadaComLock($transferencia);
            $atual->update(['status' => StatusTransferencia::Recusado, 'motivo_recusa' => $motivo, 'decidido_por' => $gestor->id, 'data_conclusao' => now()]);
            $novo = Transferencia::query()->create([
                'bem_id' => $atual->bem_id, 'secretaria_origem_unit_id' => $atual->secretaria_origem_unit_id, 'status' => StatusTransferencia::Anunciado,
                'situacao_anterior_id' => $atual->situacao_anterior_id, 'observacao' => $atual->getAttribute('observacao'), 'anunciado_por' => $atual->anunciado_por,
            ]);
            $this->auditar('transferencia', 'recusada', $atual->id, null, ['motivo' => $motivo, 'novo_anuncio' => $novo->id]);

            return $atual;
        });
    }

    public function cancelar(Transferencia $transferencia, User $user): void
    {
        DB::transaction(function () use ($transferencia, $user): void {
            $atual = Transferencia::query()->lockForUpdate()->findOrFail($transferencia->id);
            if ($atual->status !== StatusTransferencia::Anunciado) {
                throw new DomainException('Só é possível cancelar um anúncio que ainda não foi solicitado.');
            }
            if ($atual->anunciado_por !== $user->id && !$this->ehGestor($user)) {
                throw new AuthorizationException('Só quem anunciou ou o Patrimônio pode cancelar o anúncio.');
            }
            Bem::query()->whereKey($atual->bem_id)->update(['situacao_id' => $atual->situacao_anterior_id ?? $this->parametros->idDoPapel(PapelSituacao::Disponivel)]);
            $atual->update(['status' => StatusTransferencia::Cancelado, 'data_conclusao' => now()]);
            $this->auditar('transferencia', 'cancelada', $atual->id, null, ['por' => $user->id]);
        });
    }

    private function solicitadaComLock(Transferencia $transferencia): Transferencia
    {
        $atual = Transferencia::query()->lockForUpdate()->findOrFail($transferencia->id);
        if ($atual->status !== StatusTransferencia::Solicitado) {
            throw new DomainException('Esta transferência não está aguardando aprovação.');
        }

        return $atual;
    }
}
