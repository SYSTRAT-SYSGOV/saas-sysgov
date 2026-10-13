<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;

final class OcuparAssentoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('veiculo')) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'aluno_id' => ['required', 'integer', $this->existeNoTenant('escola_alunos')],
        ];
    }
}
