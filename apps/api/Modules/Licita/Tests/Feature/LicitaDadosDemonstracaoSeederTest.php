<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Modules\Licita\Database\Seeders\LicitaDadosDemonstracaoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Models\Processo;
use Modules\Licita\Tests\TestCase;

/**
 * O seeder de demonstração passa pelos Services reais — se uma RN mudar
 * (ex.: novo artefato exigido na aprovação final), ele quebra aqui em vez
 * de quebrar só na hora que alguém for semear o ambiente local.
 */
final class LicitaDadosDemonstracaoSeederTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura Demo', 'slug' => 'pref-demo', 'type' => 'prefeitura', 'status' => 'active']);
        foreach (['elaborador', 'aprovador'] as $nome) {
            $user = User::create(['name' => ucfirst($nome), 'email' => "{$nome}@demo.gov.br", 'password' => bcrypt('secret')]);
            $this->tenant->users()->attach($user->id);
        }
    }

    public function test_cria_um_processo_em_cada_ponto_do_fluxo(): void
    {
        (new LicitaDadosDemonstracaoSeeder())->run($this->tenant->id);

        $processos = Processo::with(['dfd', 'pesquisaPreco', 'aprovacaoFinal'])->orderBy('id')->get();

        $this->assertCount(8, $processos);
        $this->assertSame(
            ['dfd', 'dfd', 'dfd', 'em_elaboracao', 'em_elaboracao', 'aprovacao_ordenador', 'em_elaboracao', 'concluido'],
            $processos->pluck('fase_atual')->all(),
        );
        $this->assertSame(
            ['rascunho', 'em_revisao', 'rejeitado', 'aprovado', 'aprovado', 'aprovado', 'aprovado', 'aprovado'],
            $processos->map(fn (Processo $p) => $p->dfd->status)->all(),
        );
        $this->assertSame(
            [null, null, null, null, null, 'pendente', 'rejeitada', 'aprovada'],
            $processos->map(fn (Processo $p) => $p->aprovacaoFinal?->status)->all(),
        );
        $this->assertTrue($processos->every(fn (Processo $p) => $p->tenant_id === $this->tenant->id));

        // Autor real na trilha de auditoria (e não null, como seria no console).
        $this->assertFalse(AuditLog::where('module', 'licita')->whereNull('user_id')->exists());
    }

    public function test_nao_duplica_se_o_tenant_ja_tem_processos(): void
    {
        (new LicitaDadosDemonstracaoSeeder())->run($this->tenant->id);
        (new LicitaDadosDemonstracaoSeeder())->run($this->tenant->id);

        $this->assertSame(8, Processo::count());
    }
}
