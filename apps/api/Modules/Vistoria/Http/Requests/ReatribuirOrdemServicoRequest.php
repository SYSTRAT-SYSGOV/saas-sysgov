<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Vistoria\Models\OrdemServico;

final class ReatribuirOrdemServicoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $ordem = OrdemServico::find($this->route('id'));

        return $ordem !== null && $this->user()?->can('reatribuir', $ordem) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'fiscal_id' => ['required', 'integer'],
        ];
    }
}
