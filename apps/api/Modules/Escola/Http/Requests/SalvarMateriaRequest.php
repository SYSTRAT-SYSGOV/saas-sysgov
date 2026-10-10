<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\Materia;

final class SalvarMateriaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('materia', Materia::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:150'],
        ];
    }
}
