<?php

declare(strict_types=1);

namespace Modules\Cursos\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Aceita só PNG ou JPEG pelo CONTEÚDO do arquivo (getimagesize), nunca pela extensão ou pelo
 * tipo informado pelo cliente — um script renomeado para .png é recusado.
 */
final class ImagemPngOuJpeg implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $info = $value instanceof UploadedFile && $value->isValid() ? @getimagesize($value->getRealPath()) : false;

        if ($info === false || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG], true)) {
            $fail('O arquivo precisa ser uma imagem PNG ou JPEG.');
        }
    }
}
