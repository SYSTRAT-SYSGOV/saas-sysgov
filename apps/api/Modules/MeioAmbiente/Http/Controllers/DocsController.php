<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Documentação OpenAPI do módulo — spec estático escrito à mão + Swagger UI via CDN,
 * mesmo padrão (e mesma justificativa: sem dependência nova) de `Vistoria\DocsController`.
 */
final class DocsController extends Controller
{
    public function ui(): Response
    {
        $html = <<<'HTML'
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <title>Meio Ambiente — Documentação da API</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                <script>
                    window.onload = function () {
                        window.ui = SwaggerUIBundle({
                            url: '/api/meio_ambiente/docs/openapi.yaml',
                            dom_id: '#swagger-ui',
                            presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                        });
                    };
                </script>
            </body>
            </html>
            HTML;

        return response($html)->header('Content-Type', 'text/html');
    }

    public function spec(): Response
    {
        $yaml = (string) file_get_contents(dirname(__DIR__, 2) . '/Resources/openapi.yaml');

        return response($yaml)->header('Content-Type', 'application/yaml');
    }
}
