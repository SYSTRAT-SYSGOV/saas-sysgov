<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class IncidentAcknowledgeRequest extends FormRequest
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
            'responsavel_pessoa_id' => ['required', 'integer'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }
}
