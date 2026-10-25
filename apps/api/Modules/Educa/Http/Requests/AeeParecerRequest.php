<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeParecerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'parecer_descritivo' => ['required', 'string', 'min:5'],
            'status' => ['nullable', 'string', 'in:revisado,concluido'],
        ];
    }
}
