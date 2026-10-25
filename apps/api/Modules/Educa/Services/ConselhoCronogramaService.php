<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use LogicException;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaConselhoCronograma;

final class ConselhoCronogramaService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     academic_year_id?: string|null,
     *     status?: string|null
     * } $filtros
     * @return Collection<int, EducaConselhoCronograma>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaConselhoCronograma::query()
            ->with(['school', 'academicYear'])
            ->orderBy('data_reuniao_conselho', 'asc');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['academic_year_id'])) {
            $query->where('academic_year_id', $filtros['academic_year_id']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        return $query->get();
    }

    public function obter(string $cronogramaId): EducaConselhoCronograma
    {
        return EducaConselhoCronograma::with(['school', 'academicYear', 'preConselhos.alunosSinalizados', 'atas'])->findOrFail($cronogramaId);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function criar(array $dados, int $userId): EducaConselhoCronograma
    {
        $this->validarDatas($dados);

        $cronograma = EducaConselhoCronograma::create([
            'school_id' => $dados['school_id'],
            'academic_year_id' => $dados['academic_year_id'],
            'ano_letivo' => (int) $dados['ano_letivo'],
            'periodo' => (string) $dados['periodo'],
            'data_inicio_pre_conselho' => $dados['data_inicio_pre_conselho'],
            'data_fim_pre_conselho' => $dados['data_fim_pre_conselho'],
            'data_reuniao_conselho' => $dados['data_reuniao_conselho'],
            'status' => $dados['status'] ?? 'agendado',
            'observacoes' => $dados['observacoes'] ?? null,
        ]);

        $this->audit->record(
            'educa',
            'educa.conselho.cronograma.created',
            "educa_conselho_cronograma:{$cronograma->id}",
            null,
            $cronograma->toArray()
        );

        return $cronograma;
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $cronogramaId, array $dados, int $userId): EducaConselhoCronograma
    {
        $cronograma = $this->obter($cronogramaId);
        $before = $cronograma->toArray();

        $dadosValidacao = array_merge($cronograma->toArray(), $dados);
        $this->validarDatas($dadosValidacao);

        $cronograma->update(array_filter([
            'periodo' => $dados['periodo'] ?? null,
            'data_inicio_pre_conselho' => $dados['data_inicio_pre_conselho'] ?? null,
            'data_fim_pre_conselho' => $dados['data_fim_pre_conselho'] ?? null,
            'data_reuniao_conselho' => $dados['data_reuniao_conselho'] ?? null,
            'status' => $dados['status'] ?? null,
            'observacoes' => array_key_exists('observacoes', $dados) ? $dados['observacoes'] : null,
        ], fn ($val) => $val !== null));

        $this->audit->record(
            'educa',
            'educa.conselho.cronograma.updated',
            "educa_conselho_cronograma:{$cronograma->id}",
            $before,
            $cronograma->toArray()
        );

        return $cronograma;
    }

    public function excluir(string $cronogramaId, int $userId): void
    {
        $cronograma = $this->obter($cronogramaId);
        if ($cronograma->preConselhos()->exists() || $cronograma->atas()->exists()) {
            throw new LogicException('Não é possível excluir um cronograma com fichas ou atas vinculadas.');
        }

        $before = $cronograma->toArray();
        $cronograma->delete();

        $this->audit->record(
            'educa',
            'educa.conselho.cronograma.deleted',
            "educa_conselho_cronograma:{$cronograma->id}",
            $before,
            null
        );
    }

    public function isPrazoPreConselhoAberto(EducaConselhoCronograma $cronograma, ?string $data = null): bool
    {
        $hoje = $data ?? date('Y-m-d');
        $inicio = $cronograma->data_inicio_pre_conselho->format('Y-m-d');
        $fim = $cronograma->data_fim_pre_conselho->format('Y-m-d');

        return $hoje >= $inicio && $hoje <= $fim;
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function validarDatas(array $dados): void
    {
        $inicio = (string) $dados['data_inicio_pre_conselho'];
        $fim = (string) $dados['data_fim_pre_conselho'];
        $reuniao = (string) $dados['data_reuniao_conselho'];

        if ($inicio > $fim) {
            throw new LogicException('A data de início do pré-conselho não pode ser posterior à data de término.');
        }

        if ($fim > $reuniao) {
            throw new LogicException('A data de término do pré-conselho não pode ser posterior à data da reunião do conselho.');
        }

        $anoLetivo = EducaAcademicYear::find($dados['academic_year_id']);
        if ($anoLetivo) {
            $dataInicioAno = $anoLetivo->data_inicio->format('Y-m-d');
            $dataFimAno = $anoLetivo->data_fim->format('Y-m-d');

            if ($inicio < $dataInicioAno || $reuniao > $dataFimAno) {
                throw new LogicException('As datas do cronograma devem estar compreendidas dentro do ano letivo da escola.');
            }
        }
    }
}
