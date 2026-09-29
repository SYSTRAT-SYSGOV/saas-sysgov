<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use PHPUnit\Framework\Attributes\DataProvider;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoHistorico;
use Modules\Cemiterios\Services\SucessaoStateMachine;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class SucessaoStateMachineTest extends CemiteriosTestCase
{
    private Tenant $tenant;
    private SucessaoStateMachine $maquina;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->maquina = new SucessaoStateMachine();
    }

    /** @return array<int, array{0: string, 1: string}> */
    public static function transicoesValidas(): array
    {
        return [
            ['solicitada', 'em_analise'],
            ['em_analise', 'aguardando_documentos'],
            ['em_analise', 'validada'],
            ['em_analise', 'indeferida'],
            ['aguardando_documentos', 'em_analise'],
            ['aguardando_documentos', 'arquivada'],
            ['validada', 'sucedida'],
            ['validada', 'indeferida'],
            ['indeferida', 'arquivada'],
        ];
    }

    #[DataProvider('transicoesValidas')]
    public function test_canTransition_aceita_transicoes_validas(string $de, string $para): void
    {
        self::assertTrue($this->maquina->canTransition($de, $para));
    }

    /** @return array<int, array{0: string, 1: string}> */
    public static function transicoesInvalidas(): array
    {
        return [
            ['solicitada', 'sucedida'],
            ['solicitada', 'indeferida'],
            ['sucedida', 'em_analise'],
            ['arquivada', 'em_analise'],
            ['em_analise', 'solicitada'],
            ['validada', 'em_analise'],
        ];
    }

    #[DataProvider('transicoesInvalidas')]
    public function test_canTransition_rejeita_transicoes_invalidas(string $de, string $para): void
    {
        self::assertFalse($this->maquina->canTransition($de, $para));
    }

    public function test_estados_terminais(): void
    {
        self::assertTrue($this->maquina->isTerminal(EstadoSucessao::Sucedida));
        self::assertTrue($this->maquina->isTerminal(EstadoSucessao::Arquivada));
        self::assertFalse($this->maquina->isTerminal(EstadoSucessao::Solicitada));
        self::assertFalse($this->maquina->isTerminal(EstadoSucessao::EmAnalise));
    }

    public function test_transition_move_estado_e_registra_historico(): void
    {
        $admin = $this->admin($this->tenant);
        $this->actingAs($admin);
        $sucessao = $this->novaSucessao();

        $atualizada = $this->maquina->transition($sucessao, EstadoSucessao::EmAnalise, 'Documentação inicial conferida.');

        self::assertSame('em_analise', $atualizada->estado->value);
        self::assertSame(2, $atualizada->lock_version);

        $historico = SucessaoHistorico::where('sucessao_id', $sucessao->id)->latest('id')->first();
        self::assertNotNull($historico);
        self::assertSame('solicitada', $historico->de_estado);
        self::assertSame('em_analise', $historico->para_estado);
        self::assertSame('Documentação inicial conferida.', $historico->motivo['parecer']);
        self::assertSame($admin->id, $historico->usuario_id);
    }

    public function test_transition_rejeita_transicao_nao_mapeada(): void
    {
        $sucessao = $this->novaSucessao();

        $this->expectException(RegraNegocioException::class);
        $this->maquina->transition($sucessao, EstadoSucessao::Sucedida, 'Tentativa inválida');
    }

    public function test_transition_com_lock_version_desatualizado_lanca_conflito(): void
    {
        $sucessao = $this->novaSucessao();

        $this->expectException(ConflitoVersaoException::class);
        $this->maquina->transition($sucessao, EstadoSucessao::EmAnalise, 'motivo', lockVersion: 999);
    }

    public function test_transition_concorrente_apenas_uma_vence(): void
    {
        $sucessao = $this->novaSucessao();
        $versaoOriginal = $sucessao->lock_version;

        $primeira = $this->maquina->transition($sucessao->fresh(), EstadoSucessao::EmAnalise, 'primeira', $versaoOriginal);
        self::assertSame('em_analise', $primeira->estado->value);

        $this->expectException(ConflitoVersaoException::class);
        $this->maquina->transition($sucessao, EstadoSucessao::EmAnalise, 'segunda (obsoleta)', $versaoOriginal);
    }

    private function novaSucessao(): Sucessao
    {
        $jazigo = $this->novoJazigo(concedido: false);
        $titular = Concessionario::create([
            'nome' => 'Titular Teste',
            'tipo_doc' => 'cpf',
            'documento' => $this->cpfValido(),
            'documento_hash' => hash('sha256', 'titular-' . uniqid()),
        ]);
        $concessao = Concessao::create([
            'numero' => 'CON-SM-' . uniqid(),
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
        ]);

        return Sucessao::create([
            'concession_id' => $concessao->id,
            'park_id' => $jazigo->park_id,
            'plot_id' => $jazigo->id,
            'via' => 'inventario_extrajudicial',
            'estado' => EstadoSucessao::Solicitada,
            'lock_version' => 1,
        ]);
    }
}
