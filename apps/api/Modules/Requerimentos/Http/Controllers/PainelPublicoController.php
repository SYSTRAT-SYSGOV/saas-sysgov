<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Proposicao;

final class PainelPublicoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Proposicao::publica()
            ->with(['tipoInstrumento', 'autorPrincipal']);

        if ($tipo = $request->input('tipo_slug')) {
            $query->whereHas('tipoInstrumento', fn ($q) => $q->where('slug', $tipo));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($exercicio = $request->input('exercicio')) {
            $query->doExercicio((int) $exercicio);
        }

        if ($area = $request->input('area_tematica')) {
            $query->where('area_tematica', $area);
        }

        // Exclui dados pessoais da consulta pública
        $proposicoes = $query->select([
            'id', 'tenant_id', 'tipo_instrumento_id', 'numero', 'exercicio',
            'ementa', 'area_tematica', 'poder_origem', 'autor_principal_id',
            'status', 'created_at', 'updated_at',
        ])->latest()->paginate($request->input('per_page', 15));

        return response()->json($proposicoes);
    }

    /**
     * `$orgao` não é usado no corpo (o middleware já resolveu o tenant), mas precisa estar na
     * assinatura: numa rota com dois parâmetros na URI (`{orgao}/{id}`), o Laravel injeta
     * parâmetro primitivo por POSIÇÃO, não pelo nome do parâmetro do método — `show(int $id)`
     * sozinho receberia o valor de `{orgao}` em vez de `{id}` (mesmo achado da tarefa 3.3 do
     * Cursos, `CatalogoPublicoService::curso()`).
     */
    public function show(string $orgao, int $id): JsonResponse
    {
        $proposicao = Proposicao::publica()
            ->with(['tipoInstrumento', 'autorPrincipal'])
            ->select([
                'id', 'tenant_id', 'tipo_instrumento_id', 'numero', 'numero_sequencial',
                'exercicio', 'ementa', 'justificativa', 'conteudo', 'area_tematica',
                'dispositivos_legais', 'poder_origem', 'autor_principal_id', 'partido_bancada',
                'status', 'created_at', 'updated_at',
            ])
            ->findOrFail($id);

        // Histórico resumido
        $tramitacoes = $proposicao->tramitacoesPoderes()
            ->select([
                'id', 'proposicao_id', 'poder_origem', 'poder_destino',
                'data_encaminhamento', 'data_recebimento', 'data_limite_resposta',
                'status', 'observacao', 'created_at',
            ])
            ->orderBy('created_at')
            ->get();

        // Aplica máscara de dados pessoais no conteúdo público
        $dadoPessoalMasker = app(\Modules\Requerimentos\Support\DadoPessoalMasker::class);
        $proposicao->conteudo = $dadoPessoalMasker->mascarar($proposicao->conteudo);
        $proposicao->justificativa = $dadoPessoalMasker->mascarar($proposicao->justificativa);

        return response()->json([
            'proposicao'   => $proposicao,
            'tramitacoes'  => $tramitacoes,
        ]);
    }
}