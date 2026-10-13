<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\Turma;

final class SalvarTurmaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('turma', Turma::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:100'],
            'turno_id' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer', $this->existeNoTenant('escola_turnos')],
            'pedagoga_id' => ['sometimes', 'nullable', 'integer', $this->existeNoTenant('escola_equipe')->where('cargo', 'pedagoga')],
            'ano_letivo' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer', 'min:2000', 'max:2100'],
        ];
    }
}
