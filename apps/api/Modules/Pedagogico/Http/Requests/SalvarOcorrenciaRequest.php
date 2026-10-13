<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Validation\Rule;
use Modules\Pedagogico\Enums\Severidade;
use Modules\Pedagogico\Models\Ocorrencia;

final class SalvarOcorrenciaRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('ocorrencia', Ocorrencia::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'aluno_id' => [$obrigatorio, 'integer', $this->existeNoTenant('escola_alunos')],
            'categoria_id' => [$obrigatorio, 'integer', $this->existeNoTenant('escola_categorias_ocorrencia')],
            'data' => [$obrigatorio, 'date_format:Y-m-d', 'before_or_equal:today'],
            'descricao' => [$obrigatorio, 'string', 'max:5000'],
            'severidade' => [$obrigatorio, Rule::enum(Severidade::class)],
            'responsavel' => ['nullable', 'string', 'max:200'],
            // mimetypes confere o conteúdo real (finfo), não a extensão.
            'anexo' => ['nullable', 'file', 'mimetypes:application/pdf,image/png,image/jpeg,image/webp', 'max:5120'],
        ];
    }
}
