<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class ParcelarMultaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // O route model binding resolve antes do escopo de tenant — sem esta checagem,
        // um fiscal de outro órgão agiria sobre o objeto alheio só conhecendo o ID.
        $objeto = $this->route('processoSancionatorio');

        return $this->user()?->hasPermission('meio_ambiente.fiscalizacao.autuar') === true
            && $objeto instanceof ProcessoSancionatorio
            && $objeto->tenant_id === app(TenantContext::class)->id();
    }

    /**
     * O limite de parcelas (`ParcelamentoMulta::LIMITE_PARCELAS`) é regra de negócio,
     * verificada pelo Service (`RegraNegocioException` → 422) — não duplicada aqui.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'numero_parcelas' => ['required', 'integer', 'min:1'],
        ];
    }
}
