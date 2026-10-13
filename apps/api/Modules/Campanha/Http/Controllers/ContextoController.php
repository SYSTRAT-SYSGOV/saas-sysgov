<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Campanha\Support\CampanhaContext;

/** Campanha de trabalho resolvida pelo middleware (com candidato e configuração do mapa). */
final class ContextoController extends Controller
{
    public function __construct(private readonly CampanhaContext $context) {}

    public function atual(): JsonResponse
    {
        $campanha = $this->context->get()->load('candidato.pessoa');

        return response()->json([...$campanha->toArray(), 'cores' => $campanha->cores(), 'faixas' => $campanha->faixas()]);
    }
}
