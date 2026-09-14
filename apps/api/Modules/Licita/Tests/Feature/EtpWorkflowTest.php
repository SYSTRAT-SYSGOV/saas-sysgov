<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Enums\StatusEtp;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

final class EtpWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function criarProcesso(User $elaborador): Processo
    {
        return app(ProcessoService::class)->criar(['objeto' => null], $elaborador);
    }

    /**
     * @return array<string, mixed>
     */
    private function dadosDfd(): array
    {
        return [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de contratação de serviço continuado de limpeza.',
            'objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.',
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ],
        ];
    }

    /**
     * @return array{0: Tenant, 1: User, 2: User}
     */
    private function setUpTenantEUsuarios(): array
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $elaborador = User::create(['name' => 'Elaborador', 'email' => 'elaborador@teste.gov.br', 'password' => bcrypt('secret')]);
        $aprovador = User::create(['name' => 'Aprovador', 'email' => 'aprovador@teste.gov.br', 'password' => bcrypt('secret')]);

        return [$tenant, $elaborador, $aprovador];
    }

    /**
     * DFD aprovado (pré-requisito de todo teste do ETP) — devolve o
     * processo já com DFD aprovado, pronto para iniciar o ETP.
     */
    private function processoComDfdAprovado(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);
        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_etp_sem_dfd_aprovado(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('DFD deste processo precisa estar aprovado');
        app(EtpService::class)->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
    }

    public function test_etp_nasce_com_a_equipe_copiada_do_dfd(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etp = app(EtpService::class)->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);

        self::assertSame($processo->dfd->equipe_planejamento, $etp->equipe_planejamento);
    }

    public function test_equipe_do_etp_pode_ser_editada_independente_do_dfd(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);

        $novaEquipe = [
            ['nome' => 'Beltrano', 'cargo' => 'Analista', 'matricula' => '999'],
            ['nome' => 'Ciclana', 'cargo' => 'Engenheira', 'matricula' => '998'],
        ];
        $etp = $etpService->atualizar($etp, ['equipe_planejamento' => $novaEquipe], $elaborador);

        self::assertSame($novaEquipe, $etp->equipe_planejamento);
        // O DFD original não foi tocado.
        self::assertNotSame($novaEquipe, $processo->dfd->fresh()->equipe_planejamento);
    }

    public function test_fluxo_completo_de_aprovacao_avanca_processo_para_mapa_riscos(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
        self::assertSame(StatusEtp::Rascunho->value, $etp->status);

        $etp = $etpService->enviarParaRevisao($etp, $elaborador);
        self::assertSame(StatusEtp::EmRevisao->value, $etp->status);

        $etp = $etpService->aprovar($etp, $aprovador, 'De acordo.');
        self::assertSame(StatusEtp::Aprovado->value, $etp->status);
        self::assertSame($aprovador->id, $etp->aprovado_por);

        self::assertSame(FaseLicita::MapaRiscos->value, $processo->fresh()->fase_atual);
    }

    public function test_elaborador_nao_pode_aprovar_o_proprio_etp(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
        $etp = $etpService->enviarParaRevisao($etp, $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $etpService->aprovar($etp, $elaborador);
    }

    public function test_rejeitar_exige_motivo_e_devolve_para_rascunho(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
        $etp = $etpService->enviarParaRevisao($etp, $elaborador);
        $etp = $etpService->rejeitar($etp, $aprovador, 'Faltou detalhar o levantamento de mercado.');

        self::assertSame(StatusEtp::Rejeitado, $etp->statusEnum());
        self::assertSame('rejeitado', $etp->versoes()->reorder('versao', 'desc')->first()->acao);
        self::assertSame(
            ['motivo' => 'Faltou detalhar o levantamento de mercado.'],
            $etp->versoes()->reorder('versao', 'desc')->first()->campos_alterados,
        );

        $etp = $etpService->reabrir($etp, $elaborador);
        self::assertSame(StatusEtp::Rascunho, $etp->statusEnum());
    }

    public function test_etp_aprovado_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
        $etp = $etpService->enviarParaRevisao($etp, $elaborador);
        $etp = $etpService->aprovar($etp, $aprovador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $etpService->atualizar($etp, ['conteudo' => 'Tentativa de alteração pós-aprovação'], $elaborador);
    }

    public function test_nao_permite_criar_segundo_etp_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etpService->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui um ETP');
        $etpService->criar($processo->fresh(), ['conteudo' => 'Segundo estudo.'], $elaborador);
    }
}
