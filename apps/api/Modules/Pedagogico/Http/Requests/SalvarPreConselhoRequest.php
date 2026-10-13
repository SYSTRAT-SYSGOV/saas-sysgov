<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Modules\Pedagogico\Enums\DesempenhoGeral;
use Modules\Pedagogico\Enums\InstrumentosAdequados;
use Modules\Pedagogico\Enums\NivelAtencao;
use Modules\Pedagogico\Enums\NivelEngajamento;
use Modules\Pedagogico\Enums\ObjetivosAtingidos;
use Modules\Pedagogico\Enums\SituacaoSocioemocional;

final class SalvarPreConselhoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return Gate::forUser($this->user())->allows('pedagogico.preencher-ficha', [$this->integer('turma_id'), $this->integer('materia_id')]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'turma_id' => ['required', 'integer', $this->existeNoTenant('escola_turmas')],
            'materia_id' => ['required', 'integer', $this->existeNoTenant('escola_materias')],
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'periodo' => ['required', 'integer', 'in:1,2,3'],
            'data_registro' => ['required', 'date_format:Y-m-d'],
            'desempenho_geral' => ['required', Rule::enum(DesempenhoGeral::class)],
            'objetivos_atingidos' => ['nullable', Rule::enum(ObjetivosAtingidos::class)],
            'instrumentos_adequados' => ['nullable', Rule::enum(InstrumentosAdequados::class)],
            'engajamento_nivel' => ['nullable', Rule::enum(NivelEngajamento::class)],
            'socioemocional_status' => ['nullable', Rule::enum(SituacaoSocioemocional::class)],
            'metodologias' => ['nullable', 'array', 'max:30'],
            'metodologias.*' => ['string', 'max:150'],
            'instrumentos_avaliativos' => ['nullable', 'array', 'max:30'],
            'instrumentos_avaliativos.*' => ['string', 'max:150'],
            'desempenho_justificativa' => ['nullable', 'string', 'max:10000'],
            'conteudos_trabalhados' => ['nullable', 'string', 'max:10000'],
            'metodologias_outras' => ['nullable', 'string', 'max:10000'],
            'metodologias_eficacia' => ['nullable', 'string', 'max:10000'],
            'instrumentos_outros' => ['nullable', 'string', 'max:10000'],
            'instrumentos_obs' => ['nullable', 'string', 'max:10000'],
            'engajamento_dificuldades' => ['nullable', 'string', 'max:10000'],
            'engajamento_potencialidades' => ['nullable', 'string', 'max:10000'],
            'dificuldades_aprendizagem' => ['nullable', 'string', 'max:10000'],
            'estrategias_superacao' => ['nullable', 'string', 'max:10000'],
            'socioemocional_descricao' => ['nullable', 'string', 'max:10000'],
            'obs_pedagogicas' => ['nullable', 'string', 'max:10000'],
            'alunos' => ['present', 'array', 'max:100'],
            'alunos.*.aluno_id' => ['required', 'integer', 'distinct', $this->existeNoTenant('escola_alunos')],
            'alunos.*.nivel_atencao' => ['required', Rule::enum(NivelAtencao::class)],
            'alunos.*.dificuldade' => ['nullable', 'string', 'max:5000'],
            'alunos.*.encaminhamentos' => ['nullable', 'string', 'max:5000'],
            'alunos.*.destaque' => ['sometimes', 'boolean'],
        ];
    }
}
