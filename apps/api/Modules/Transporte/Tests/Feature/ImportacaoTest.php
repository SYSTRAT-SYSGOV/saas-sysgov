<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Modules\Pessoas\Models\Pessoa;
use Modules\Transporte\Jobs\ProcessarImportacaoJob;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class ImportacaoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    private function arquivo(string $conteudo, string $nome = 'dados.csv'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($nome, $conteudo);
    }

    /**
     * @param \App\Models\Tenant $t
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function enviar($t, \App\Models\User $u, string $tipo, string $conteudo, string $nome = 'dados.csv'): \Illuminate\Testing\TestResponse
    {
        return $this->como($u, $t)->post("/api/transporte/importacoes/{$tipo}/previa", ['arquivo' => $this->arquivo($conteudo, $nome)], ['Accept' => 'application/json']);
    }

    private const VEICULOS = "origem;cnpj_empresa;placa;descricao;capacidade;tipo_rede;tipologia_inep\n"
        . "propria;;ABC1D23;Ônibus 01;44;rural;3\n"
        . "propria;;ABC1D24;Van 02;15;urbana;1\n"
        . "propria;;ABC1D25;Zero lugares;0;rural;3\n"
        . "propria;;ABC1D26;Tipologia ruim;20;rural;12\n";

    public function test_previa_mostra_validas_e_divergencias_sem_gravar_nada(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $r = $this->enviar($t, $g, 'veiculos', self::VEICULOS)->assertCreated();

        $r->assertJsonPath('data.status', 'previa')->assertJsonPath('data.total', 4)->assertJsonPath('data.validas', 2)->assertJsonPath('data.com_erro', 2);
        $this->assertSame([4, 5], array_column($r->json('data.divergencias'), 'linha'));
        $this->assertSame(['capacidade_invalida', 'tipologia_invalida'], array_column($r->json('data.divergencias'), 'codigo'));
        $this->assertSame(0, Veiculo::query()->count());
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    public function test_confirmacao_vai_para_a_fila_e_nada_e_criado_antes_do_job(): void
    {
        Storage::fake('local');
        Queue::fake();
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->enviar($t, $g, 'veiculos', self::VEICULOS)->json('data.id');

        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(202)->assertJsonPath('data.status', 'na_fila');

        Queue::assertPushed(ProcessarImportacaoJob::class, fn (ProcessarImportacaoJob $j): bool => $j->importacaoId === $id && $j->tenantId === $t->id);
        $this->assertSame(0, Veiculo::query()->count());
    }

    public function test_processamento_cria_as_validas_gera_o_relatorio_audita_e_apaga_o_arquivo(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->enviar($t, $g, 'veiculos', self::VEICULOS, 'frota-2026.csv')->json('data.id');

        $r = $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(202);

        $r->assertJsonPath('data.status', 'concluida')->assertJsonPath('data.criadas', 2)->assertJsonPath('data.com_erro', 2)->assertJsonCount(2, 'data.divergencias');
        $this->assertSame(['ABC1D23', 'ABC1D24'], Veiculo::query()->orderBy('placa')->pluck('placa')->all());
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->como($g, $t)->getJson("/api/transporte/importacoes/{$id}")->assertOk()->assertJsonPath('data.status', 'concluida')->assertJsonPath('data.criadas', 2);

        $evento = AuditLog::query()->where('action', 'importacao.concluida')->firstOrFail();
        $this->assertSame('frota-2026.csv', $evento->after['arquivo']);
        $this->assertSame($g->id, $evento->after['usuario_id']);
        $this->assertSame(2, $evento->after['criadas']);
        $this->assertSame(2, $evento->after['com_erro']);
    }

    public function test_reenvio_do_mesmo_arquivo_nao_duplica_e_a_placa_existente_nao_e_alterada(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarVeiculo($t, $g, ['placa' => 'ABC1D23', 'descricao' => 'Original', 'capacidade' => 30]);
        $csv = "origem;placa;descricao;capacidade;tipo_rede;tipologia_inep\npropria;ABC1D23;Sobrescrita;99;rural;3\npropria;XYZ9A99;Nova;20;rural;3\n";

        $primeira = $this->enviar($t, $g, 'veiculos', $csv)->json('data.id');
        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$primeira}/confirmar")->assertStatus(202)->assertJsonPath('data.criadas', 1)->assertJsonPath('data.divergencias.0.codigo', 'conflito');
        $segunda = $this->enviar($t, $g, 'veiculos', $csv)->json('data.id');
        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$segunda}/confirmar")->assertStatus(202)->assertJsonPath('data.criadas', 0)->assertJsonPath('data.com_erro', 2);

        $this->assertSame(2, Veiculo::query()->count());
        $original = Veiculo::query()->where('placa', 'ABC1D23')->firstOrFail();
        $this->assertSame('Original', $original->descricao);
        $this->assertSame(30, $original->capacidade);
    }

    public function test_placa_repetida_no_arquivo_e_divergencia(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $csv = "origem;placa;descricao;capacidade;tipo_rede;tipologia_inep\npropria;ABC1D23;Um;20;rural;3\npropria;abc-1d23;Dois;20;rural;3\n";

        $r = $this->enviar($t, $g, 'veiculos', $csv)->assertCreated();

        $r->assertJsonPath('data.validas', 1)->assertJsonPath('data.divergencias.0.codigo', 'placa_repetida')->assertJsonPath('data.divergencias.0.linha', 3);
    }

    public function test_veiculo_locado_exige_empresa_existente_pelo_cnpj(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosEmpresa(['tipo' => 'locadora']);
        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertCreated();
        $csv = "origem;cnpj_empresa;placa;descricao;capacidade;tipo_rede;tipologia_inep\n"
            . "locada;{$dados['cnpj']};ABC1D23;Locado;20;rural;3\nlocada;;ABC1D24;Sem CNPJ;20;rural;3\nlocada;{$this->cnpj(999)};ABC1D25;CNPJ desconhecido;20;rural;3\n";

        $r = $this->enviar($t, $g, 'veiculos', $csv)->assertCreated();

        $r->assertJsonPath('data.validas', 1);
        $this->assertSame(['empresa_obrigatoria', 'empresa_nao_encontrada'], array_column($r->json('data.divergencias'), 'codigo'));
    }

    public function test_motoristas_ligam_pelo_cpf_e_nao_criam_pessoa(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $existente = $this->cpf(101);
        $this->noTenant($t, fn () => Pessoa::create(['tipo' => 'fisica', 'nome' => 'João Motorista', 'documento' => $existente, 'data_nascimento' => now()->subYears(40)->toDateString()]));
        $pessoasAntes = $this->noTenant($t, fn (): int => Pessoa::query()->count());
        $valido = now()->addYear()->format('d/m/Y');
        $csv = "cpf;cnh_numero;cnh_categoria;cnh_validade;curso_validade;toxicologico_validade\n"
            . "{$existente};CNH001;D;{$valido};{$valido};{$valido}\n"
            . "{$this->cpf(102)};CNH002;D;{$valido};{$valido};{$valido}\n"
            . "123.456.789-00;CNH003;D;{$valido};{$valido};{$valido}\n";

        $id = $this->enviar($t, $g, 'motoristas', $csv)->assertCreated()->assertJsonPath('data.validas', 1)->json('data.id');
        $r = $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(202);

        $this->assertSame(['pessoa_nao_encontrada', 'cpf_invalido'], array_column($r->json('data.divergencias'), 'codigo'));
        $this->assertSame(1, Motorista::query()->count());
        $this->assertSame($pessoasAntes, $this->noTenant($t, fn (): int => Pessoa::query()->count()));
    }

    public function test_cnh_categoria_b_cpf_repetido_e_motorista_inelegivel_sao_divergencias(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $cpf = $this->cpf(201);
        $this->noTenant($t, fn () => Pessoa::create(['tipo' => 'fisica', 'nome' => 'Maria Motorista', 'documento' => $cpf, 'data_nascimento' => now()->subYears(40)->toDateString()]));
        $valido = now()->addYear()->format('d/m/Y');
        $vencido = now()->subDay()->format('d/m/Y');
        $csv = "cpf;cnh_numero;cnh_categoria;cnh_validade;curso_validade;toxicologico_validade\n"
            . "{$cpf};CNH001;B;{$valido};{$valido};{$valido}\n"
            . "{$cpf};CNH002;D;{$valido};{$valido};{$vencido}\n"
            . "{$cpf};CNH003;D;{$valido};{$valido};{$valido}\n"
            . "{$cpf};CNH004;D;{$valido};{$valido};{$valido}\n";

        $r = $this->enviar($t, $g, 'motoristas', $csv)->assertCreated();

        $r->assertJsonPath('data.validas', 1);
        $codigos = array_column($r->json('data.divergencias'), 'codigo', 'linha');
        $this->assertSame('categoria_invalida', $codigos[2]);
        $this->assertSame('invalida', $codigos[3]);
        $this->assertSame('cpf_repetido', $codigos[5]);
    }

    public function test_paradas_validam_coordenadas_ignoram_duplicadas_e_leem_formula_como_texto(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarParada($t, $g, ['nome' => 'Ponte do Rio', 'logradouro' => 'Estrada Velha', 'numero' => 's/n']);
        $csv = "nome;latitude;longitude;logradouro;numero\n"
            . "Ponte do Rio;-25,43;-49,27;Estrada Velha;s/n\n"
            . "=SUM(1+1);-25,5;-49,3;Rua A;10\n"
            . "Coordenada ruim;120;-49,3;Rua B;11\n"
            . "Só latitude;-25,5;;Rua C;12\n"
            . "=SUM(1+1);-25,5;-49,3;Rua A;10\n";

        $id = $this->enviar($t, $g, 'paradas', $csv)->assertCreated()->assertJsonPath('data.validas', 1)->assertJsonPath('data.ignoradas', 2)->assertJsonPath('data.com_erro', 2)->json('data.id');
        $r = $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(202);

        $r->assertJsonPath('data.criadas', 1)->assertJsonCount(2, 'data.avisos');
        $this->assertSame(1, Parada::query()->where('nome', 'Ponte do Rio')->count());
        $this->assertSame('=SUM(1+1)', Parada::query()->where('nome', '=SUM(1+1)')->value('nome'));
    }

    public function test_arquivo_acima_do_limite_de_linhas_e_extensao_invalida_sao_recusados(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $cabecalho = "nome\n";
        $grande = $cabecalho . implode("\n", array_map(fn (int $i): string => "Parada {$i}", range(1, 5001))) . "\n";

        $this->enviar($t, $g, 'paradas', $grande)->assertUnprocessable();
        $this->enviar($t, $g, 'paradas', "nome\nX\n", 'dados.exe')->assertUnprocessable();
        $this->enviar($t, $g, 'paradas', "cabecalho_errado\nX\n")->assertUnprocessable();
        $this->assertSame(0, Parada::query()->count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_confirmar_duas_vezes_ou_cancelar_depois_de_confirmar_e_conflito(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->enviar($t, $g, 'paradas', "nome\nA\n")->json('data.id');
        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(202);

        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(409);
        $this->como($g, $t)->deleteJson("/api/transporte/importacoes/{$id}")->assertStatus(409);
        $this->assertSame(1, Parada::query()->count());
    }

    public function test_cancelar_a_previa_apaga_o_arquivo(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->enviar($t, $g, 'paradas', "nome\nA\n")->json('data.id');

        $this->como($g, $t)->deleteJson("/api/transporte/importacoes/{$id}")->assertOk()->assertJsonPath('data.status', 'cancelada');

        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->como($g, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertStatus(409);
    }

    public function test_modelos_para_baixar(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        foreach (['veiculos' => 'placa', 'motoristas' => 'cnh_numero', 'paradas' => 'latitude'] as $tipo => $coluna) {
            $r = $this->como($g, $t)->get("/api/transporte/importacoes/modelo/{$tipo}")->assertOk();
            $this->assertStringContainsString($coluna, (string) $r->getContent());
            $this->assertStringStartsWith("\xEF\xBB\xBF", (string) $r->getContent());
        }
        $this->como($g, $t)->getJson('/api/transporte/importacoes/modelo/alunos')->assertNotFound();
    }

    public function test_permissoes_por_tipo(): void
    {
        Storage::fake('local');
        $t = $this->criarTenant();
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->enviar($t, $g, 'paradas', "nome\nA\n")->json('data.id');

        $this->enviar($t, $consulta, 'veiculos', self::VEICULOS)->assertForbidden();
        $this->enviar($t, $consulta, 'paradas', "nome\nA\n")->assertForbidden();
        $this->como($consulta, $t)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertForbidden();
        $this->como($consulta, $t)->getJson("/api/transporte/importacoes/{$id}")->assertForbidden();
        $this->como($consulta, $t)->get('/api/transporte/importacoes/modelo/veiculos', ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_importacao_e_do_tenant(): void
    {
        Storage::fake('local');
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $id = $this->enviar($a, $gA, 'paradas', "nome\nA\n")->json('data.id');

        $this->como($gB, $b)->getJson("/api/transporte/importacoes/{$id}")->assertNotFound();
        $this->como($gB, $b)->postJson("/api/transporte/importacoes/{$id}/confirmar")->assertNotFound();
        $this->como($gB, $b)->deleteJson("/api/transporte/importacoes/{$id}")->assertNotFound();
    }
}
