<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\ColetaResiduo;

final class RegistrarColetaResiduoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.residuos.manage') === true;
    }

    /**
     * `volume_kg` positivo é regra de negócio (verificada pelo Service,
     * `RegraNegocioException` → 422) — a validação aqui só garante o tipo numérico.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'tipo_coleta' => ['required', Rule::in(ColetaResiduo::TIPOS_COLETA_VALIDOS)],
            'rota' => ['nullable', 'string', 'max:255'],
            'volume_kg' => ['required', 'numeric'],
            'destinacao' => ['required', Rule::in(ColetaResiduo::DESTINACOES_VALIDAS)],
            'coletada_em' => ['nullable', 'date'],
        ];
    }
}
