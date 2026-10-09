<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Modules\MeioAmbiente\Models\ParcelaMulta;

final class RegistrarPagamentoParcelaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // O route model binding resolve antes do escopo de tenant — sem esta checagem,
        // um fiscal de outro órgão agiria sobre o objeto alheio só conhecendo o ID.
        $objeto = $this->route('parcelaMulta');

        return $this->user()?->hasPermission('meio_ambiente.fiscalizacao.autuar') === true
            && $objeto instanceof ParcelaMulta
            && $objeto->tenant_id === app(TenantContext::class)->id();
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [];
    }
}
