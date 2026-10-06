<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;

final class ExecucaoVistoriaService
{
    public function __construct(
        private AuditLogger $audit,
        private LocalFiscalizavelService $locais,
        private FormularioService $formularios,
    ) {}

    /**
     * Sincroniza uma execução de vistoria coletada offline. Idempotente por `client_uuid`:
     * reenvio do mesmo `client_uuid` retorna o registro já existente, sem criar duplicata.
     *
     * Em caso de conflito (outra execução já sincronizada para a mesma ordem), preserva a
     * primeira e grava esta como `suplementar` — nunca descarta dados coletados em campo.
     *
     * Quando a ordem tem um modelo de formulário aplicável (resolvido pela classificação de
     * atividade do local), toda pergunta obrigatória precisa de resposta — caso contrário a
     * sincronização é recusada — e as respostas são normalizadas em `RespostaChecklist`.
     *
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando falta resposta para uma pergunta obrigatória do checklist
     *
     * @return array{execucao: ExecucaoVistoria, duplicado: bool}
     */
    public function sincronizar(User $fiscal, OrdemServico $ordem, string $clientUuid, array $dados): array
    {
        $existente = ExecucaoVistoria::where('client_uuid', $clientUuid)->first();

        if ($existente) {
            return ['execucao' => $existente, 'duplicado' => true];
        }

        $modelo = $this->formularios->resolverParaOrdem($ordem);
        $respostas = $dados['dados']['respostas'] ?? [];

        if ($modelo) {
            $this->formularios->validarRespostasObrigatorias($modelo, $respostas);
        }

        $execucao = DB::transaction(function () use ($fiscal, $ordem, $clientUuid, $dados, $modelo, $respostas): ExecucaoVistoria {
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

            if ($modelo && $respostas !== []) {
                $this->formularios->persistirRespostas($registro, $modelo, $respostas);
            }

            if ($status === ExecucaoVistoria::STATUS_SINCRONIZADA) {
                $ordem->update(['status' => OrdemServico::STATUS_CONCLUIDA]);
            }

            return $registro;
        });

        $this->audit->record('vistoria', 'execucao.sincronizada', "ExecucaoVistoria #{$execucao->id}", null, $execucao->toArray());

        return ['execucao' => $execucao, 'duplicado' => false];
    }

    /**
     * Pacote do dia: ordens de serviço do fiscal, com o histórico de vistorias concluídas
     * de cada local e o formulário/checklist aplicável, para download e preenchimento
     * 100% offline no dispositivo (o formulário não pode ser buscado durante a execução
     * sem conectividade, por isso vai embutido no pacote).
     *
     * @return array<int, array{ordem: OrdemServico, historico_local: \Illuminate\Database\Eloquent\Collection<int, OrdemServico>, formulario: ModeloFormulario|null}>
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
            'formulario' => $this->formularios->resolverParaOrdem($ordem),
        ])->all();
    }
}
