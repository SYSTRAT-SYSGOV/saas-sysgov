<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AnnouncementCreateRequest extends FormRequest
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
            'titulo' => ['required', 'string', 'max:150'],
            'conteudo' => ['required', 'string'],
            'urgencia' => ['required', 'string', 'in:baixa,media,alta,urgente'],
            'school_id' => ['nullable', 'uuid'],
            'data_publicacao' => ['nullable', 'date'],
            'data_expiracao' => ['nullable', 'date'],
            'publicos_alvo' => ['required', 'array', 'min:1'],
            'publicos_alvo.*.tipo_alvo' => ['required', 'string', 'in:rede,escola,curso,turma'],
            'publicos_alvo.*.target_id' => ['nullable', 'uuid'],
        ];
    }
}
