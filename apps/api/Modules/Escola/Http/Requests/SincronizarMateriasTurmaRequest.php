<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;

final class SincronizarMateriasTurmaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('turma')) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'vinculos' => ['present', 'array'],
            'vinculos.*.materia_id' => ['required', 'integer', 'distinct', $this->existeNoTenant('escola_materias')],
            'vinculos.*.professor_user_id' => ['nullable', 'integer', $this->usuarioDoTenant()],
        ];
    }
}
