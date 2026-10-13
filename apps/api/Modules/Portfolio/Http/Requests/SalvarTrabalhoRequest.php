<?php

declare(strict_types=1);

namespace Modules\Portfolio\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Portfolio\Support\Avaliacao;

/** Dados do trabalho. A autorização por escopo fica no controller (404 fora do escopo, 403 sem permissão). */
final class SalvarTrabalhoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'titulo' => [$obrigatorio, 'string', 'max:160'],
            'materia_id' => [$obrigatorio, 'integer', $this->existeNoTenant('escola_materias')],
            'data' => [$obrigatorio, 'date_format:Y-m-d'],
            'avaliacao' => [$obrigatorio, function (string $atributo, mixed $valor, Closure $falha): void {
                if (!Avaliacao::valida($valor)) {
                    $falha('A avaliação deve ser de 0 a 10, com no máximo uma casa decimal.');
                }
            }],
            'descricao' => ['nullable', 'string', 'max:5000'],
            'observacoes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
