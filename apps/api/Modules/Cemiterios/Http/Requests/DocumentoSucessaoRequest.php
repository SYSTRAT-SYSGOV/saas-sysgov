<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;

final class DocumentoSucessaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cemiterios.sucessao.manage') === true;
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', 'string', 'in:' . implode(',', array_map(fn (TipoDocumentoSucessao $t) => $t->value, TipoDocumentoSucessao::cases()))],
            'arquivo' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'], // max 10MB
        ];
    }

    public function messages(): array
    {
        return [
            'tipo.required' => 'O tipo de documento é obrigatório.',
            'tipo.in' => 'Tipo de documento inválido.',
            'arquivo.required' => 'O arquivo é obrigatório.',
            'arquivo.max' => 'O arquivo não pode exceder 10MB.',
            'arquivo.mimes' => 'O arquivo deve ser PDF, JPG, JPEG ou PNG.',
        ];
    }
}