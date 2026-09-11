<?php

declare(strict_types=1);

namespace App\Services\Ai;

/** Erro de configuração ou de comunicação com o provedor de IA — sempre com mensagem segura para exibir ao usuário final. */
final class AiException extends \RuntimeException {}
