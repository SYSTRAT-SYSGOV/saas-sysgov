<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\CategoriaOcorrencia;

final class SalvarCategoriaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('categoria', CategoriaOcorrencia::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:100'],
            'cor' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
