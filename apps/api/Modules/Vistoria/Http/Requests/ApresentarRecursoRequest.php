<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\ProcessoSancionatorio;

final class ApresentarRecursoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $processo = ProcessoSancionatorio::find($this->route('id'));

        return $processo !== null && $this->user()?->can('registrarManifestacao', $processo) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'texto' => ['required', 'string'],
        ];
    }
}
