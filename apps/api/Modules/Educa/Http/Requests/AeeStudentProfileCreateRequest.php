<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeStudentProfileCreateRequest extends FormRequest
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
            'enrollment_id' => ['required', 'string', 'uuid'],
            'pessoa_id' => ['required', 'integer'],
            'school_id' => ['nullable', 'string', 'uuid'],
            'tipo_condicao' => ['required', 'string', 'in:deficiencia_fisica,deficiencia_auditiva,deficiencia_visual,deficiencia_intelectual,deficiencia_multipla,surdocegueira,tea,altas_habilidades_superdotacao,investigacao'],
            'cid10_codigo' => ['nullable', 'string', 'max:20'],
            'cid11_codigo' => ['nullable', 'string', 'max:20'],
            'diagnostico_descricao' => ['nullable', 'string'],
            'laudo_medico_url' => ['nullable', 'string', 'max:255'],
            'laudo_medico_emitido_em' => ['nullable', 'date'],
            'laudo_medico_expira_em' => ['nullable', 'date'],
            'profissional_emissor' => ['nullable', 'string', 'max:150'],
            'registro_profissional' => ['nullable', 'string', 'max:50'],
            'precisa_cuidador' => ['nullable', 'boolean'],
            'precisa_interprete_libras' => ['nullable', 'boolean'],
            'precisa_guia_interprete' => ['nullable', 'boolean'],
            'precisa_transporte_adaptado' => ['nullable', 'boolean'],
            'barreiras_identificadas' => ['nullable', 'array'],
            'recursos_acessibilidade' => ['nullable', 'array'],
            'status' => ['nullable', 'string', 'in:ativo,em_avaliacao,inativo'],
        ];
    }
}
