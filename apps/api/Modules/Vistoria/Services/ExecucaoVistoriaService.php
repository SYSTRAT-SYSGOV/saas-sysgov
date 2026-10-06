<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\OrdemServico;

final class ExecucaoVistoriaService
{
    public function __construct(
        private AuditLogger $audit,
        private LocalFiscalizavelService $locais,
    ) {}

    /**
     * Sincroniza uma execução de vistoria coletada offline. Idempotente por `client_uuid`:
     * reenvio do mesmo `client_uuid` retorna o registro já existente, sem criar duplicata.
     *
     * Em caso de conflito (outra execução já sincronizada para a mesma ordem), preserva a
     * primeira e grava esta como `suplementar` — nunca descarta dados coletados em campo.
     *
     * @param array<string, mixed> $dados
     *
     * @return array{execucao: ExecucaoVistoria, duplicado: bool}
     */
    public function sincronizar(User $fiscal, OrdemServico $ordem, string $clientUuid, array $dados): array
    {
        $existente = ExecucaoVistoria::where('client_uuid', $clientUuid)->first();

        if ($existente) {
            return ['execucao' => $existente, 'duplicado' => true];
        }

        $execucao = DB::transaction(function () use ($fiscal, $ordem, $clientUuid, $dados): ExecucaoVistoria {
            $jaSincronizada = ExecucaoVistoria::where('ordem_servico_id', $ordem->id)
                ->where('status', ExecucaoVistoria::STATUS_SINCRONIZADA)
                ->exists();

            $status = $jaSincronizada ? ExecucaoVistoria::STATUS_SUPLEMENTAR : ExecucaoVistoria::STATUS_SINCRONIZADA;

            $registro = ExecucaoVistoria::create([
                'ordem_servico_id' => $ordem->id,
                'fiscal_id' => $fiscal->id,
                'client_uuid' => $clientUuid,
                'status' => $status,
                'dados' => $dados['dados'] ?? null,
                'iniciado_em_dispositivo' => $dados['iniciado_em_dispositivo'] ?? null,
                'concluido_em_dispositivo' => $dados['concluido_em_dispositivo'] ?? null,
                'sincronizado_em' => now(),
            ]);

            if ($status === ExecucaoVistoria::STATUS_SINCRONIZADA) {
                $ordem->update(['status' => OrdemServico::STATUS_CONCLUIDA]);
            }

            return $registro;
        });

        $this->audit->record('vistoria', 'execucao.sincronizada', "ExecucaoVistoria #{$execucao->id}", null, $execucao->toArray());

        return ['execucao' => $execucao, 'duplicado' => false];
    }

    /**
     * Pacote do dia: ordens de serviço do fiscal com o histórico de vistorias concluídas
     * de cada local envolvido, para download e acesso offline no dispositivo.
     *
     * @return array<int, array{ordem: OrdemServico, historico_local: \Illuminate\Database\Eloquent\Collection<int, OrdemServico>}>
     */
    public function pacoteDoDia(User $fiscal): array
    {
        $ordens = OrdemServico::with(['local', 'orgUnit'])
            ->where('fiscal_id', $fiscal->id)
            ->where('status', '!=', OrdemServico::STATUS_CANCELADA)
            ->orderBy('data_prevista')
            ->get();

        return $ordens->map(fn (OrdemServico $ordem): array => [
            'ordem' => $ordem,
            'historico_local' => $this->locais->obterHistorico($ordem->local),
        ])->all();
    }
}
