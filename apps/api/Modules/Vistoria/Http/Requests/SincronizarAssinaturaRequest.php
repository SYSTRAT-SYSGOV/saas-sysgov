<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\Documento;

final class SincronizarAssinaturaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $documento = $this->route('documentoId') !== null
            ? Documento::find($this->route('documentoId'))
            : null;

        return $documento !== null && $this->user()?->can('view', $documento) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'client_uuid' => ['required', 'uuid'],
            'papel' => ['required', 'string', 'in:autuado,responsavel,testemunha'],
            'status' => ['required', 'string', 'in:assinada,recusada'],
            'tracado_vetorial' => ['required_if:status,assinada', 'nullable', 'array'],
            'imagem_base64' => ['required_if:status,assinada', 'nullable', 'string'],
            'motivo' => ['required_if:status,recusada', 'nullable', 'string'],
            'testemunha_pessoa_id' => ['nullable', 'integer'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'coletado_em_dispositivo' => ['nullable', 'date'],
        ];
    }
}
