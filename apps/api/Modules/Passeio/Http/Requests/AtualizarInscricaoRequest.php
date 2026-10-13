<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AtualizarInscricaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('inscricao')) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'vai' => ['sometimes', 'boolean'],
            'autorizacao_entregue' => ['sometimes', 'boolean'],
            'pago' => ['sometimes', 'boolean'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }
}
