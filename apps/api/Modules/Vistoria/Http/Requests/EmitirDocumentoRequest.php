<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class EmitirDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $execucao = $this->route('execucaoId') !== null
            ? ExecucaoVistoria::find($this->route('execucaoId'))
            : null;

        return $execucao !== null && $this->user()?->can('emitir', [Documento::class, $execucao]) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', 'string', 'in:auto_infracao,notificacao,termo_embargo,termo_apreensao'],
            'irregularidade' => ['nullable', 'string'],
            'enquadramento_legal' => ['nullable', 'string'],
            'prazo_dias' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
