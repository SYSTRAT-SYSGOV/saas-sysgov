<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class SucessaoServiceTest extends CemiteriosTestCase
{
    private Tenant $tenant;
    private SucessaoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->actingAs($this->admin($this->tenant));
        $this->service = app(SucessaoService::class);
    }

    /** @return array<int, array{0: string}> */
    public static function vias(): array
    {
        return [
            ['inventario_judicial'],
            ['inventario_extrajudicial'],
            ['alvara_judicial'],
            ['arrolamento'],
        ];
    }

    #[DataProvider('vias')]
    public function test_abrirProcesso_cria_sucessao_solicitada_para_cada_via(string $via): void
    {
        $concessao = $this->novaConcessao();

        $sucessao = $this->service->abrirProcesso([
            'concession_id' => $concessao->id,
            'via' => $via,
            'processo_referencia' => 'PROC-' . strtoupper($via),
        ]);

        self::assertSame($via, $sucessao->via->value);
        self::assertSame('solicitada', $sucessao->estado->value);
        self::assertSame(1, $sucessao->lock_version);

        $concessao->refresh();
        self::assertTrue($concessao->pendencia_regularizacao);
        self::assertSame('sucessao_hereditaria', $concessao->motivo_pendencia);
    }

    public function test_abrirProcesso_rejeita_segundo_processo_em_andamento_para_mesma_concessao(): void
    {
        $concessao = $this->novaConcessao();
        $this->service->abrirProcesso(['concession_id' => $concessao->id, 'via' => 'inventario_judicial']);

        $this->expectException(RegraNegocioException::class);
        $this->service->abrirProcesso(['concession_id' => $concessao->id, 'via' => 'alvara_judicial']);
    }

    public function test_atualizarDados_falha_fora_dos_estados_editaveis(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Sucedida);

        $this->expectException(RegraNegocioException::class);
        $this->service->atualizarDados($sucessao, ['processo_referencia' => 'NOVO']);
    }

    public function test_atualizarDados_permite_editar_processo_solicitado(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Solicitada);

        $atualizado = $this->service->atualizarDados($sucessao, ['processo_referencia' => 'PROC-EDITADO']);

        self::assertSame('PROC-EDITADO', $atualizado->processo_referencia);
    }

    public function test_indeferir_exige_estado_em_analise_ou_validada(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Solicitada);

        $this->expectException(RegraNegocioException::class);
        $this->service->indeferir($sucessao, 'Motivo do indeferimento');
    }

    public function test_indeferir_move_para_indeferida_e_libera_concessao(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::EmAnalise);

        $indeferida = $this->service->indeferir($sucessao, 'Documentação insuficiente');

        self::assertSame('indeferida', $indeferida->estado->value);
        self::assertFalse($indeferida->concessao->fresh()->pendencia_regularizacao);
    }

    public function test_arquivar_exige_estado_indeferida_ou_aguardando_documentos(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::EmAnalise);

        $this->expectException(RegraNegocioException::class);
        $this->service->arquivar($sucessao);
    }

    public function test_arquivar_move_para_arquivada(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Indeferida);

        $arquivada = $this->service->arquivar($sucessao);

        self::assertSame('arquivada', $arquivada->estado->value);
    }

    public function test_concluir_exige_estado_validada(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::EmAnalise);

        $this->expectException(RegraNegocioException::class);
        $this->service->concluir($sucessao);
    }

    public function test_concluir_exige_titular_indicado(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Validada);

        $this->expectException(RegraNegocioException::class);
        $this->service->concluir($sucessao);
    }

    public function test_concluir_transfere_titularidade_da_concessao(): void
    {
        $sucessao = $this->novoProcessoEm(EstadoSucessao::Validada);
        $antigoTitularId = $sucessao->concessao->holder_id;

        $this->service->adicionarHerdeiro($sucessao, [
            'nome' => 'Herdeiro Sucessor',
            'parentesco' => 'filho',
            'documento' => $this->cpfValido(),
            'titular_indicado' => true,
        ]);

        $concluida = $this->service->concluir($sucessao);

        self::assertSame('sucedida', $concluida->estado->value);
        $concessaoAtualizada = $concluida->concessao()->first();
        self::assertNotSame($antigoTitularId, $concessaoAtualizada->holder_id);
        self::assertFalse($concessaoAtualizada->pendencia_regularizacao);
        self::assertSame('Herdeiro Sucessor', $concessaoAtualizada->concessionario->nome);
    }

    private function novaConcessao(): Concessao
    {
        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Original',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'titular-' . uniqid()),
        ]);

        return Concessao::create([
            'numero' => 'CON-SS-' . uniqid(),
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);
    }

    private function novoProcessoEm(EstadoSucessao $estado): Sucessao
    {
        $concessao = $this->novaConcessao();
        $sucessao = $this->service->abrirProcesso([
            'concession_id' => $concessao->id,
            'via' => 'inventario_extrajudicial',
        ]);

        if ($estado !== EstadoSucessao::Solicitada) {
            // Move direto pelo modelo (bypass da máquina de estados) só para preparar o cenário de teste.
            $sucessao->update(['estado' => $estado->value]);
        }

        return $sucessao->fresh();
    }
}
