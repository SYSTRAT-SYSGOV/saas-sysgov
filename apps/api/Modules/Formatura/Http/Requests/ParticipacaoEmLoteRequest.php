<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Formatura\Models\Participacao;

final class ParticipacaoEmLoteRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Participacao::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'turma_id' => ['required', 'integer', $this->existeNoTenant('escola_turmas')],
            'participa' => ['required', 'boolean'],
        ];
    }
}
