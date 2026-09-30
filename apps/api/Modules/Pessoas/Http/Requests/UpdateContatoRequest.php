<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaContato;

final class UpdateContatoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var PessoaContato|int|string|null $routeContato */
        $routeContato = $this->route('contato');
        $contato = $routeContato instanceof PessoaContato
            ? $routeContato
            : PessoaContato::find((int) $routeContato);

        $tipoEfetivo = $this->input('tipo', $contato?->tipo);

        return [
            'tipo' => ['sometimes', Rule::in(PessoaContato::TIPOS)],
            'valor' => [
                'sometimes',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($tipoEfetivo): void {
                    if ($tipoEfetivo === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $fail('O endereço de e-mail informado é inválido.');
                    }
                },
            ],
            'principal' => ['sometimes', 'boolean'],
            'autoriza_notificacoes' => ['sometimes', 'boolean'],
        ];
    }
}
