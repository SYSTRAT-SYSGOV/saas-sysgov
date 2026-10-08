<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;

final class AnexarEvidenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $execucao = $this->route('execucaoId') !== null
            ? ExecucaoVistoria::find($this->route('execucaoId'))
            : null;

        return $execucao !== null && $this->user()?->can('anexar', [Evidencia::class, $execucao]) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'arquivo' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'categoria' => ['required', 'string', 'in:nota_fiscal,licenca,laudo,outro'],
            'descricao' => ['nullable', 'string'],
        ];
    }
}
