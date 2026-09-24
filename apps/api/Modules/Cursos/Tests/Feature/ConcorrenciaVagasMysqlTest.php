<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Services\CursoService;
use Modules\Cursos\Services\TurmaService;
use Modules\Cursos\Tests\TestCase;
use PDO;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Cenário "Inscrições simultâneas pela última vaga" (design D5).
 *
 * Em SQLite o lockForUpdate é ignorado, então este teste roda contra um
 * banco MySQL DESCARTÁVEL de nome fixo (nunca o banco real) e fica fora da
 * suíte padrão (grupo "mysql"). Preparação única, no container mysql:
 *
 *   CREATE DATABASE sysgov_cursos_concorrencia_teste;
 *   GRANT ALL PRIVILEGES ON sysgov_cursos_concorrencia_teste.* TO `sysgov`@`%`;
 *
 * Execução (no container api, com os overrides de sempre):
 *   php vendor/bin/phpunit --group mysql
 */
#[Group('mysql')]
final class ConcorrenciaVagasMysqlTest extends TestCase
{
    private const BANCO = 'sysgov_cursos_concorrencia_teste';

    private const DISPUTANTES = 8;

    private string $conexaoOriginal;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.concorrencia' => [
            // Host e credenciais vêm da conexão mysql do config (DB_HOST etc.); só o banco muda.
            ...config('database.connections.mysql'),
            'database' => self::BANCO,
        ]]);

        try {
            DB::connection('concorrencia')->getPdo()->getAttribute(PDO::ATTR_SERVER_VERSION);
        } catch (Throwable $e) {
            $this->markTestSkipped('MySQL do teste de concorrência indisponível (' . self::BANCO . '): ' . $e->getMessage());
        }

        Artisan::call('migrate:fresh', ['--database' => 'concorrencia', '--force' => true]);

        $this->conexaoOriginal = (string) config('database.default');
        config(['database.default' => 'concorrencia']);
        DB::purge('concorrencia');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        config(['database.default' => $this->conexaoOriginal]);
        parent::tearDown();
    }

    public function test_cenario_inscricoes_simultaneas_pela_ultima_vaga(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Concorrência', 'slug' => 'pref-concorrencia', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $instrutor = User::create(['name' => 'Instrutor', 'email' => 'instrutor@concorrencia.gov.br', 'password' => bcrypt('x')]);
        $tenant->users()->attach($instrutor->id, ['status' => 'active', 'is_primary' => true]);
        $curso = app(CursoService::class)->criar(['titulo' => 'Curso disputado', 'carga_horaria_minutos' => 60], $instrutor);
        app(CursoService::class)->alterarStatus($curso, StatusCurso::Publicado);
        $turma = app(TurmaService::class)->criar($curso, [
            'nome' => 'Turma de 1 vaga', 'data_inicio' => now()->addDays(10)->toDateString(), 'data_fim' => now()->addDays(20)->toDateString(),
            'inscricoes_inicio' => now()->subDay()->toDateTimeString(), 'inscricoes_fim' => now()->addDay()->toDateTimeString(),
            'vagas' => 1, 'modalidade' => 'presencial', 'local' => 'Sala 1',
        ], [$instrutor->id]);

        $usuarios = [];
        for ($i = 1; $i <= self::DISPUTANTES; $i++) {
            $usuarios[] = User::create(['name' => "Disputante {$i}", 'email' => "d{$i}@concorrencia.gov.br", 'password' => bcrypt('x')]);
        }

        $largada = (int) (microtime(true) * 1_000_000) + 3_000_000; // 3s para todos terminarem o boot
        $ambiente = [
            'DB_CONNECTION' => 'mysql', 'DB_DATABASE' => self::BANCO, 'APP_ENV' => 'testing',
            'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array', 'QUEUE_CONNECTION' => 'sync',
        ];

        $processos = [];
        foreach ($usuarios as $u) {
            $p = new Process(
                ['php', __DIR__ . '/../Support/inscrever_concorrente.php', (string) $tenant->id, (string) $turma->id, (string) $u->id, (string) $largada],
                base_path(),
                $ambiente,
            );
            $p->start();
            $processos[] = $p;
        }

        $saidas = [];
        foreach ($processos as $p) {
            $p->wait();
            $this->assertTrue($p->isSuccessful(), 'Processo disputante falhou: ' . $p->getErrorOutput());
            $saidas[] = trim($p->getOutput());
        }

        $porStatus = Inscricao::query()->where('turma_id', $turma->id)->pluck('status')->countBy()->all();

        $this->assertSame(['confirmada' => 1, 'lista_espera' => self::DISPUTANTES - 1], $porStatus + ['confirmada' => 0, 'lista_espera' => 0]);
        $this->assertSame(1, count(array_filter($saidas, fn (string $s): bool => $s === 'confirmada')));
    }
}
