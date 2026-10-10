<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\MembroEquipe;

final class SalvarMembroEquipeRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('membro', MembroEquipe::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            // Escolhido no Cadastro de Pessoas (nome vem da pessoa) ou, como antes, só pelo nome.
            'pessoa_id' => ['nullable', 'integer', $this->existeNoTenant('pessoas')],
            'nome' => [$this->isMethod('post') ? 'required_without:pessoa_id' : 'sometimes', 'nullable', 'string', 'max:200'],
            'cargo' => [$obrigatorio, 'string', Rule::in(MembroEquipe::CARGOS)],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ];
    }
}
