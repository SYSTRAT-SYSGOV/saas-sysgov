<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AtualizarOperadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cemiterios.cadastros.manage') === true;
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        return [
            'pessoa_id' => ['nullable', 'integer', 'exists:pessoas,id'],
            'nome' => ['sometimes', 'required', 'string', 'max:255'],
            'tipo' => ['sometimes', 'required', 'string', 'in:coveiro,pedreiro'],
            'cpf_cnpj' => ['nullable', 'string', 'max:20'],
            'matricula_funcional' => ['nullable', 'string', 'max:30'],
            'park_id' => ['nullable', 'integer', 'exists:cemetery_parks,id'],
            'alvara_numero' => ['nullable', 'string', 'max:50'],
            'alvara_validade' => ['nullable', 'date'],
            'aso_validade' => ['nullable', 'date'],
            'epi_ultimo_registro' => ['nullable', 'date'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'situacao' => ['nullable', 'string', 'in:ativo,suspenso,inativo'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}
