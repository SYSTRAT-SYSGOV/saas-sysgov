<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Validation\ValidationException;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Services\OperadorCemiterioService;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/** Fase 5, etapa B dos Cemitérios: operador e herdeiro não guardam o documento; ele vive na pessoa. */
final class PessoaDoDocumentoTest extends CemiteriosTestCase
{
    private const CPF = '52998224725';

    private const CNPJ = '11222333000181';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->actingAs($this->admin($this->tenant));
    }

    private function operadores(): OperadorCemiterioService
    {
        return app(OperadorCemiterioService::class);
    }

    private function pessoaPorDocumento(string $digitos): ?Pessoa
    {
        return Pessoa::query()->where('documento_hash', Documento::hash($digitos))->first();
    }

    public function test_operador_com_cpf_acha_a_pessoa_existente_sem_criar_outra(): void
    {
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF, 'nome' => 'Já Cadastrado']);

        $operador = $this->operadores()->cadastrar(['nome' => 'Digitado Diferente', 'tipo' => 'coveiro', 'cpf_cnpj' => '529.982.247-25']);

        self::assertSame($pessoa->id, $operador->pessoa_id);
        self::assertSame(1, Pessoa::query()->count());
        self::assertSame('Já Cadastrado', $pessoa->fresh()->nome, 'o cadastro central não é sobrescrito pelo que foi digitado');
    }

    public function test_operador_com_cnpj_cria_pessoa_juridica(): void
    {
        $operador = $this->operadores()->cadastrar(['nome' => 'Pedreira Ltda', 'tipo' => 'pedreiro', 'cpf_cnpj' => '11.222.333/0001-81']);

        $pessoa = $this->pessoaPorDocumento(self::CNPJ);
        self::assertNotNull($pessoa);
        self::assertSame('juridica', $pessoa->tipo);
        self::assertSame($pessoa->id, $operador->pessoa_id);
    }

    public function test_operador_sem_documento_vira_pessoa_pendente(): void
    {
        $operador = $this->operadores()->cadastrar(['nome' => 'Sem Documento', 'tipo' => 'coveiro']);

        self::assertTrue($operador->pessoa->documento_pendente);
        self::assertSame('—', $operador->documento_mascarado);
    }

    public function test_operador_com_documento_invalido_e_recusado_e_nada_e_gravado(): void
    {
        try {
            $this->operadores()->cadastrar(['nome' => 'Doc Ruim', 'tipo' => 'coveiro', 'cpf_cnpj' => '111.222.333-44']);
            self::fail('deveria recusar o documento inválido');
        } catch (ValidationException $e) {
            self::assertArrayHasKey('cpf_cnpj', $e->errors());
        }

        self::assertSame(0, OperadorCemiterio::query()->count());
        self::assertSame(0, Pessoa::query()->count());
    }

    public function test_edicao_do_operador_ignora_pessoa_nula_e_documento_mascarado_da_tela(): void
    {
        $operador = $this->operadores()->cadastrar(['nome' => 'Operador', 'tipo' => 'coveiro', 'cpf_cnpj' => self::CPF]);
        $pessoaId = $operador->pessoa_id;

        // A tela devolve `pessoa_id: null` quando o seletor não foi tocado e o documento mascarado que ela mesma mostrou.
        $atualizado = $this->operadores()->atualizar($operador, ['pessoa_id' => null, 'cpf_cnpj' => '***.982.247-**', 'telefone' => '41999990000']);

        self::assertSame($pessoaId, $atualizado->fresh()->pessoa_id);
        self::assertSame('41999990000', $atualizado->fresh()->telefone);
    }

    public function test_edicao_do_operador_regulariza_a_pessoa_pendente_ao_informar_o_cpf(): void
    {
        $operador = $this->operadores()->cadastrar(['nome' => 'Operador', 'tipo' => 'coveiro']);
        $pendente = $operador->pessoa_id;

        $atualizado = $this->operadores()->atualizar($operador, ['cpf_cnpj' => self::CPF]);

        self::assertSame($pendente, $atualizado->fresh()->pessoa_id, 'a mesma pessoa ganha o documento, sem criar outra');
        self::assertFalse($atualizado->fresh()->pessoa->documento_pendente);
        self::assertSame(1, Pessoa::query()->count());
    }

    public function test_edicao_do_operador_com_outro_cpf_liga_a_outra_pessoa(): void
    {
        $operador = $this->operadores()->cadastrar(['nome' => 'Operador', 'tipo' => 'coveiro', 'cpf_cnpj' => self::CPF]);
        $primeira = $operador->pessoa_id;

        $atualizado = $this->operadores()->atualizar($operador, ['cpf_cnpj' => '111.444.777-35']);

        self::assertNotSame($primeira, $atualizado->fresh()->pessoa_id);
        self::assertSame(2, Pessoa::query()->count());
    }

    public function test_herdeiro_com_cpf_valido_e_sem_pessoa_escolhida_cria_ou_acha_a_pessoa(): void
    {
        $sucessao = $this->novaSucessaoEmAnalise();

        $herdeiro = app(SucessaoService::class)->adicionarHerdeiro($sucessao, ['nome' => 'Herdeiro Novo', 'parentesco' => 'filho', 'documento' => self::CPF]);

        $pessoa = $this->pessoaPorDocumento(self::CPF);
        self::assertNotNull($pessoa);
        self::assertSame($pessoa->id, $herdeiro->pessoa_id);
        self::assertSame(self::CPF, $herdeiro->fresh()->documentoDaPessoa());
    }

    public function test_herdeiro_com_documento_invalido_e_recusado(): void
    {
        $sucessao = $this->novaSucessaoEmAnalise();

        $this->expectException(ValidationException::class);
        app(SucessaoService::class)->adicionarHerdeiro($sucessao, ['nome' => 'Doc Ruim', 'parentesco' => 'filho', 'documento' => '123']);
    }

    public function test_regravar_a_lista_de_herdeiros_mantem_a_pessoa_de_cada_um(): void
    {
        $sucessao = $this->novaSucessaoEmAnalise();
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF, 'nome' => 'Herdeira']);
        $service = app(SucessaoService::class);

        // A tela reenvia o `documento` mascarado que mostrou, junto com o `pessoa_id` de cada herdeiro.
        $lista = [['nome' => 'Herdeira', 'parentesco' => 'filho', 'documento' => '***.982.247-**', 'pessoa_id' => $pessoa->id, 'ordem' => 1, 'titular_indicado' => true]];
        $service->upsertHerdeiros($sucessao, $lista);
        $service->upsertHerdeiros($sucessao->fresh(), $lista);

        self::assertSame(1, Pessoa::query()->count(), 'regravar não cria pessoa nova nem solta o vínculo');
        self::assertSame($pessoa->id, $sucessao->herdeiros()->sole()->pessoa_id);
    }

    public function test_endpoint_de_herdeiros_grava_a_lista_e_devolve_o_documento_mascarado_sem_a_relacao(): void
    {
        $sucessao = $this->novaSucessaoEmAnalise();

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)->postJson("/api/cemiterios/sucessoes/{$sucessao->id}/herdeiros", ['herdeiros' => [
            ['nome' => 'Com Cpf', 'parentesco' => 'filho', 'documento' => '529.982.247-25', 'ordem' => 1, 'titular_indicado' => true],
            ['nome' => 'Sem Documento', 'parentesco' => 'neto', 'ordem' => 1],
        ]]);

        $resposta->assertCreated()->assertJsonCount(2)
            ->assertJsonPath('0.documento', '***.982.247-**')
            ->assertJsonPath('1.documento', null)
            ->assertJsonMissingPath('0.pessoa');
        self::assertSame(2, Pessoa::query()->count());
    }

    private function novaSucessaoEmAnalise(): Sucessao
    {
        $concessao = $this->novaConcessaoParaSucessao();
        $sucessao = app(SucessaoService::class)->abrirProcesso(['concession_id' => $concessao->id, 'via' => 'inventario_extrajudicial']);
        $sucessao->update(['estado' => EstadoSucessao::EmAnalise->value]);

        return $sucessao->fresh();
    }

    private function novaConcessaoParaSucessao(): \Modules\Cemiterios\Models\Concessao
    {
        $jazigo = $this->novoJazigo(concedido: false);
        $titular = \Modules\Cemiterios\Models\Concessionario::create([
            'nome' => 'Titular Original', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido(), 'documento_hash' => hash('sha256', 'titular-' . uniqid()),
        ]);

        return \Modules\Cemiterios\Models\Concessao::create([
            'numero' => 'CON-PD-' . uniqid(), 'plot_id' => $jazigo->id, 'holder_id' => $titular->id, 'tipo' => 'perpetua', 'data_inicio' => '2000-01-01',
        ]);
    }
}
