<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Cursos\Services\Publico\CatalogoPublicoService;

/**
 * Página pública de um curso — capa, texto de divulgação e as turmas abertas a externos (design
 * D7, tarefa 3.3). Curso inexistente, não publicado ou de outro slug: mesmo `404` do restante das
 * rotas públicas (não distingue os casos, mesma regra do órgão em `ResolvePublicTenant`).
 */
final class CursoController extends Controller
{
    public function __construct(private readonly CatalogoPublicoService $servico) {}

    /**
     * A rota é `{orgao}/cursos/{slug}` — Laravel injeta parâmetros primitivos de rota por
     * posição na URI, não pelo nome do parâmetro do método, então `$orgao` precisa estar aqui
     * mesmo sem ser usado (o tenant já vem do `ResolvePublicTenant`), senão `$slug` recebe o
     * valor do `{orgao}` por engano.
     */
    public function __invoke(string $orgao, string $slug): JsonResponse
    {
        $curso = $this->servico->curso($slug);
        abort_if($curso === null, 404);

        return response()->json($curso);
    }
}
