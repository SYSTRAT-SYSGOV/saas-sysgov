<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\LocalFiscalizavel;

final class UpdateLocalFiscalizavelRequest extends FormRequest
{
    public function authorize(): bool
    {
        $local = $this->route('id') !== null
            ? LocalFiscalizavel::find($this->route('id'))
            : null;

        return $local !== null && $this->user()?->can('update', $local) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'proprietario_pessoa_id' => ['sometimes', 'required', 'integer'],
            'nome' => ['sometimes', 'required', 'string', 'max:255'],
            'tipo' => ['sometimes', 'required', 'string', 'in:propriedade_rural,estabelecimento_comercial,feira,evento,outro'],
            'classificacao_atividade' => ['nullable', 'string', 'max:60'],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'endereco' => ['nullable', 'string', 'max:255'],
        ];
    }
}
