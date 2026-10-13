<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Modules\Pedagogico\Enums\Presenca;

final class RegistrarFrequenciaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('pedagogico.registrar-frequencia', [$this->integer('turma_id')]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'turma_id' => ['required', 'integer', $this->existeNoTenant('escola_turmas')],
            'data' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'aulas' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'registros' => ['required', 'array', 'min:1', 'max:100'],
            'registros.*.aluno_id' => ['required', 'integer', 'distinct', $this->existeNoTenant('escola_alunos')],
            'registros.*.presenca' => ['required', Rule::enum(Presenca::class)],
            'registros.*.observacao' => ['nullable', 'string', 'max:255'],
        ];
    }
}
