<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EnviarImagemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // escopo verificado no controller (404/403)
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['imagem' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'imagem.mimes' => 'Envie uma imagem JPG ou PNG.',
            'imagem.max' => 'A imagem deve ter no máximo 5 MB.',
        ];
    }
}
