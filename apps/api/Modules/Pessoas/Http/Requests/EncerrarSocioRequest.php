<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Pessoas\Models\PessoaSocio;

final class EncerrarSocioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var PessoaSocio|int|string|null $routeSocio */
        $routeSocio = $this->route('socio');
        $socio = $routeSocio instanceof PessoaSocio ? $routeSocio : PessoaSocio::find((int) $routeSocio);

        return [
            'fim' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, Closure $fail) use ($socio): void {
                    if ($value && $socio?->data_entrada && $value < $socio->data_entrada->toDateString()) {
                        $fail('A data de saída não pode ser anterior à data de entrada (' . $socio->data_entrada->format('d/m/Y') . ').');
                    }
                },
            ],
        ];
    }
}
