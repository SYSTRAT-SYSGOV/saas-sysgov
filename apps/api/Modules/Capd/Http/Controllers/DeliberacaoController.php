<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\Deliberacao;
use Modules\Capd\Models\Recurso;
use Modules\Capd\Models\Sessao;
use Modules\Capd\Models\SessaoPauta;
use Modules\Capd\Services\CalculadoraNotaService;

/**
 * Gestão de Votação e Deliberação Colegiada de Recursos da CAPD (RN-C03 / TC-03).
 */
final class DeliberacaoController extends Controller
{
    public function __construct(
        private readonly CalculadoraNotaService $calculadora,
        private readonly AuditLogger            $audit,
    ) {}

    public function votar(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $user     = $request->user();

        $validated = $request->validate([
            'sessao_id'          => ['required', 'integer', 'exists:capd_sessoes,id'],
            'recurso_id'         => ['required', 'integer', 'exists:capd_recursos,id'],
            'voto_favoravel'     => ['required', 'boolean'],
            'novo_grau_proposto' => ['nullable', 'integer', 'between:1,5'],
            'parecer_voto'       => ['nullable', 'string', 'max:2000'],
        ]);

        $sessao  = Sessao::findOrFail($validated['sessao_id']);
        $recurso = Recurso::with(['avaliacao.ciclo', 'fatorContestado'])->findOrFail($validated['recurso_id']);

        abort_if($sessao->finalizada, 422, 'Não é possível votar em sessão cuja ata já foi selada e finalizada.');

        // ── Validação rigorosa de autorização via Policy (TC-03: Bloqueio de Impedidos) ─
        $this->authorize('votar', $recurso);

        $membro = ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->firstOrFail();

        // Evita voto duplicado do mesmo membro para o mesmo recurso na mesma sessão
        $jaVotou = Deliberacao::where('sessao_id', $sessao->id)
            ->where('recurso_id', $recurso->id)
            ->where('membro_id', $membro->id)
            ->exists();

        abort_if($jaVotou, 422, 'Você já registrou seu voto para este recurso nesta sessão.');

        $deliberacao = Deliberacao::create([
            ...$validated,
            'tenant_id'          => $tenantId,
            'membro_id'          => $membro->id,
            'voto_registrado_em' => now(),
        ]);

        $this->audit->record(
            'capd',
            'recurso.voto_registrado',
            "Membro #{$membro->id} votou no Recurso #{$recurso->id} (Favorável: " . ($validated['voto_favoravel'] ? 'SIM' : 'NÃO') . ")",
            null,
            $deliberacao->toArray(),
        );

        // ── Apuração de resultado caso todos os presentes tenham votado ─
        $totalVotos = Deliberacao::where('sessao_id', $sessao->id)
            ->where('recurso_id', $recurso->id)
            ->count();

        $votosFavoraveis = Deliberacao::where('sessao_id', $sessao->id)
            ->where('recurso_id', $recurso->id)
            ->where('voto_favoravel', true)
            ->count();

        $resultadoFinal = null;

        // Se atingiu quórum mínimo de votos para decisão
        if ($totalVotos >= $sessao->quorum_minimo) {
            $maioria = ($votosFavoraveis > ($totalVotos / 2));

            if ($maioria) {
                $recurso->update(['status' => 'julgado_provido']);

                // Se houver novo grau aprovado pela comissão, atualiza a avaliação e recalcula NFD
                if (! empty($validated['novo_grau_proposto'])) {
                    $avaliacao = $recurso->avaliacao;
                    $respostas = $avaliacao->respostas_fatores;
                    $fatorCod  = $recurso->fatorContestado->codigo;

                    $respostas[$fatorCod]['grau'] = (int) $validated['novo_grau_proposto'];
                    $avaliacao->update(['respostas_fatores' => $respostas]);

                    $this->calculadora->recalcularEPersistir($avaliacao, 'GERAL');
                }

                $resultadoFinal = 'julgado_provido';
            } else {
                $recurso->update(['status' => 'julgado_desprovido']);
                $resultadoFinal = 'julgado_desprovido';
            }

            SessaoPauta::where('sessao_id', $sessao->id)
                ->where('recurso_id', $recurso->id)
                ->update(['status_pauta' => 'deliberado']);
        }

        return response()->json([
            'deliberacao'       => $deliberacao,
            'total_votos'       => $totalVotos,
            'votos_favoraveis'  => $votosFavoraveis,
            'status_recurso'    => $resultadoFinal ?? $recurso->fresh()->status,
        ], 201);
    }
}
