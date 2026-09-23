<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Cemiterios\Models\Parametro;
use Modules\Cemiterios\Services\ParametroService;

/** Parâmetros legais por município (spec: parametros). */
final class ParametroController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly ParametroService $parametros,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.view');

        return response()->json([
            'vigente' => $this->parametros->vigente(),
            'historico' => Parametro::query()->orderByDesc('vigencia_inicio')->limit(50)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.parametros.manage');

        [$minAdulto, $maxAdulto] = config('cemiterios.faixas.prazo_exumacao_adulto_anos');
        [$minEdital, $maxEdital] = config('cemiterios.faixas.edital_prazo_dias');

        $dados = $request->validate([
            'prazo_exumacao_adulto_anos' => ['sometimes', 'integer', "between:{$minAdulto},{$maxAdulto}"],
            'prazo_exumacao_crianca_anos' => ['sometimes', 'integer', 'min:1'],
            'idade_limite_crianca' => ['sometimes', 'integer', 'min:1'],
            'distanciamento_min_m' => ['sometimes', 'numeric', 'gt:0'],
            'tumulo_max_comprimento_m' => ['sometimes', 'numeric', 'gt:0'],
            'tumulo_max_largura_m' => ['sometimes', 'numeric', 'gt:0'],
            'edital_prazo_dias' => ['sometimes', 'integer', "between:{$minEdital},{$maxEdital}"],
            'obras_simultaneas_max' => ['sometimes', 'integer', 'min:1'],
            'notificacao_antecedencia_dias' => ['sometimes', 'integer', 'min:1'],
            'suspensoes_para_cancelamento' => ['sometimes', 'integer', 'min:1'],
            'concessao_temporaria_anos' => ['sometimes', 'integer', 'min:1'],
            'instrucoes_pagamento' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'chave_pix' => ['sometimes', 'nullable', 'string', 'max:120'],
            'portal_habilitado' => ['sometimes', 'boolean'],
        ]);

        $anterior = $this->parametros->vigente()->toArray();
        $versao = $this->parametros->novaVersao($dados, $request->user()->id);

        $this->audit->record('cemiterios', 'parametros.nova_versao', "Parametro #{$versao->id}", $anterior, $versao->toArray());

        return response()->json($versao, 201);
    }
}
