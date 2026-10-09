<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class EmitirAutoInfracaoAmbientalRequest extends FormRequest
{
    public function authorize(): bool
    {
        // O route model binding resolve antes do escopo de tenant — sem esta checagem,
        // um fiscal de outro órgão agiria sobre o objeto alheio só conhecendo o ID.
        $objeto = $this->route('execucaoVistoria');

        return $this->user()?->hasPermission('meio_ambiente.fiscalizacao.autuar') === true
            && $objeto instanceof ExecucaoVistoria
            && $objeto->tenant_id === app(TenantContext::class)->id();
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'empreendimento_id' => ['required', 'integer', 'exists:meio_ambiente_empreendimentos,id'],
            'tipo_infracao' => ['required', Rule::in(AutoInfracaoAmbiental::TIPOS_VALIDOS)],
            'area_afetada_ha' => ['nullable', 'numeric', 'min:0'],
            'irregularidade' => ['nullable', 'string', 'max:1000'],
            'enquadramento_legal' => ['nullable', 'string', 'max:255'],
            'prazo_dias' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
