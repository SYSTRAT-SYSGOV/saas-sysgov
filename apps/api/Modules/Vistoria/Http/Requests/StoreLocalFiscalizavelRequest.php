<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\LocalFiscalizavel;

final class StoreLocalFiscalizavelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', LocalFiscalizavel::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'proprietario_pessoa_id' => ['required', 'integer'],
            'nome' => ['required', 'string', 'max:255'],
            'tipo' => ['required', 'string', 'in:propriedade_rural,estabelecimento_comercial,feira,evento,outro'],
            'classificacao_atividade' => ['nullable', 'string', 'max:60'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'endereco' => ['nullable', 'string', 'max:255'],
        ];
    }
}
