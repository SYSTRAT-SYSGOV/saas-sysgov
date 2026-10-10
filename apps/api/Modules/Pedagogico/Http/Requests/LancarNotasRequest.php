<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Support\Facades\Gate;

final class LancarNotasRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('pedagogico.lancar-nota', [$this->integer('turma_id'), $this->integer('materia_id')]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'turma_id' => ['required', 'integer', $this->existeNoTenant('escola_turmas')],
            'materia_id' => ['required', 'integer', $this->existeNoTenant('escola_materias')],
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'trimestre' => ['required', 'integer', 'in:1,2,3'],
            'notas' => ['required', 'array', 'min:1', 'max:100'],
            'notas.*.aluno_id' => ['required', 'integer', 'distinct', $this->existeNoTenant('escola_alunos')],
            'notas.*.nota' => ['required', 'numeric', 'decimal:0,1', 'min:0', 'max:10'],
            'notas.*.nota_recuperacao' => ['nullable', 'numeric', 'decimal:0,1', 'min:0', 'max:10'],
        ];
    }
}
