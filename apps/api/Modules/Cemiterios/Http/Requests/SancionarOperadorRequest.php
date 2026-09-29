<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SancionarOperadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cemiterios.cadastros.manage') === true;
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(['advertencia', 'suspensao', 'descredenciamento'])],
            'inicio' => ['required', 'date'],
            'fim' => ['nullable', 'date', 'after_or_equal:inicio', Rule::requiredIf($this->input('tipo') === 'suspensao')],
            'motivo' => ['required', 'string', 'max:2000'],
            'arquivo' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
