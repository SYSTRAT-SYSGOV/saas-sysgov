<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Enums\StatusMapaRisco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Support\ClassificacaoRisco;
use Modules\Licita\Tests\TestCase;

final class MapaRiscoWorkflowTest extends TestCase
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
     * @return array<int, array<string, mixed>>
     */
    private function dadosRiscos(): array
    {
        return [
            [
                'descricao' => 'Apresentação de documentação irregular pelo fornecedor.',
                'fase' => 'selecao_fornecedor',
                'probabilidade' => 2,
                'impacto' => 4,
                'causa' => 'Falha do licitante na manutenção das condições de habilitação.',
                'dano' => 'Impossibilidade de contratação ou atraso na conclusão do certame.',
                'alocacao' => 'contratada',
                'acao_preventiva' => 'Estabelecer requisitos de habilitação compatíveis e realizar conferência documental.',
                'responsavel_prevencao' => 'CONTRATANTE',
                'acao_contingencia' => 'Convocar o próximo fornecedor habilitado, quando juridicamente cabível.',
                'responsavel_contingencia' => 'CONTRATANTE',
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
     * DFD aprovado + ETP criado (pré-requisito do Mapa de Riscos) — devolve
     * o processo pronto para iniciar o Mapa de Riscos.
     */
    private function processoComEtp(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_mapa_de_riscos_sem_etp(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre o ETP');
        app(MapaRiscoService::class)->criar($processo, ['riscos' => $this->dadosRiscos()], $elaborador);
    }

    public function test_mapa_de_riscos_nasce_com_a_equipe_copiada_do_etp(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComEtp($elaborador, $aprovador);

        $mapaRisco = app(MapaRiscoService::class)->criar($processo, ['riscos' => $this->dadosRiscos()], $elaborador);

        self::assertSame($processo->etp->equipe_planejamento, $mapaRisco->equipe_planejamento);
    }

    public function test_mapa_de_riscos_continua_editavel_a_qualquer_momento(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComEtp($elaborador, $aprovador);

        $service = app(MapaRiscoService::class);
        $mapaRisco = $service->criar($processo, ['riscos' => $this->dadosRiscos()], $elaborador);
        self::assertSame(StatusMapaRisco::Rascunho->value, $mapaRisco->status);

        $novosRiscos = $this->dadosRiscos();
        $novosRiscos[0]['descricao'] = 'Descrição revisada depois de descoberta no TR.';
        $mapaRisco = $service->atualizar($mapaRisco, ['riscos' => $novosRiscos], $elaborador);

        self::assertSame('Descrição revisada depois de descoberta no TR.', $mapaRisco->riscos[0]['descricao']);
        self::assertSame(StatusMapaRisco::Rascunho->value, $mapaRisco->status);
    }

    public function test_nao_permite_criar_segundo_mapa_de_riscos_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComEtp($elaborador, $aprovador);

        $service = app(MapaRiscoService::class);
        $service->criar($processo, ['riscos' => $this->dadosRiscos()], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui um Mapa de Riscos');
        $service->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $elaborador);
    }

    #[DataProvider('provedorClassificacao')]
    public function test_classificacao_de_risco_segue_a_matriz_de_referencia(int $probabilidade, int $impacto, int $nivelEsperado, string $classificacaoEsperada): void
    {
        self::assertSame($nivelEsperado, ClassificacaoRisco::nivel($probabilidade, $impacto));
        self::assertSame($classificacaoEsperada, ClassificacaoRisco::classificacao($probabilidade, $impacto));
    }

    /**
     * @return array<string, array{0: int, 1: int, 2: int, 3: string}>
     */
    public static function provedorClassificacao(): array
    {
        // Casos extraídos do mapa de risco de referência (Araucária, 020/2026).
        return [
            'R8 baixo/baixo -> aceitável' => [2, 2, 4, 'aceitavel'],
            'R7 baixo/alto -> moderado' => [2, 4, 8, 'moderado'],
            'R1 média/muito alto -> intolerável' => [3, 5, 15, 'intoleravel'],
            'R9 alta/muito alto -> intolerável' => [4, 5, 20, 'intoleravel'],
            'extremo 5x5 -> intolerável' => [5, 5, 25, 'intoleravel'],
            'mínimo 1x1 -> aceitável' => [1, 1, 1, 'aceitavel'],
        ];
    }
}
