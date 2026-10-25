<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ReassignRequest extends FormRequest
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
            'turma_destino_id' => ['required', 'uuid'],
            'data_remanejamento' => ['required', 'date_format:Y-m-d'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ];
    }
}
