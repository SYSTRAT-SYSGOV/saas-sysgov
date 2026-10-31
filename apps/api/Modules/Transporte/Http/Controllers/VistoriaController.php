<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Models\Vistoria;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\VistoriaService;
use Modules\Transporte\Support\Formata;

final class VistoriaController extends Controller
{
    public function __construct(
        private readonly VistoriaService $service,
        private readonly TransportePolicy $policy,
        private readonly Formata $formata,
    ) {}

    public function index(Request $request, Veiculo $veiculo): JsonResponse
    {
        abort_unless($this->policy->ver($request->user()), 403);

        return response()->json(['data' => $this->service->historico($veiculo)->map(fn (Vistoria $v): array => $this->formata->vistoria($v))->values()]);
    }

    public function store(Request $request, Veiculo $veiculo): JsonResponse
    {
        abort_unless($this->policy->gerenciarFrota($request->user()), 403);
        $dados = $request->validate([
            'data_vistoria' => ['required', 'date'],
            'certificado' => ['required', 'string', 'max:100'],
            'validade' => ['required', 'date', 'after_or_equal:data_vistoria'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json(['data' => $this->formata->vistoria($this->service->registrar($veiculo, $dados))], 201);
    }
}
