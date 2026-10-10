<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\Turno;

final class SalvarTurnoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('turno', Turno::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:60'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:255'],
        ];
    }
}
