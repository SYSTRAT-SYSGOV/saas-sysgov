<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Cursos\Services\ValidacaoCertificadoService;

/**
 * Validação pública de certificado — sem login e sem TenantContext.
 * Só pode depender do ValidacaoCertificadoService (teste de arquitetura).
 */
final class ValidacaoCertificadoController extends Controller
{
    public function __construct(
        private readonly ValidacaoCertificadoService $validacao,
    ) {}

    public function __invoke(string $codigo): JsonResponse
    {
        $certificado = $this->validacao->consultar($codigo);

        if ($certificado === null) {
            return response()->json(['encontrado' => false, 'mensagem' => 'Certificado não encontrado. Confira o código digitado.'], 404);
        }

        return response()->json(['encontrado' => true, 'certificado' => $certificado]);
    }
}
