<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MenuHomologarRequest extends FormRequest
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
            'responsavel_tecnico_nome' => ['required', 'string', 'max:255'],
            'responsavel_tecnico_crn' => ['required', 'string', 'max:50'],
        ];
    }
}
