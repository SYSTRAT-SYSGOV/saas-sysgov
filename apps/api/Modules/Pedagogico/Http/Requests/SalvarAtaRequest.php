<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Pedagogico\Models\Ata;

final class SalvarAtaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('ata', Ata::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'turma_id' => [$obrigatorio, 'integer', $this->existeNoTenant('escola_turmas')],
            'ano_letivo' => [$obrigatorio, 'integer', 'min:2020', 'max:2100'],
            'periodo' => [$obrigatorio, 'integer', 'in:1,2,3'],
            'data_reuniao' => [$obrigatorio, 'date_format:Y-m-d'],
            'direcao' => ['nullable', 'string', 'max:200'],
            'pedagogia' => ['nullable', 'string', 'max:300'],
            'secretaria' => ['nullable', 'string', 'max:200'],
            'texto_introducao' => ['nullable', 'string', 'max:50000'],
            'texto_conclusao' => ['nullable', 'string', 'max:50000'],
            'deliberacoes' => ['nullable', 'string', 'max:20000'],
            // Assinaturas desenhadas: papel => PNG em base64 (até ~300 KB por imagem, no máximo 30).
            'assinaturas' => ['nullable', 'array', 'max:30'],
            'assinaturas.*' => ['string', 'max:409600', 'regex:/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/'],
            'aprovados' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'recuperacao' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'retidos' => ['sometimes', 'integer', 'min:0', 'max:999'],
        ];
    }
}
