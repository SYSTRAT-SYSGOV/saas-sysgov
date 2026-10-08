<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\Reinspecao;

final class ConstatarRegularizacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $reinspecao = Reinspecao::find($this->route('id'));

        return $reinspecao !== null && $this->user()?->can('constatar', $reinspecao) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'regularizado' => ['required', 'boolean'],
            'observacao' => ['nullable', 'string'],
        ];
    }
}
