<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\QueryException;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\StatusProcesso;
use Modules\Licita\Models\Processo;

final class ProcessoService
{
    private const TENTATIVAS_NUMERACAO = 3;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * Número e ano não vêm do usuário — o ano é sempre o corrente e o
     * número é sequencial dentro do ano (RN: usuário só informa o objeto
     * preliminar, refinado depois no DFD).
     *
     * @param array{objeto?: string|null} $data
     */
    public function criar(array $data, User $user): Processo
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do processo.');
        }

        $ano = (int) now()->year;

        // Pequeno retry contra a rara condição de corrida entre duas criações
        // simultâneas calculando o mesmo "próximo número" — a constraint
        // única (tenant_id, numero, ano) barra o duplicado no banco; aqui só
        // recalculamos e tentamos de novo em vez de estourar erro pro usuário.
        for ($tentativa = 1; ; $tentativa++) {
            try {
                $processo = Processo::create([
                    'numero' => $this->proximoNumero($ano),
                    'ano' => $ano,
                    'objeto' => $data['objeto'] ?? null,
                    'fase_atual' => FaseLicita::Dfd->value,
                    'status_geral' => StatusProcesso::EmAndamento->value,
                    'criado_por' => $user->id,
                ]);
                break;
            } catch (QueryException $e) {
                $isDuplicidade = str_contains($e->getMessage(), 'Duplicate entry');
                if (!$isDuplicidade || $tentativa >= self::TENTATIVAS_NUMERACAO) {
                    throw $e;
                }
            }
        }

        $this->audit->record('licita', 'processo.criado', "Processo #{$processo->id}", null, $processo->toArray());
        $this->outbox->publish('licita.ProcessoCriado', ['id' => $processo->id, 'numero' => $processo->numero, 'ano' => $processo->ano]);

        return $processo;
    }

    /**
     * Próximo número sequencial do ano, com 3 dígitos ("001", "002"...).
     * Considera registros com soft-delete (withTrashed) porque a constraint
     * única (tenant_id, numero, ano) não os exclui — reaproveitar o número
     * de um processo excluído colidiria no INSERT.
     */
    private function proximoNumero(int $ano): string
    {
        $ultimo = Processo::withTrashed()
            ->where('ano', $ano)
            ->selectRaw('MAX(CAST(numero AS UNSIGNED)) as maximo')
            ->value('maximo');

        return str_pad((string) (((int) $ultimo) + 1), 3, '0', STR_PAD_LEFT);
    }

    /**
     * Avança a fase do processo (ex.: dfd -> etp quando o DFD é aprovado).
     * Não valida a máquina de estados aqui — cada fase (DfdService, EtpService...)
     * decide quando é hora de empurrar o processo adiante.
     */
    public function avancarFase(Processo $processo, FaseLicita $novaFase, ?string $objeto = null): Processo
    {
        $antes = $processo->toArray();

        $processo->update([
            'fase_atual' => $novaFase->value,
            ...($objeto !== null ? ['objeto' => $objeto] : []),
        ]);
        $processo->refresh();

        $this->audit->record('licita', 'processo.fase_avancada', "Processo #{$processo->id}", $antes, $processo->toArray());
        $this->outbox->publish('licita.ProcessoFaseAvancada', ['id' => $processo->id, 'fase' => $novaFase->value]);

        return $processo;
    }
}
