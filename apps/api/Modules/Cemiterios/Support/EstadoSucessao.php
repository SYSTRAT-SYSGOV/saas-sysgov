<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** Estados do processo sucessório. */
enum EstadoSucessao: string
{
    case Solicitada = 'solicitada';
    case EmAnalise = 'em_analise';
    case AguardandoDocumentos = 'aguardando_documentos';
    case Validada = 'validada';
    case Sucedida = 'sucedida';
    case Indeferida = 'indeferida';
    case Arquivada = 'arquivada';
}