<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicStage;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaStageType;

/**
 * Serviço de Negócio do Ano Letivo: Ciclo de Vida, Cópia Anual, Etapas e Lote.
 */
final class AcademicYearService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly AcademicYearStateMachine $stateMachine,
    ) {}

    /**
     * @param array{
     *     tenant_id: int,
     *     school_id: string,
     *     ano: int,
     *     tipo_etapa_id?: string|null,
     *     etapas?: list<array{sequencial: int, data_inicio: string, data_fim: string, dias_letivos?: int|null}>,
     *     copiar_turmas?: bool,
     *     copiar_dados_professor?: bool,
     *     copiar_dados_demais_servidores?: bool,
     *     observacao?: string|null
     * } $data
     */
    public function criar(array $data): EducaAcademicYear
    {
        $tenantId = $data['tenant_id'];
        $schoolId = $data['school_id'] ?? null;
        $ano = $data['ano'];

        $query = EducaAcademicYear::query()->where('ano', $ano);
        if ($schoolId !== null) {
            $query->where('school_id', $schoolId);
        } else {
            $query->whereNull('school_id');
        }

        if ($query->exists()) {
            throw new LogicException("A escola/unidade já possui ano letivo cadastrado para o exercício {$ano}.");
        }

        return DB::transaction(function () use ($data, $tenantId, $schoolId, $ano): EducaAcademicYear {
            $year = EducaAcademicYear::create([
                'tenant_id' => $tenantId,
                'school_id' => $schoolId,
                'ano' => $ano,
                'status' => AcademicYearStateMachine::STATUS_PLANNING,
                'is_immutable' => false,
                'tipo_etapa_id' => $data['tipo_etapa_id'] ?? null,
                'copiou_turmas' => (bool) ($data['copiar_turmas'] ?? false),
                'copiou_dados_professor' => (bool) ($data['copiar_dados_professor'] ?? false),
                'copiou_dados_demais_servidores' => (bool) ($data['copiar_dados_demais_servidores'] ?? false),
                'observacao' => $data['observacao'] ?? null,
            ]);

            // Se foram passadas etapas diretamente na criação
            if (!empty($data['etapas']) && !empty($data['tipo_etapa_id'])) {
                $this->substituirEtapas($year, $data['tipo_etapa_id'], $data['etapas']);
            } elseif (!empty($data['copiar_turmas'])) {
                // Cópia do ano anterior
                $this->copiarEstruturaAnoAnterior($year);
            }

            $this->audit->record('educa', 'academic_year.created', "EducaAcademicYear #{$year->id}", null, $year->fresh()->toArray());

            return $year->fresh();
        });
    }

    /**
     * Substitui o conjunto de etapas do ano letivo aplicando todas as validações da LDB e do legado.
     *
     * @param list<array{
     *     sequencial: int,
     *     data_inicio: string,
     *     data_fim: string,
     *     dias_letivos?: int|null
     * }> $etapasInput
     */
    public function substituirEtapas(EducaAcademicYear $year, string $tipoEtapaId, array $etapasInput): void
    {
        if ($year->is_immutable) {
            throw new LogicException('Não é possível alterar etapas de um ano letivo encerrado.');
        }

        $tipoEtapa = EducaStageType::findOrFail($tipoEtapaId);

        if (count($etapasInput) !== $tipoEtapa->num_etapas) {
            throw new InvalidArgumentException(
                "O tipo de etapa '{$tipoEtapa->nome}' exige exatamente {$tipoEtapa->num_etapas} etapa(s), mas foram informadas " . count($etapasInput) . '.'
            );
        }

        // Validação interna: sequencial, ordenação, sobreposição e data_fim >= data_inicio
        usort($etapasInput, fn (array $a, array $b): int => $a['sequencial'] <=> $b['sequencial']);

        $minData = null;
        $maxData = null;
        $previousEnd = null;

        foreach ($etapasInput as $etapa) {
            $inicio = Carbon::parse($etapa['data_inicio']);
            $fim = Carbon::parse($etapa['data_fim']);

            if ($fim->lt($inicio)) {
                throw new InvalidArgumentException("Etapa {$etapa['sequencial']}: data final não pode ser anterior à data inicial.");
            }

            if ($previousEnd !== null && $inicio->lte($previousEnd)) {
                throw new InvalidArgumentException("Etapa {$etapa['sequencial']}: há sobreposição de datas com a etapa anterior.");
            }

            $previousEnd = $fim;

            if ($minData === null || $inicio->lt($minData)) {
                $minData = $inicio;
            }
            if ($maxData === null || $fim->gt($maxData)) {
                $maxData = $fim;
            }
        }

        // Validação contra outros anos letivos da mesma escola
        $conflito = EducaAcademicStage::query()
            ->whereHas('academicYear', function ($q) use ($year): void {
                $q->where('school_id', $year->school_id)
                  ->where('id', '!=', $year->id);
            })
            ->where(function ($q) use ($minData, $maxData): void {
                $q->whereBetween('data_inicio', [$minData->format('Y-m-d'), $maxData->format('Y-m-d')])
                  ->orWhereBetween('data_fim', [$minData->format('Y-m-d'), $maxData->format('Y-m-d')]);
            })
            ->exists();

        if ($conflito) {
            throw new InvalidArgumentException('As datas das etapas conflitam com o período de outro ano letivo desta escola.');
        }

        DB::transaction(function () use ($year, $tipoEtapaId, $etapasInput, $minData, $maxData): void {
            // Remove etapas anteriores
            EducaAcademicStage::where('academic_year_id', $year->id)->delete();

            foreach ($etapasInput as $etapa) {
                EducaAcademicStage::create([
                    'tenant_id' => $year->tenant_id,
                    'academic_year_id' => $year->id,
                    'sequencial' => $etapa['sequencial'],
                    'data_inicio' => $etapa['data_inicio'],
                    'data_fim' => $etapa['data_fim'],
                    'dias_letivos' => $etapa['dias_letivos'] ?? null,
                ]);
            }

            $before = $year->toArray();

            $year->update([
                'tipo_etapa_id' => $tipoEtapaId,
                'data_inicio' => $minData->format('Y-m-d'),
                'data_fim' => $maxData->format('Y-m-d'),
            ]);

            $this->audit->record('educa', 'academic_stages.replaced', "EducaAcademicYear #{$year->id}", $before, $year->fresh()->toArray());
        });
    }

    /**
     * Aplica uma transição explícita de estado no ano letivo.
     */
    public function transicionar(EducaAcademicYear $year, string $evento, ?string $justificativa = null): EducaAcademicYear
    {
        $proximoStatus = $this->stateMachine->getNextStatus($year, $evento);

        // Invariantes adicionais de domínio
        if ($evento === AcademicYearStateMachine::EVENT_START) {
            if ($year->etapas()->count() === 0) {
                throw new LogicException('O ano letivo não pode ser iniciado sem etapas cadastradas.');
            }
        }

        $before = $year->toArray();

        $updateData = ['status' => $proximoStatus];

        if ($proximoStatus === AcademicYearStateMachine::STATUS_CLOSED) {
            $updateData['is_immutable'] = true;
        }

        $year->update($updateData);

        $this->audit->record(
            'educa',
            "academic_year.transition.{$evento}",
            "EducaAcademicYear #{$year->id}",
            $before,
            array_merge($year->fresh()->toArray(), ['justificativa' => $justificativa])
        );

        return $year->fresh();
    }

    /**
     * Cópia do ano anterior com reparo de datas e bissexto (legado AY-04).
     */
    private function copiarEstruturaAnoAnterior(EducaAcademicYear $novoAno): void
    {
        $anoAnterior = EducaAcademicYear::query()
            ->where('school_id', $novoAno->school_id)
            ->where('ano', '<', $novoAno->ano)
            ->orderByDesc('ano')
            ->first();

        if (!$anoAnterior) {
            return;
        }

        $diferencaAnos = $novoAno->ano - $anoAnterior->ano;

        // Copia etapas com ajuste das datas para o novo ano
        $etapasOriginais = $anoAnterior->etapas()->get();
        if ($etapasOriginais->isNotEmpty()) {
            $novoAno->update(['tipo_etapa_id' => $anoAnterior->tipo_etapa_id]);

            $novasEtapas = [];
            foreach ($etapasOriginais as $etapa) {
                $dataInicioAjustada = $this->ajustarDataAno($etapa->data_inicio->format('Y-m-d'), $diferencaAnos);
                $dataFimAjustada = $this->ajustarDataAno($etapa->data_fim->format('Y-m-d'), $diferencaAnos);

                $novasEtapas[] = [
                    'sequencial' => $etapa->sequencial,
                    'data_inicio' => $dataInicioAjustada,
                    'data_fim' => $dataFimAjustada,
                    'dias_letivos' => $etapa->dias_letivos,
                ];
            }

            $this->substituirEtapas($novoAno, $anoAnterior->tipo_etapa_id, $novasEtapas);
        }
    }

    /**
     * Ajusta o ano na data e corrige 29/02 para 28/02 em anos não bissextos.
     */
    private function ajustarDataAno(string $dataIso, int $deltaAnos): string
    {
        $carbon = Carbon::parse($dataIso);
        $novoAno = $carbon->year + $deltaAnos;

        // Se era 29 de fevereiro e o ano destino não for bissexto -> vira 28 de fevereiro
        if ($carbon->month === 2 && $carbon->day === 29 && !Carbon::create($novoAno, 1, 1)->isLeapYear()) {
            return Carbon::create($novoAno, 2, 28)->format('Y-m-d');
        }

        return $carbon->setYear($novoAno)->format('Y-m-d');
    }

    public function create(array $data): EducaAcademicYear
    {
        return $this->criar($data);
    }

    public function transition(EducaAcademicYear $year, string $evento, ?string $justificativa = null): EducaAcademicYear
    {
        return $this->transicionar($year, $evento, $justificativa);
    }

    public function replaceStages(EducaAcademicYear $year, string $tipoEtapaId, array $etapasInput): \Illuminate\Database\Eloquent\Collection
    {
        $this->substituirEtapas($year, $tipoEtapaId, $etapasInput);
        return $year->fresh()->etapas;
    }

    public function copyFromPreviousYear(EducaAcademicYear $anoOrigem, int $novoAno, ?string $schoolId = null): EducaAcademicYear
    {
        $tenantId = $anoOrigem->tenant_id;
        $targetSchoolId = $schoolId ?? $anoOrigem->school_id;

        $year = $this->criar([
            'tenant_id' => $tenantId,
            'school_id' => $targetSchoolId,
            'ano' => $novoAno,
            'copiar_turmas' => false,
        ]);

        $diferencaAnos = $novoAno - $anoOrigem->ano;
        $etapasOriginais = $anoOrigem->etapas()->get();
        if ($etapasOriginais->isNotEmpty() && $anoOrigem->tipo_etapa_id) {
            $novasEtapas = [];
            foreach ($etapasOriginais as $etapa) {
                $novasEtapas[] = [
                    'sequencial' => $etapa->sequencial,
                    'nome' => $etapa->nome,
                    'data_inicio' => $this->ajustarDataAno($etapa->data_inicio->format('Y-m-d'), $diferencaAnos),
                    'data_fim' => $this->ajustarDataAno($etapa->data_fim->format('Y-m-d'), $diferencaAnos),
                    'dias_letivos' => $etapa->dias_letivos,
                ];
            }

            $this->substituirEtapas($year, $anoOrigem->tipo_etapa_id, $novasEtapas);
        }

        return $year->fresh();
    }
}
