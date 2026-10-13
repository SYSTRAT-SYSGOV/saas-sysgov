<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Database\Eloquent\Model;
use Modules\Passeio\Models\Veiculo;

final class SalvarVeiculoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $veiculo = $this->route('veiculo');

        return $veiculo instanceof Model
            ? $this->user()?->can('update', $veiculo) === true
            : $this->user()?->can('create', Veiculo::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'identificacao' => [$obrigatorio, 'string', 'max:150'],
            'placa' => ['nullable', 'string', 'max:10'],
            'motorista' => ['nullable', 'string', 'max:200'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'capacidade' => [$obrigatorio, 'integer', 'min:1', 'max:100'],
            'cor' => ['nullable', 'string', 'max:20'],
        ];
    }
}
