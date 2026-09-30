<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Pessoas\Models\PessoaVinculo;

final class EncerrarVinculoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var PessoaVinculo|int|string|null $routeVinculo */
        $routeVinculo = $this->route('vinculo');
        $vinculo = $routeVinculo instanceof PessoaVinculo
            ? $routeVinculo
            : PessoaVinculo::find((int) $routeVinculo);

        return [
            'fim' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, Closure $fail) use ($vinculo): void {
                    if ($value && $vinculo?->inicio && $value < $vinculo->inicio->toDateString()) {
                        $fail('A data de término do vínculo deve ser posterior ou igual à data de início (' . $vinculo->inicio->format('d/m/Y') . ').');
                    }
                },
            ],
        ];
    }
}
