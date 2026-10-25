<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class IncidentCreateRequest extends FormRequest
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
            'enrollment_id' => ['required', 'uuid'],
            'tipo' => ['required', 'string', 'in:disciplinar,pedagogica,saude,elogio'],
            'gravidade' => ['required', 'string', 'in:baixa,media,alta,gravissima'],
            'relato' => ['required', 'string'],
            'data_ocorrencia' => ['required', 'date'],
        ];
    }
}
