<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Passeio\Models\Inscricao;

/** Inscrição de um aluno (aluno_id) ou da turma inteira (turma_id). */
final class InscreverRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Inscricao::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'aluno_id' => ['required_without:turma_id', 'prohibits:turma_id', 'integer', $this->existeNoTenant('escola_alunos')],
            'turma_id' => ['required_without:aluno_id', 'integer', $this->existeNoTenant('escola_turmas')],
        ];
    }
}
