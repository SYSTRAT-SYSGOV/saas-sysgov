<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\ModeloFormulario;

final class StoreModeloFormularioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', ModeloFormulario::class) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'tipo_fiscalizacao' => ['required', 'string', 'in:producao_animal,producao_vegetal,agroindustria,comercio_insumos,outro'],
            'nome' => ['required', 'string', 'max:150'],
            'descricao' => ['nullable', 'string'],
            'ativo' => ['nullable', 'boolean'],
            'perguntas' => ['required', 'array', 'min:1'],
            'perguntas.*.enunciado' => ['required', 'string'],
            'perguntas.*.tipo' => ['required', 'string', 'in:multipla_escolha,texto_livre,foto'],
            'perguntas.*.opcoes' => ['nullable', 'array'],
            'perguntas.*.obrigatoria' => ['nullable', 'boolean'],
            'perguntas.*.ordem' => ['nullable', 'integer'],
        ];
    }
}
