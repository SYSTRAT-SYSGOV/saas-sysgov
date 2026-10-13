<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Models\Aluno;

final class ImportarAlunosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Aluno::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'arquivo' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ];
    }
}
