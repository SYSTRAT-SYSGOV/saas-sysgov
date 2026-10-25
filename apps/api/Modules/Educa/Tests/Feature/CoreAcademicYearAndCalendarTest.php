<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicCalendar;
use Modules\Educa\Models\EducaAcademicStage;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaCalendarDay;
use Modules\Educa\Models\EducaCalendarDayReason;
use Modules\Educa\Models\EducaStageType;
use Modules\Educa\Services\AcademicYearService;
use Modules\Educa\Services\AcademicYearStateMachine;
use Modules\Educa\Services\CalendarService;
use Modules\Educa\Services\LdbComplianceService;
use Tests\TestCase;

final class CoreAcademicYearAndCalendarTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private string $schoolId;
    private AcademicYearService $yearService;
    private CalendarService $calendarService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Prefeitura Exemplo',
            'slug' => 'prefeitura-exemplo',
            'type' => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->schoolId = (string) Str::uuid();
        $this->yearService = app(AcademicYearService::class);
        $this->calendarService = app(CalendarService::class);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_criar_ano_letivo_nasce_em_planning_e_mutavel(): void
    {
        $year = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
        ]);

        self::assertSame(AcademicYearStateMachine::STATUS_PLANNING, $year->status);
        self::assertFalse($year->is_immutable);
        self::assertSame($this->tenant->id, $year->tenant_id);
    }

    public function test_unicidade_de_ano_letivo_por_escola_e_ano(): void
    {
        $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
        ]);

        $this->expectException(LogicException::class);

        $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
        ]);
    }

    public function test_validacao_de_quantidade_de_etapas_pelo_tipo_de_etapa(): void
    {
        $tipoBimestre = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Bimestral',
            'num_etapas' => 4,
        ]);

        $year = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
        ]);

        // Informando apenas 3 etapas para tipo de 4 etapas -> deve recusar
        $this->expectException(InvalidArgumentException::class);

        $this->yearService->substituirEtapas($year, $tipoBimestre->id, [
            ['sequencial' => 1, 'data_inicio' => '2026-02-02', 'data_fim' => '2026-04-15'],
            ['sequencial' => 2, 'data_inicio' => '2026-04-16', 'data_fim' => '2026-06-30'],
            ['sequencial' => 3, 'data_inicio' => '2026-08-01', 'data_fim' => '2026-09-30'],
        ]);
    }

    public function test_copia_do_ano_anterior_ajusta_datas_e_trata_ano_bissexto(): void
    {
        $tipoBimestre = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Bimestral',
            'num_etapas' => 2,
        ]);

        // Ano anterior: 2024 (ano bissexto) com etapa terminando em 29/02/2024
        $year2024 = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2024,
            'tipo_etapa_id' => $tipoBimestre->id,
            'etapas' => [
                ['sequencial' => 1, 'data_inicio' => '2024-02-01', 'data_fim' => '2024-02-29'],
                ['sequencial' => 2, 'data_inicio' => '2024-03-01', 'data_fim' => '2024-06-30'],
            ],
        ]);

        // Novo ano: 2025 (não bissexto), com cópia ativada
        $year2025 = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2025,
            'copiar_turmas' => true,
        ]);

        $etapas2025 = $year2025->etapas()->get();
        self::assertCount(2, $etapas2025);

        // A data de 29/02/2024 deve ter sido corrigida para 28/02/2025
        self::assertSame('2025-02-28', $etapas2025->first()->data_fim->format('Y-m-d'));
        self::assertSame('2025-02-01', $etapas2025->first()->data_inicio->format('Y-m-d'));
    }

    public function test_etapa_nao_pode_invadir_periodo_de_outro_ano_letivo_da_mesma_escola(): void
    {
        $tipo = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Semestral',
            'num_etapas' => 1,
        ]);

        // 2024: 01/01/2024 a 30/06/2024
        $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2024,
            'tipo_etapa_id' => $tipo->id,
            'etapas' => [
                ['sequencial' => 1, 'data_inicio' => '2024-01-01', 'data_fim' => '2024-06-30'],
            ],
        ]);

        // 2025 com etapa colidindo com 2024
        $year2025 = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2025,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->yearService->substituirEtapas($year2025, $tipo->id, [
            ['sequencial' => 1, 'data_inicio' => '2024-05-01', 'data_fim' => '2025-05-01'],
        ]);
    }

    public function test_criacao_de_calendario_de_escola_exige_ano_com_etapas(): void
    {
        // Criação de calendário para escola sem ano/etapas cadastradas -> recusa
        $this->expectException(InvalidArgumentException::class);

        $this->calendarService->criarCalendario([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'nome' => 'Calendário 2026 EMEF Paulo Freire',
        ]);
    }

    public function test_dias_uteis_sao_letivos_por_padrao_e_feriado_remove_dia_letivo(): void
    {
        $tipo = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Anual',
            'num_etapas' => 1,
        ]);

        $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'tipo_etapa_id' => $tipo->id,
            'etapas' => [
                ['sequencial' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-12-15'],
            ],
        ]);

        $calendar = $this->calendarService->criarCalendario([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'nome' => 'Calendário 2026',
            'carga_horaria_diaria_minutos' => 240, // 4h
        ]);

        $feriadoReason = EducaCalendarDayReason::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'FERIADO_NACIONAL',
            'nome' => 'Independência do Brasil',
            'tipo' => 'holiday',
            'is_school_day' => false,
            'color_hex' => '#DC2626',
        ]);

        // Segunda-feira 07/09/2026 (feriado) e Terça-feira 08/09/2026 (dia útil normal)
        $this->calendarService->salvarDias($calendar, [
            ['data' => '2026-09-07', 'motivo_id' => $feriadoReason->id, 'descricao' => '7 de Setembro'],
            ['data' => '2026-09-08', 'descricao' => 'Dia letivo normal'],
        ]);

        $diaFeriado = EducaCalendarDay::where('calendario_id', $calendar->id)->where('data', '2026-09-07')->firstOrFail();
        $diaNormal = EducaCalendarDay::where('calendario_id', $calendar->id)->where('data', '2026-09-08')->firstOrFail();

        self::assertFalse($diaFeriado->is_school_day);
        self::assertTrue($diaNormal->is_school_day);

        $calendar->refresh();
        self::assertSame(1, $calendar->total_school_days);
        self::assertEquals(4.00, $calendar->total_school_hours);
    }

    public function test_publicacao_do_calendario_bloqueia_se_nao_atender_200_dias_da_ldb(): void
    {
        $tipo = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Anual',
            'num_etapas' => 1,
        ]);

        $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'tipo_etapa_id' => $tipo->id,
            'etapas' => [
                ['sequencial' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-12-15'],
            ],
        ]);

        $calendar = $this->calendarService->criarCalendario([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'nome' => 'Calendário Incompleto',
        ]);

        // Calendário com 0 dias letivos não cumpre os 200 dias da LDB
        $this->expectException(LogicException::class);
        $this->calendarService->publicar($calendar);
    }

    public function test_transicao_de_ciclo_de_vida_e_imutabilidade_ao_fechar(): void
    {
        $tipo = EducaStageType::create([
            'tenant_id' => $this->tenant->id,
            'nome' => 'Anual',
            'num_etapas' => 1,
        ]);

        $year = $this->yearService->criar([
            'tenant_id' => $this->tenant->id,
            'school_id' => $this->schoolId,
            'ano' => 2026,
            'tipo_etapa_id' => $tipo->id,
            'etapas' => [
                ['sequencial' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-12-15'],
            ],
        ]);

        // Transição: start (planning -> active)
        $year = $this->yearService->transicionar($year, AcademicYearStateMachine::EVENT_START);
        self::assertTrue($year->isActive());

        // Transição: freeze (active -> frozen)
        $year = $this->yearService->transicionar($year, AcademicYearStateMachine::EVENT_FREEZE, 'Recesso Escolar');
        self::assertTrue($year->isFrozen());

        // Transição: resume (frozen -> active)
        $year = $this->yearService->transicionar($year, AcademicYearStateMachine::EVENT_RESUME);
        self::assertTrue($year->isActive());

        // Transição: begin_evaluation (active -> evaluation_phase)
        $year = $this->yearService->transicionar($year, AcademicYearStateMachine::EVENT_BEGIN_EVALUATION);
        self::assertTrue($year->isEvaluationPhase());

        // Transição: close (evaluation_phase -> closed)
        $year = $this->yearService->transicionar($year, AcademicYearStateMachine::EVENT_CLOSE);
        self::assertTrue($year->isClosed());
        self::assertTrue($year->is_immutable);

        // Tentativa de alterar etapas em ano fechado deve disparar LogicException
        $this->expectException(LogicException::class);
        $this->yearService->substituirEtapas($year, $tipo->id, [
            ['sequencial' => 1, 'data_inicio' => '2026-02-01', 'data_fim' => '2026-12-15'],
        ]);
    }
}
