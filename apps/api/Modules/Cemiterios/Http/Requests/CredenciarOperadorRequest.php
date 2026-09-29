<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CredenciarOperadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cemiterios.cadastros.manage') === true;
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        return [
            'numero' => ['required', 'string', 'max:50'],
            'validade' => ['required', 'date'],
            'arquivo' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
