<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Models\Configuracao;
use Modules\Inservivel\Services\ImportacaoBensService;

/** Importação da planilha patrimonial em CSV (spec: Configurações e importação; D13). */
final class ImportacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly ImportacaoBensService $importacao,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', Configuracao::class);
        $request->validate(['arquivo' => ['required', 'file', 'mimes:csv,txt', 'max:10240']]);
        $usuario = $request->user();
        abort_unless($usuario instanceof User, 401);

        return $this->executar(fn (): JsonResponse => response()->json(
            $this->importacao->importar((string) $request->file('arquivo')?->getRealPath(), $usuario)
        ));
    }
}
