<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AnnouncementUpdateRequest extends FormRequest
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
            'titulo' => ['nullable', 'string', 'max:150'],
            'conteudo' => ['nullable', 'string'],
            'urgencia' => ['nullable', 'string', 'in:baixa,media,alta,urgente'],
            'data_expiracao' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:rascunho,publicado,arquivado'],
        ];
    }
}
