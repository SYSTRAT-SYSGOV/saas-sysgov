<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Services\OperadorCemiterioService;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cadastro-operadores — regras de credenciamento, sanção e disponibilidade. */
final class OperadorCemiterioServiceTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    private OperadorCemiterioService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->service = app(OperadorCemiterioService::class);
    }

    public function test_credenciar_preserva_historico_e_calcula_o_vigente(): void
    {
        $pedreiro = OperadorCemiterio::create(['nome' => 'Pedreiro', 'tipo' => 'pedreiro']);

        $this->service->credenciar($pedreiro, ['numero' => 'ALV-001', 'validade' => today()->addMonths(6)->toDateString()]);
        $this->service->credenciar($pedreiro, ['numero' => 'ALV-002', 'validade' => today()->addYear()->toDateString()]);

        self::assertSame(2, $pedreiro->licencas()->count());
        $vigente = $this->service->credenciamentoVigente($pedreiro);
        self::assertSame('ALV-002', $vigente->numero);
        self::assertSame('ALV-002', $pedreiro->fresh()->alvara_numero);
        self::assertSame('valido', $this->service->statusCredenciamento($pedreiro->fresh()));
    }

    public function test_status_credenciamento_reflete_vencimento(): void
    {
        $pedreiro = OperadorCemiterio::create(['nome' => 'Pedreiro', 'tipo' => 'pedreiro']);
        self::assertSame('sem_credenciamento', $this->service->statusCredenciamento($pedreiro));

        $this->service->credenciar($pedreiro, ['numero' => 'ALV-VENCIDO', 'validade' => today()->subMonth()->toDateString()]);
        self::assertSame('vencido', $this->service->statusCredenciamento($pedreiro->fresh()));

        $coveiro = OperadorCemiterio::create(['nome' => 'Coveiro', 'tipo' => 'coveiro']);
        self::assertSame('dispensado', $this->service->statusCredenciamento($coveiro));
    }

    public function test_sancionar_advertencia_suspensao_e_descredenciamento(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'Operador', 'tipo' => 'coveiro', 'situacao' => 'ativo']);

        $this->service->sancionar($operador, ['tipo' => 'advertencia', 'inicio' => today()->toDateString(), 'motivo' => 'Atraso.']);
        self::assertSame('ativo', $operador->fresh()->situacao);

        $this->service->sancionar($operador, [
            'tipo' => 'suspensao', 'inicio' => today()->toDateString(), 'fim' => today()->addDays(5)->toDateString(), 'motivo' => 'Falta grave.',
        ]);
        self::assertSame('ativo', $operador->fresh()->situacao);

        $this->service->sancionar($operador, ['tipo' => 'descredenciamento', 'inicio' => today()->toDateString(), 'motivo' => 'Reincidência.']);
        self::assertSame('inativo', $operador->fresh()->situacao);
        self::assertSame(3, $operador->penalidades()->count());
    }

    public function test_validar_disponibilidade_bloqueia_descredenciado_sem_override_possivel(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'Descredenciado', 'tipo' => 'coveiro']);
        $this->service->sancionar($operador, ['tipo' => 'descredenciamento', 'inicio' => today()->toDateString(), 'motivo' => 'Grave.']);

        $this->expectException(RegraNegocioException::class);
        $this->service->validarDisponibilidade($operador->fresh(), overrideSuspensao: true, justificativaOverride: 'Emergência');
    }

    public function test_validar_disponibilidade_bloqueia_suspenso_e_exige_justificativa_no_override(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'Suspenso', 'tipo' => 'coveiro']);
        $this->service->sancionar($operador, [
            'tipo' => 'suspensao', 'inicio' => today()->toDateString(), 'fim' => today()->addDays(5)->toDateString(), 'motivo' => 'Falta grave.',
        ]);
        $operador = $operador->fresh();

        try {
            $this->service->validarDisponibilidade($operador);
            self::fail('Deveria bloquear operador suspenso sem override.');
        } catch (RegraNegocioException $e) {
            self::assertSame('operador.suspenso', $e->codigo);
        }

        try {
            $this->service->validarDisponibilidade($operador, overrideSuspensao: true);
            self::fail('Override sem justificativa deveria ser rejeitado.');
        } catch (RegraNegocioException $e) {
            self::assertSame('operador.override_sem_justificativa', $e->codigo);
        }

        $antes = AuditLog::where('module', 'cemiterios')->count();
        $this->service->validarDisponibilidade($operador, overrideSuspensao: true, justificativaOverride: 'Único disponível na necrópole.');
        self::assertSame($antes + 1, AuditLog::where('module', 'cemiterios')->count());
        self::assertSame('operador.suspensao.override', AuditLog::orderByDesc('id')->first()->action);
    }

    public function test_validar_disponibilidade_permite_operador_sem_sancao(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'Regular', 'tipo' => 'coveiro']);
        $this->expectNotToPerformAssertions();
        $this->service->validarDisponibilidade($operador);
    }

    public function test_status_saude_ocupacional(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'Operador', 'tipo' => 'coveiro']);
        self::assertSame('nao_informado', $this->service->statusSaudeOcupacional($operador));

        $operador->update(['aso_validade' => today()->subDay()->toDateString()]);
        self::assertSame('vencido', $this->service->statusSaudeOcupacional($operador->fresh()));

        $operador->update(['aso_validade' => today()->addDays(10)->toDateString()]);
        self::assertSame('a_vencer', $this->service->statusSaudeOcupacional($operador->fresh()));

        $operador->update(['aso_validade' => today()->addYear()->toDateString()]);
        self::assertSame('valido', $this->service->statusSaudeOcupacional($operador->fresh()));
    }
}
