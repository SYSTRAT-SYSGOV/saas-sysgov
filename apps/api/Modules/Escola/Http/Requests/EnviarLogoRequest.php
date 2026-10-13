<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Models\Unidade;

final class EnviarLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Unidade::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            // mimetypes confere o conteúdo real do arquivo (finfo), não a extensão.
            'logo' => ['required', 'file', 'mimetypes:image/png,image/jpeg,image/webp', 'max:2048'],
        ];
    }
}
