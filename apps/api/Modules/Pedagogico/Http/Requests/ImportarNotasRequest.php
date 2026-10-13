<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Support\Facades\Gate;

final class ImportarNotasRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('pedagogico.gerir-notas');
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'arquivo' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
        ];
    }
}
