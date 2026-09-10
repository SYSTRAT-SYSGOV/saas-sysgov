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
use Modules\Licita\Enums\StatusDfd;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

final class DfdWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function criarProcesso(User $elaborador): Processo
    {
        return app(ProcessoService::class)->criar(['numero' => '01', 'ano' => 2026, 'objeto' => null], $elaborador);
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
            'previsao_pca' => true,
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
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

    public function test_fluxo_completo_de_aprovacao_avanca_processo_para_etp(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        self::assertSame(StatusDfd::Rascunho->value, $dfd->status);
        self::assertSame(1, $dfd->versoes()->count());

        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        self::assertSame(StatusDfd::EmRevisao->value, $dfd->status);

        $dfd = $dfdService->aprovar($dfd, $aprovador, 'De acordo.');
        self::assertSame(StatusDfd::Aprovado->value, $dfd->status);
        self::assertSame($aprovador->id, $dfd->aprovado_por);
        self::assertNotNull($dfd->aprovado_em);

        self::assertSame(FaseLicita::Etp->value, $processo->fresh()->fase_atual);
    }

    public function test_elaborador_nao_pode_aprovar_o_proprio_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $dfdService->aprovar($dfd, $elaborador);
    }

    public function test_nao_permite_aprovar_dfd_ainda_em_rascunho(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Transição inválida');
        $dfdService->aprovar($dfd, $aprovador);
    }

    public function test_dfd_aprovado_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->aprovar($dfd, $aprovador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $dfdService->atualizar($dfd, ['objeto' => 'Tentativa de alteração pós-aprovação'], $elaborador);
    }

    public function test_dfd_rejeitado_pode_ser_reaberto_editado_e_reenviado_ate_aprovar(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->rejeitar($dfd, $aprovador, 'Faltou detalhar o valor estimado.');
        self::assertSame(StatusDfd::Rejeitado, $dfd->statusEnum());

        // Sem reabrir, não há como voltar direto pra revisão (RN-002).
        try {
            $dfdService->enviarParaRevisao($dfd, $elaborador);
            self::fail('Deveria ter lançado DomainException ao tentar enviar direto de rejeitado para revisão.');
        } catch (DomainException $e) {
            self::assertStringContainsString('Transição inválida', $e->getMessage());
        }

        $dfd = $dfdService->reabrir($dfd, $elaborador);
        self::assertSame(StatusDfd::Rascunho, $dfd->statusEnum());

        $dfd = $dfdService->atualizar($dfd, ['objeto' => 'Objeto complementado após reabertura.'], $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfd = $dfdService->aprovar($dfd, $aprovador);

        self::assertSame(StatusDfd::Aprovado, $dfd->statusEnum());
        self::assertSame('reaberto', $dfd->versoes()->orderBy('versao')->skip(3)->first()->acao);
    }

    public function test_reabrir_so_permitido_quando_status_e_rejeitado(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Transição inválida');
        $dfdService->reabrir($dfd, $elaborador);
    }

    public function test_versionamento_incrementa_a_cada_transicao(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        self::assertSame(1, $dfd->versoes()->count());

        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        self::assertSame(2, $dfd->versoes()->count());

        $dfd = $dfdService->aprovar($dfd, $aprovador);
        self::assertSame(3, $dfd->versoes()->count());
        self::assertSame([1, 2, 3], $dfd->versoes()->pluck('versao')->all());
    }
}
