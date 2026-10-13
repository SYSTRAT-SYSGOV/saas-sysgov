<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Formatura\Models\Configuracao;

/** Filtro de leitura por ano letivo e período (D12, D13). */
final class FiltroPeriodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Configuracao::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'ano_letivo' => ['sometimes', 'integer', 'min:2020', 'max:2100'],
            'data_inicio' => ['nullable', 'date_format:Y-m-d'],
            'data_fim' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
        ];
    }

    public function inicio(): ?string
    {
        $valor = $this->query('data_inicio');

        return is_string($valor) && $valor !== '' ? $valor : null;
    }

    public function fim(): ?string
    {
        $valor = $this->query('data_fim');

        return is_string($valor) && $valor !== '' ? $valor : null;
    }
}
