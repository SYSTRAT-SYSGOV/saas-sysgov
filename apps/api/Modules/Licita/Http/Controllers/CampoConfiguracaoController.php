<?php

declare(strict_types=1);

namespace Modules\Licita\Http\Controllers;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Models\CampoConfiguracao;
use Modules\Licita\Services\CampoConfiguracaoService;

final class CampoConfiguracaoController extends Controller
{
    public function __construct(
        private readonly CampoConfiguracaoService $campos,
    ) {}

    public function show(string $tipoDocumento): JsonResponse
    {
        $this->authorize('view', CampoConfiguracao::class);

        $configuracao = $this->campos->getAtiva($tipoDocumento);

        return response()->json($configuracao ?? ['tipo_documento' => $tipoDocumento, 'campos' => []]);
    }

    public function update(Request $request, string $tipoDocumento): JsonResponse
    {
        $this->authorize('manage', CampoConfiguracao::class);

        $data = $request->validate([
            'campos' => ['required', 'array'],
            'campos.*.key' => ['required', 'string', 'max:100'],
            'campos.*.label' => ['required', 'string', 'max:255'],
            'campos.*.tipo' => ['required', 'in:texto,texto_longo,numero,data,booleano,selecao'],
            'campos.*.opcoes' => ['sometimes', 'array'],
            'campos.*.obrigatorio' => ['required', 'boolean'],
            'campos.*.ordem' => ['required', 'integer'],
            'campos.*.ajuda' => ['nullable', 'string', 'max:500'],
        ]);

        if (!in_array($tipoDocumento, array_column(FaseLicita::cases(), 'value'), true)) {
            return response()->json(['error' => 'Tipo de documento inválido.'], 422);
        }

        try {
            $configuracao = $this->campos->salvar($tipoDocumento, $data['campos']);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json($configuracao);
    }
}
