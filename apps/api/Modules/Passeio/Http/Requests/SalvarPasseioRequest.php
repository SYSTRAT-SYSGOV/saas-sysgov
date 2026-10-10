<?php

declare(strict_types=1);

namespace Modules\Passeio\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Passeio\Enums\StatusPasseio;
use Modules\Passeio\Models\Passeio;

final class SalvarPasseioRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('passeio', Passeio::class);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';
        /** @var Passeio|null $atual */
        $atual = $this->route('passeio');
        $dataPasseio = $this->input('data_passeio', $atual?->data_passeio?->toDateString());

        return [
            'nome' => [$obrigatorio, 'string', 'max:250'],
            'data_passeio' => [$obrigatorio, 'date_format:Y-m-d'],
            // Prazo das autorizações não pode passar da data do passeio.
            'data_limite_autorizacao' => ['nullable', 'date_format:Y-m-d', ...($dataPasseio !== null ? ['before_or_equal:' . $dataPasseio] : [])],
            'horario_saida' => [$obrigatorio, 'date_format:H:i'],
            'horario_retorno' => ['nullable', 'date_format:H:i'],
            'local_saida' => [$obrigatorio, 'string', 'max:250'],
            'destino' => [$obrigatorio, 'string', 'max:250'],
            'cidade' => [$obrigatorio, 'string', 'max:150'],
            'valor_centavos' => ['sometimes', 'integer', 'min:0'],
            'responsavel' => [$obrigatorio, 'string', 'max:200'],
            'observacoes' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::enum(StatusPasseio::class)],
        ];
    }
}
