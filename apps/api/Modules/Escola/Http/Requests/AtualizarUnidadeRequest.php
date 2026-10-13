<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Models\Unidade;

final class AtualizarUnidadeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Unidade::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:200'],
        ];
    }
}
