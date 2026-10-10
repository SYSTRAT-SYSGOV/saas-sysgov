<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Passeio\Models\Inscricao;

/** Marca ou desmarca "vai" para a turma inteira num passeio (D18). */
final class InscricoesEmLoteRequest extends FormRequest
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
            'turma_id' => ['required', 'integer', $this->existeNoTenant('escola_turmas')],
            'vai' => ['required', 'boolean'],
        ];
    }
}
