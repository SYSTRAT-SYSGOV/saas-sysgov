<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\OrdemServico;

final class StoreOrdemServicoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrdemServico::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'local_id' => ['required', 'integer'],
            'org_unit_id' => ['required', 'integer'],
            'fiscal_id' => ['nullable', 'integer'],
            'tipo_acao' => ['required', 'string', 'in:vistoria_rotina,inspecao_sanitaria,atendimento_denuncia,reinspecao,autuacao'],
            'criticidade' => ['nullable', 'string', 'in:baixa,media,alta,urgente'],
            'data_prevista' => ['required', 'date'],
            'roteiro_deslocamento' => ['nullable', 'string'],
        ];
    }
}
