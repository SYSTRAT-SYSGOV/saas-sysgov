<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\OrdemServico;

final class SincronizarExecucaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ordem = $this->input('ordem_servico_id') !== null
            ? OrdemServico::find($this->input('ordem_servico_id'))
            : null;

        return $ordem !== null && $this->user()?->can('sincronizar', [ExecucaoVistoria::class, $ordem]) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'client_uuid' => ['required', 'uuid'],
            'ordem_servico_id' => ['required', 'integer', 'exists:vistoria_ordens_servico,id'],
            'dados' => ['nullable', 'array'],
            'iniciado_em_dispositivo' => ['nullable', 'date'],
            'concluido_em_dispositivo' => ['nullable', 'date'],
        ];
    }
}
