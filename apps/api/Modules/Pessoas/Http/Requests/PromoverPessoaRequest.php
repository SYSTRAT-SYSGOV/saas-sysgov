<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class PromoverPessoaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.promote') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'email.required' => 'O e-mail para a conta de usuário é obrigatório.',
            'email.email' => 'O e-mail informado é inválido.',
            'role_id.required' => 'O perfil de acesso (role) é obrigatório.',
            'role_id.exists' => 'O perfil de acesso selecionado não existe.',
        ];
    }
}
