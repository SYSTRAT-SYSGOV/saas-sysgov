<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EnviarFotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('aluno')) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'foto' => ['required', 'file', 'mimetypes:image/png,image/jpeg,image/webp', 'max:2048'],
        ];
    }
}
