<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Services\InscricaoService;
use Modules\Cursos\Services\ParticipantePessoaService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;

/** Participante ligado ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, fase D). */
final class ParticipantePessoaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    private function servico(): ParticipantePessoaService
    {
        return app(ParticipantePessoaService::class);
    }

    public function test_mesmo_cpf_e_um_participante_e_uma_pessoa(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $a = $this->servico()->resolver('Ana Lima', 'ana@x.gov', '529.982.247-25');
            $b = $this->servico()->resolver('ANA L.', null, '52998224725');

            $this->assertSame($a->id, $b->id);
            $this->assertSame(1, Participante::count());
            $this->assertSame(1, Pessoa::count());
            $this->assertSame('Ana Lima', $b->nome);
        });
    }

    public function test_empresa_com_cnpj_fica_sem_pessoa(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $empresa = $this->servico()->resolver('Construtora Exemplo Ltda', null, '12.345.678/0001-95');

            $this->assertNull($empresa->pessoa_id);
            $this->assertSame('12345678000195', $empresa->documento);
            $this->assertSame($empresa->id, $this->servico()->resolver('Construtora Exemplo Ltda', null, '12345678000195')->id);
            $this->assertSame(0, Pessoa::count());
        });
    }

    public function test_usuario_que_nasceu_de_pessoa_e_participante_ligado_a_ela(): void
    {
        $user = $this->usuario($this->tenant, ['participante_cursos'], 'login.servidor');
        $pessoa = $this->noTenant($this->tenant, fn (): Pessoa => Pessoa::create(['nome' => 'Carla Servidora', 'cpf' => '11144477735']));
        $this->noTenant($this->tenant, fn () => PessoaUsuario::query()->forceCreate(['tenant_id' => $this->tenant->id, 'pessoa_id' => $pessoa->id, 'user_id' => $user->id, 'promovido_em' => now()]));

        $participante = $this->noTenant($this->tenant, fn (): Participante => app(InscricaoService::class)->participanteDoUsuario($user));

        $this->assertSame($pessoa->id, $participante->pessoa_id);
        $this->assertSame('Carla Servidora', $participante->nome);
    }

    public function test_nome_corrigido_atualiza_participante_mas_nao_certificado_emitido(): void
    {
        $this->noTenant($this->tenant, function (): void {
            $participante = $this->servico()->resolver('Ana Lima', null, '52998224725');
            $certificado = Certificado::create([
                'codigo' => 'ABCD0000TEST', 'tipo' => 'curso', 'participante_id' => $participante->id,
                'dados' => ['participante' => 'Ana Lima'], 'emitido_em' => now(),
            ]);

            Pessoa::query()->sole()->update(['nome' => 'Ana Lima Souza']);

            $this->assertSame('Ana Lima Souza', $participante->fresh()->nome);
            $this->assertSame('Ana Lima', $certificado->fresh()->dados['participante']);
        });
    }
}
