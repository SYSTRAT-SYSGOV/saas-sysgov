<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ConselhoAtaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $isPost = $this->isMethod('POST');

        return [
            'school_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:educa_schools,id'],
            'school_class_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:educa_school_classes,id'],
            'cronograma_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:educa_conselho_cronogramas,id'],
            'numero_ata' => ['nullable', 'string', 'max:50'],
            'periodo' => ['nullable', 'string', 'max:50'],
            'data_reuniao' => [$isPost ? 'required' : 'sometimes', 'date'],
            'horario_inicio' => ['nullable', 'string', 'max:10'],
            'horario_fim' => ['nullable', 'string', 'max:10'],
            'resumo_geral' => ['nullable', 'string'],
            'deliberacoes_coletivas' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'in:rascunho,em_revisao,finalizada,homologada'],
        ];
    }
}
