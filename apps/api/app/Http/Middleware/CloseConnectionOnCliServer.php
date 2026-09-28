<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CloseConnectionOnCliServer
{
    /**
     * Handle an incoming request.
     *
     * No servidor de desenvolvimento embutido do PHP (php -S / artisan serve),
     * conexões HTTP Keep-Alive persistentes ocupam workers do processo até o timeout (60s),
     * bloqueando requisições concorrentes disparadas pelo frontend React.
     * Enviar 'Connection: close' garante que o socket TCP seja encerrado imediatamente
     * ao término de cada resposta, liberando o worker instantaneamente para a próxima requisição.
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (PHP_SAPI === 'cli-server') {
            $response->headers->set('Connection', 'close');
        }

        return $response;
    }
}
