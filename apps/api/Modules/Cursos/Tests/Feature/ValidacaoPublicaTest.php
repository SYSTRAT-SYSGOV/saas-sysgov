<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Providers\CursosServiceProvider;
use Modules\Cursos\Services\ValidacaoCertificadoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;
use ReflectionClass;
use ReflectionNamedType;

/**
 * Grupo 7 — validação pública de autenticidade (rota anônima, design D7).
 */
final class ValidacaoPublicaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('cursos-publico');
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    private function certificado(string $codigo = 'K7M2Q9XR4TWB', bool $revogado = false, ?Tenant $tenant = null): Certificado
    {
        return $this->noTenant($tenant ?? $this->tenant, function () use ($codigo, $revogado): Certificado {
            $participante = Participante::create(['nome' => 'Ana Souza', 'email' => 'ana.' . $codigo . '@teste.gov.br', 'documento' => '123.456.789-00']);

            return Certificado::create([
                'codigo' => $codigo, 'tipo' => 'curso', 'participante_id' => $participante->id, 'emitido_em' => now(),
                'revogado_em' => $revogado ? now() : null, 'motivo_revogacao' => $revogado ? 'Emitido por engano' : null,
                'dados' => [
                    'participante' => 'Ana Souza', 'curso' => 'Gestão de Contratos', 'carga_horaria' => '8 horas', 'carga_horaria_minutos' => 480,
                    'periodo' => '01/10/2026 a 31/10/2026', 'data_emissao' => '05/11/2026', 'orgao' => 'Prefeitura A', 'tipo' => 'curso',
                    'titulo' => 'Certificado', 'corpo' => 'Texto interno do certificado', 'logotipo_path' => 'cursos/1/certificados/x.png', 'assinaturas' => [],
                ],
            ]);
        });
    }

    // ------------------------------------------------------------------ 7.1

    public function test_cenario_codigo_valido_sem_login(): void
    {
        $this->certificado();
        app(TenantContext::class)->clear();

        $this->getJson('/api/public/cursos/certificados/K7M2-Q9XR-4TWB')->assertOk()
            ->assertJsonPath('encontrado', true)
            ->assertJsonPath('certificado.status', 'valido')
            ->assertJsonPath('certificado.participante', 'Ana Souza')
            ->assertJsonPath('certificado.orgao', 'Prefeitura A')
            ->assertJsonPath('certificado.codigo', 'K7M2-Q9XR-4TWB');
    }

    public function test_codigo_digitado_sem_hifen_e_em_minusculas_e_aceito(): void
    {
        $this->certificado();

        $this->getJson('/api/public/cursos/certificados/k7m2q9xr4twb')->assertOk()->assertJsonPath('certificado.status', 'valido');
    }

    public function test_cenario_codigo_inexistente(): void
    {
        $this->certificado();

        $this->getJson('/api/public/cursos/certificados/ZZZZ-ZZZZ-ZZZZ')->assertNotFound()
            ->assertJsonPath('encontrado', false)
            ->assertJsonMissingPath('certificado');
    }

    public function test_cenario_validacao_de_certificado_revogado(): void
    {
        $this->certificado(revogado: true);

        $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertOk()->assertJsonPath('certificado.status', 'revogado');
    }

    public function test_cenario_orgao_desabilitou_o_modulo(): void
    {
        $this->certificado();
        $this->habilitarModulo($this->tenant, false);

        $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertOk()->assertJsonPath('certificado.status', 'valido');
    }

    public function test_certificados_de_tenants_diferentes_sao_encontrados_pelo_codigo(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $this->certificado('AAAABBBBCCCC');
        $this->certificado('DDDDEEEEFFFF', tenant: $outro);

        $this->getJson('/api/public/cursos/certificados/AAAABBBBCCCC')->assertOk()->assertJsonPath('certificado.orgao', 'Prefeitura A');
        $this->getJson('/api/public/cursos/certificados/DDDDEEEEFFFF')->assertOk();
    }

    // ------------------------------------------------------------------ 7.2

    public function test_resposta_publica_contem_so_os_campos_permitidos(): void
    {
        $this->certificado(revogado: true);

        $resposta = $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertOk();

        $this->assertSame(['encontrado', 'certificado'], array_keys($resposta->json()));
        $this->assertEqualsCanonicalizing(ValidacaoCertificadoService::CAMPOS_PUBLICOS, array_keys($resposta->json('certificado')));
        $corpo = (string) $resposta->getContent();
        foreach (['123.456.789-00', '@teste.gov.br', 'Emitido por engano', 'Texto interno', 'logotipo', 'participante_id'] as $vazamento) {
            $this->assertStringNotContainsString($vazamento, $corpo);
        }
    }

    public function test_arquitetura_controllers_publicos_so_dependem_do_servico_de_validacao(): void
    {
        $arquivos = glob(__DIR__ . '/../../Http/Controllers/Publico/*.php') ?: [];
        $this->assertNotEmpty($arquivos);

        foreach ($arquivos as $arquivo) {
            $classe = 'Modules\\Cursos\\Http\\Controllers\\Publico\\' . basename($arquivo, '.php');
            $construtor = (new ReflectionClass($classe))->getConstructor();
            $dependencias = array_map(
                fn (\ReflectionParameter $p): string => $p->getType() instanceof ReflectionNamedType ? $p->getType()->getName() : 'sem-tipo',
                $construtor?->getParameters() ?? [],
            );
            $this->assertSame([ValidacaoCertificadoService::class], $dependencias, "{$classe} só pode depender do ValidacaoCertificadoService.");

            $fonte = (string) file_get_contents($arquivo);
            $this->assertDoesNotMatchRegularExpression('/Modules\\\\Cursos\\\\Models|\\bDB::|::query\(|Illuminate\\\\Support\\\\Facades\\\\DB/', $fonte, "{$classe} não pode acessar models nem o banco diretamente.");
        }

        $servico = (string) file_get_contents(__DIR__ . '/../../Services/ValidacaoCertificadoService.php');
        preg_match_all('/^use Modules\\\\Cursos\\\\Models\\\\(\w+);/m', $servico, $models);
        $this->assertSame(['Certificado'], $models[1], 'O ValidacaoCertificadoService só pode consultar o model Certificado.');
    }

    // ------------------------------------------------------------------ 7.3

    public function test_cenario_excesso_de_consultas(): void
    {
        $this->certificado();
        $limite = CursosServiceProvider::LIMITE_PUBLICO_POR_MINUTO;

        for ($i = 1; $i <= $limite; $i++) {
            $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertOk();
        }

        $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertStatus(429);

        $this->travel(61)->seconds();
        $this->getJson('/api/public/cursos/certificados/K7M2Q9XR4TWB')->assertOk();
    }
}
