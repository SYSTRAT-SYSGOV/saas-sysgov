<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Cemiterios\Support\Parentesco;

final class HerdeirosSucessaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cemiterios.sucessao.manage') === true;
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'herdeiros' => ['required', 'array', 'min:1'],
            'herdeiros.*.pessoa_id' => ['nullable', 'integer', 'exists:pessoas,id'],
            'herdeiros.*.nome' => ['required', 'string', 'max:255'],
            'herdeiros.*.parentesco' => ['required', 'string', 'in:' . implode(',', array_map(fn (Parentesco $p) => $p->value, Parentesco::cases()))],
            'herdeiros.*.documento' => ['nullable', 'string', 'max:50'],
            'herdeiros.*.ordem' => ['required', 'integer', 'min:1'],
            'herdeiros.*.direito_representacao' => ['nullable', 'boolean'],
            'herdeiros.*.titular_indicado' => ['nullable', 'boolean'],
            'herdeiros.*.herdeiro_representado_id' => ['nullable', 'integer', 'exists:sucessao_herdeiros,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'herdeiros.required' => 'Pelo menos um herdeiro deve ser informado.',
            'herdeiros.array' => 'Os herdeiros devem ser informados como array.',
            'herdeiros.min' => 'Pelo menos um herdeiro deve ser informado.',
            'herdeiros.*.nome.required' => 'O nome do herdeiro é obrigatório.',
            'herdeiros.*.parentesco.required' => 'O parentesco é obrigatório.',
            'herdeiros.*.parentesco.in' => 'Parentesco inválido.',
            'herdeiros.*.ordem.required' => 'A ordem do herdeiro é obrigatória.',
        ];
    }
}