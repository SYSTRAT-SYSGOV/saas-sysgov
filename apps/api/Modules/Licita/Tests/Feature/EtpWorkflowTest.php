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

    public function test_nao_permite_criar_etp_sem_dfd(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre o DFD');
        app(EtpService::class)->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);
    }

    public function test_criar_etp_nao_exige_dfd_aprovado_apenas_que_exista(): void
    {
        // Ao aprovar o DFD o processo já avança pra "em_elaboracao", então
        // este cenário (DFD em rascunho/revisão) só é alcançável chamando o
        // service direto, sem passar pelo fluxo normal — mas a regra em si
        // (RN-002 relaxada) deve permitir.
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);
        $dfd = app(DfdService::class)->criar($processo, $this->dadosDfd(), $elaborador);

        $etp = app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);

        self::assertSame($dfd->equipe_planejamento, $etp->equipe_planejamento);
    }

    public function test_etp_nasce_com_a_equipe_copiada_do_dfd(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etp = app(EtpService::class)->criar($processo, ['conteudo' => 'Estudo técnico preliminar.'], $elaborador);

        self::assertSame($processo->dfd->equipe_planejamento, $etp->equipe_planejamento);
        self::assertSame(FaseLicita::EmElaboracao->value, $processo->fresh()->fase_atual);
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

    public function test_etp_continua_editavel_a_qualquer_momento_enquanto_nao_aprovado_em_lote(): void
    {
        // Não existe mais "enviar para revisão"/aprovação individual — o
        // ETP fica em rascunho, sempre editável, até a aprovação final do
        // Ordenador (ver AprovacaoFinalWorkflowTest). Simula a equipe de
        // planejamento voltando a mexer no ETP várias vezes.
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComDfdAprovado($elaborador, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo, ['conteudo' => 'Versão inicial.'], $elaborador);
        self::assertSame(StatusEtp::Rascunho->value, $etp->status);

        $etp = $etpService->atualizar($etp, ['conteudo' => 'Segunda versão, corrigida.'], $elaborador);
        self::assertSame('Segunda versão, corrigida.', $etp->conteudo);
        self::assertSame(StatusEtp::Rascunho->value, $etp->status);

        $etp = $etpService->atualizar($etp, ['conteudo' => 'Terceira versão, revisada de novo.'], $elaborador);
        self::assertSame('Terceira versão, revisada de novo.', $etp->conteudo);
        self::assertCount(3, $etp->versoes);
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
