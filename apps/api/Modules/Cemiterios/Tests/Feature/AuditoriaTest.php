<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: privacidade-auditoria › Auditoria append-only (tarefa 9.2; RNF-08). */
final class AuditoriaTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->admin = $this->admin($this->tenant);
    }

    public function test_endpoints_de_escrita_geram_auditoria_com_cadeia_integra(): void
    {
        $parque = $this->escrever('POST', '/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'Central'], 'parque.created')->json('id');
        $this->escrever('PUT', "/api/cemiterios/parques/{$parque}", ['nome' => 'Central Norte'], 'parque.updated');
        $setor = $this->escrever('POST', "/api/cemiterios/parques/{$parque}/setores", ['codigo' => 'Q1', 'tipo_zona' => 'jazigos'], 'setor.created')->json('id');
        $jazigo = $this->escrever('POST', '/api/cemiterios/jazigos', ['sector_id' => $setor, 'codigo' => 'J1', 'tipo' => 'jazigo', 'capacidade' => 2], 'jazigo.created')->json('id');
        $titular = $this->escrever('POST', '/api/cemiterios/concessionarios', ['nome' => 'Ana', 'documento' => $this->cpfValido()], 'concessionario.created')->json('id');
        $this->escrever('POST', '/api/cemiterios/concessoes', ['plot_id' => $jazigo, 'holder_id' => $titular, 'modalidade' => 'perpetua', 'lock_version' => 0], 'concessao.created');
        $inumacao = $this->escrever('POST', '/api/cemiterios/inumacoes', [
            'falecido' => ['nome' => 'José', 'falecimento' => '2026-09-01', 'certidao_numero' => 'C-1', 'certidao_cartorio' => '1º', 'causa_morte' => 'Sigilosa'],
            'certidao_arquivo' => UploadedFile::fake()->create('c.pdf', 5, 'application/pdf'), 'plot_id' => $jazigo, 'sepultado_em' => '2026-09-02 09:00',
        ], 'inumacao.created');
        $this->escrever('POST', "/api/cemiterios/ordens-servico/{$inumacao->json('service_order_id')}/concluir", [], 'ordem_servico.concluir');
        $this->escrever('POST', '/api/cemiterios/parametros', ['edital_prazo_dias' => 20], 'parametros.nova_versao');
        $this->escrever('POST', '/api/cemiterios/precos', ['servico' => 'inumacao', 'valor' => '150,00', 'vigencia_inicio' => today()->toDateString()], 'preco.created');
        $this->escrever('POST', '/api/cemiterios/empreiteiros', ['nome' => 'Obras Ltda', 'documento' => $this->cpfValido()], 'empreiteiro.created');
        $this->escrever('POST', '/api/cemiterios/vistorias', [
            'plot_id' => $jazigo, 'estado_conservacao' => 'bom', 'risco' => 'baixo', 'fotos' => [UploadedFile::fake()->image('f.jpg')],
        ], 'vistoria.created');

        // Nenhum registro de auditoria carrega a causa da morte.
        self::assertFalse(AuditLog::all()->contains(fn (AuditLog $l) => str_contains((string) json_encode($l->after), 'Sigilosa')));

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/auditoria/verificar')
            ->assertOk()->assertJsonPath('integra', true)->assertJsonPath('quebra_em', null);
        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/auditoria')->assertOk()->assertJsonPath('total', 12);
    }

    public function test_adulteracao_direta_no_banco_e_detectada(): void
    {
        $this->escrever('POST', '/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'Central'], 'parque.created');
        $alvo = $this->escrever('POST', '/api/cemiterios/parques', ['codigo' => 'C2', 'nome' => 'Sul'], 'parque.created');
        $this->escrever('POST', '/api/cemiterios/parques', ['codigo' => 'C3', 'nome' => 'Leste'], 'parque.created');

        $id = AuditLog::where('resource', "Cemiterio #{$alvo->json('id')}")->value('id');
        DB::table('audit_logs')->where('id', $id)->update(['after' => json_encode(['nome' => 'Adulterado'])]);

        $this->como($this->admin, $this->tenant)->getJson('/api/cemiterios/auditoria/verificar')
            ->assertOk()->assertJsonPath('integra', false)->assertJsonPath('quebra_em', $id);
    }

    public function test_auditoria_exige_permissao(): void
    {
        $this->como($this->usuario($this->tenant, ['cemiterios.inventario.manage']), $this->tenant)
            ->getJson('/api/cemiterios/auditoria/verificar')->assertForbidden();
    }

    /**
     * @param array<string, mixed> $dados
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function escrever(string $metodo, string $uri, array $dados, string $acao): TestResponse
    {
        $antes = AuditLog::where('module', 'cemiterios')->count();
        $comArquivo = collect(Arr::flatten($dados))->contains(fn ($v) => $v instanceof UploadedFile);
        $cliente = $this->como($this->admin, $this->tenant);
        $resposta = ($comArquivo ? $cliente->post($uri, $dados, ['Accept' => 'application/json']) : $cliente->json($metodo, $uri, $dados))
            ->assertSuccessful();

        self::assertSame($antes + 1, AuditLog::where('module', 'cemiterios')->count(), "{$metodo} {$uri} deveria gerar 1 registro de auditoria.");
        $log = AuditLog::orderByDesc('id')->firstOrFail();
        self::assertSame($acao, $log->action);
        self::assertSame($this->tenant->id, (int) $log->tenant_id);
        self::assertSame($this->admin->id, (int) $log->user_id);
        self::assertNotEmpty($log->ip);

        return $resposta;
    }
}
