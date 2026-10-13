<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDocumentoRequest extends FormRequest
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
            'tipo_documento' => ['required', 'string', 'max:64'],
            'arquivo' => ['required', 'file', 'max:20480', 'mimes:pdf,png,jpg,jpeg,docx,odt,xlsx'],
            'nome_arquivo' => ['nullable', 'string', 'max:255'],
        ];
    }
}
