<?php

declare(strict_types=1);

namespace Modules\Passeio\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Tests\Concerns\CenarioPasseio;
use Modules\Passeio\Tests\TestCase;

/** Tarefas 5.1 a 5.6. */
final class PasseioTest extends TestCase
{
    use CenarioPasseio;
    use RefreshDatabase;

    public function test_estrutura_dependencia_e_indices(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Passeio/module.json')), true);
        $this->assertContains('Escola', $json['requires']);
        foreach (['passeio_passeios', 'passeio_inscricoes', 'passeio_veiculos', 'passeio_assentos'] as $tabela) {
            foreach (Schema::getIndexes($tabela) as $indice) {
                if (!$indice['primary']) {
                    $this->assertSame('tenant_id', $indice['columns'][0], "{$tabela}: {$indice['name']}");
                }
            }
        }
        $unicos = collect(Schema::getIndexes('passeio_assentos'))->where('unique', true)->pluck('columns')->all();
        $this->assertContains(['tenant_id', 'veiculo_id', 'numero'], $unicos);
        $this->assertContains(['tenant_id', 'passeio_id', 'aluno_id'], $unicos);
    }

    public function test_apoio_nao_altera_e_prazo_depois_do_passeio_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();
        $id = $this->passeio($tenant);

        $this->como($this->usuario($tenant, ['passeio_apoio']), $tenant)->putJson("/api/passeio/passeios/{$id}", ['data_passeio' => '2026-11-01'])->assertStatus(403);
        $this->como($this->usuario($tenant), $tenant)->putJson("/api/passeio/passeios/{$id}", ['data_limite_autorizacao' => '2026-10-25'])
            ->assertStatus(422)->assertJsonValidationErrors('data_limite_autorizacao');
    }

    public function test_inscricao_em_passeio_cancelado_e_rejeitada(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Aluno');
        $id = $this->passeio($tenant, ['status' => 'cancelado']);

        $this->como($this->usuario($tenant), $tenant)->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])
            ->assertStatus(422)->assertJsonPath('error', 'O passeio está cancelado e não aceita novas inscrições.');
    }

    public function test_inscrever_turma_nao_duplica_e_indicadores(): void
    {
        $tenant = $this->criarTenant();
        $coordenacao = $this->usuario($tenant);
        $id = $this->passeio($tenant);
        $alunos = collect(range(1, 30))->map(fn (int $i) => $this->alunoNaTurma($tenant, "Aluno {$i}"));
        foreach ($alunos->take(5) as $aluno) {
            $this->como($coordenacao, $tenant)->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])->assertCreated();
        }

        $this->como($coordenacao, $tenant)->postJson("/api/passeio/passeios/{$id}/inscricoes", ['turma_id' => $alunos->first()->turma_id])
            ->assertCreated()->assertJsonPath('criadas', 25)->assertJsonPath('ja_inscritos', 5);

        // 10 vão, 6 pagos: arrecadado 30000, pendente 20000
        $inscricoes = $this->noTenant($tenant, fn () => Inscricao::where('passeio_id', $id)->orderBy('id')->get());
        foreach ($inscricoes as $i => $inscricao) {
            $this->como($coordenacao, $tenant)->putJson("/api/passeio/inscricoes/{$inscricao->id}", [
                'vai' => $i < 10, 'pago' => $i < 6, 'autorizacao_entregue' => $i < 5,
            ])->assertOk();
        }

        $this->como($coordenacao, $tenant)->getJson("/api/passeio/passeios/{$id}/indicadores")->assertOk()
            ->assertJsonPath('alunos_inscritos', 30)
            ->assertJsonPath('alunos_que_vao', 10)
            ->assertJsonPath('arrecadado_centavos', 30000)
            ->assertJsonPath('pendente_centavos', 20000)
            ->assertJsonPath('autorizacoes_entregues', 5);
    }

    public function test_mapa_de_assentos_e_capacidade(): void
    {
        $tenant = $this->criarTenant();
        $coordenacao = $this->usuario($tenant);
        $id = $this->passeio($tenant);
        $alunos = collect(range(1, 3))->map(fn (int $i) => $this->alunoNaTurma($tenant, "Aluno {$i}"));
        foreach ($alunos as $aluno) {
            $this->como($coordenacao, $tenant)->postJson("/api/passeio/passeios/{$id}/inscricoes", ['aluno_id' => $aluno->id])->assertCreated();
        }
        $onibus1 = $this->como($coordenacao, $tenant)->postJson("/api/passeio/passeios/{$id}/veiculos", ['identificacao' => 'Ônibus 01', 'placa' => 'ABC1D23', 'motorista' => 'João', 'capacidade' => 44])->assertCreated()->json('id');
        $onibus2 = $this->como($coordenacao, $tenant)->postJson("/api/passeio/passeios/{$id}/veiculos", ['identificacao' => 'Ônibus 02', 'placa' => 'XYZ9K87', 'motorista' => 'Maria', 'capacidade' => 44])->assertCreated()->json('id');

        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus1}/assentos/12", ['aluno_id' => $alunos[0]->id])->assertOk();
        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus1}/assentos/12", ['aluno_id' => $alunos[1]->id])
            ->assertStatus(422)->assertJsonPath('error', 'O assento 12 já está ocupado.');
        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus2}/assentos/1", ['aluno_id' => $alunos[0]->id])
            ->assertStatus(422)->assertJsonPath('error', 'O aluno já tem o assento 12 neste passeio.');
        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus1}/assentos/45", ['aluno_id' => $alunos[1]->id])->assertStatus(422);

        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus1}", ['capacidade' => 10])
            ->assertStatus(422)->assertJsonValidationErrors('capacidade');
        $this->como($coordenacao, $tenant)->deleteJson("/api/passeio/veiculos/{$onibus1}/assentos/12")->assertOk();
        $this->como($coordenacao, $tenant)->putJson("/api/passeio/veiculos/{$onibus1}", ['capacidade' => 10])->assertOk();
        $this->como($coordenacao, $tenant)->getJson("/api/passeio/veiculos/{$onibus1}/assentos")->assertOk()->assertJsonCount(0, 'ocupados');
    }

    public function test_veiculo_sem_placa_e_sem_motorista(): void
    {
        $tenant = $this->criarTenant();
        $id = $this->passeio($tenant);
        $coordenacao = $this->como($this->usuario($tenant), $tenant);

        $veiculo = $coordenacao->postJson("/api/passeio/passeios/{$id}/veiculos", ['identificacao' => 'Ônibus 01', 'capacidade' => 44])
            ->assertCreated()->assertJsonPath('placa', null)->assertJsonPath('motorista', null)->json('id');
        $coordenacao->putJson("/api/passeio/veiculos/{$veiculo}", ['placa' => 'ABC1D23', 'motorista' => 'João'])->assertOk()->assertJsonPath('placa', 'ABC1D23');
        $coordenacao->putJson("/api/passeio/veiculos/{$veiculo}", ['placa' => '', 'motorista' => null])->assertOk()->assertJsonPath('placa', null)->assertJsonPath('motorista', null);
    }

    public function test_cancelar_passeio_e_auditado_e_exclusao_e_logica(): void
    {
        $tenant = $this->criarTenant();
        $coordenacao = $this->usuario($tenant);
        $id = $this->passeio($tenant);

        $this->como($coordenacao, $tenant)->putJson("/api/passeio/passeios/{$id}", ['status' => 'cancelado'])->assertOk();
        $log = AuditLog::query()->where('module', 'passeio')->where('action', 'passeio.atualizado')->latest('id')->firstOrFail();
        $this->assertSame('agendado', $log->before['status']);
        $this->assertSame('cancelado', $log->after['status']);
        $this->assertTrue(OutboxEvent::query()->where('event_type', 'passeio.passeio.atualizado')->exists());

        $this->como($coordenacao, $tenant)->deleteJson("/api/passeio/passeios/{$id}")->assertOk();
        $this->assertSoftDeleted('passeio_passeios', ['id' => $id]);
    }

    public function test_isolamento_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $idA = $this->passeio($tenantA);
        $alunoB = $this->alunoNaTurma($tenantB, 'Do B');
        $coordenacaoB = $this->usuario($tenantB);

        $this->como($coordenacaoB, $tenantB)->getJson("/api/passeio/passeios/{$idA}")->assertNotFound();
        $idB = $this->passeio($tenantB);
        $alunoA = $this->alunoNaTurma($tenantA, 'Do A');
        $this->como($coordenacaoB, $tenantB)->postJson("/api/passeio/passeios/{$idB}/inscricoes", ['aluno_id' => $alunoA->id])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->como($coordenacaoB, $tenantB)->postJson("/api/passeio/passeios/{$idB}/inscricoes", ['aluno_id' => $alunoB->id])->assertCreated();

        foreach ([Passeio::class, Inscricao::class, Veiculo::class, Assento::class] as $model) {
            $this->noTenant($tenantA, fn () => $this->assertSame(0, $model::where('tenant_id', $tenantB->id)->count(), $model));
        }
        $this->noTenant($tenantA, fn () => $this->assertSame(0, Inscricao::count()));
        $this->como($coordenacaoB, $tenantB)->getJson('/api/passeio/passeios')->assertJsonCount(1);
    }
}
