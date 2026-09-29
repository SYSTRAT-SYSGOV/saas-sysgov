<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 2.1 — colunas `origem`/`consentimento_em`/`termo_versao` em `cursos_participantes`
 * (design D6/D10). Participantes de antes desta mudança viram `servidor` pelo default da coluna.
 */
final class ParticipanteOrigemTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    public function test_participante_existente_assume_origem_servidor_pelo_default(): void
    {
        $tenant = $this->criarTenant('prefeitura-origem-a');
        $user = $this->usuario($tenant, ['participante_cursos'], 'Ana');

        // Simula uma linha "antiga": insert direto sem passar o campo `origem`, como uma
        // participante criada antes desta migration.
        DB::table('cursos_participantes')->insert([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'nome' => $user->name,
            'email' => $user->email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $participante = Participante::query()->where('user_id', $user->id)->sole();

        $this->assertSame(Participante::ORIGEM_SERVIDOR, $participante->origem);
        $this->assertNull($participante->consentimento_em);
        $this->assertNull($participante->termo_versao);
    }

    public function test_participante_externo_registra_consentimento(): void
    {
        $tenant = $this->criarTenant('prefeitura-origem-b');

        $participante = $this->noTenant($tenant, fn (): Participante => Participante::create([
            'tenant_id' => $tenant->id,
            'nome' => 'Externo',
            'email' => 'externo@fora.gov.br',
            'origem' => Participante::ORIGEM_EXTERNO,
            'consentimento_em' => now(),
            'termo_versao' => 1,
        ]));

        $this->assertSame(Participante::ORIGEM_EXTERNO, $participante->fresh()->origem);
        $this->assertNotNull($participante->fresh()->consentimento_em);
        $this->assertSame(1, $participante->fresh()->termo_versao);
    }

    public function test_tabela_email_verification_tokens_isola_por_usuario_e_tenant(): void
    {
        $tenant = $this->criarTenant('prefeitura-origem-c');
        $user = $this->usuario($tenant, ['participante_cursos'], 'Bruno');

        $id = DB::table('email_verification_tokens')->insertGetId([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'token_hash' => hash('sha256', 'token-de-teste'),
            'expires_at' => now()->addHours(24),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var object{user_id: int, tenant_id: int, used_at: string|null} $registro */
        $registro = DB::table('email_verification_tokens')->find($id);

        $this->assertSame($user->id, $registro->user_id);
        $this->assertSame($tenant->id, $registro->tenant_id);
        $this->assertNull($registro->used_at);
    }
}
