<?php

declare(strict_types=1);

namespace Modules\Cursos\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Policies\AvaliacaoPolicy;
use Modules\Cursos\Policies\CertificadoPolicy;
use Modules\Cursos\Policies\CursoPolicy;
use Modules\Cursos\Policies\FormacaoPolicy;
use Modules\Cursos\Policies\InscricaoPolicy;
use Modules\Cursos\Policies\MaterialPolicy;
use Modules\Cursos\Policies\TentativaPolicy;
use Modules\Cursos\Policies\ModeloCertificadoPolicy;
use Modules\Cursos\Policies\TurmaPolicy;

final class CursosServiceProvider extends ServiceProvider
{
    /** Consultas por minuto, por IP, nas rotas públicas do módulo (validação de certificado). */
    public const LIMITE_PUBLICO_POR_MINUTO = 30;

    /** Salvamentos de resposta por minuto, por usuário: o autosave com debounce não deve inundar o banco (design D8). */
    public const LIMITE_RESPOSTAS_POR_MINUTO = 60;

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'cursos');

        Gate::policy(Curso::class, CursoPolicy::class);
        Gate::policy(Formacao::class, FormacaoPolicy::class);
        Gate::policy(Turma::class, TurmaPolicy::class);
        Gate::policy(Inscricao::class, InscricaoPolicy::class);
        Gate::policy(Material::class, MaterialPolicy::class);
        Gate::policy(Avaliacao::class, AvaliacaoPolicy::class);
        Gate::policy(Tentativa::class, TentativaPolicy::class);
        Gate::policy(Certificado::class, CertificadoPolicy::class);
        Gate::policy(ModeloCertificado::class, ModeloCertificadoPolicy::class);

        RateLimiter::for('cursos-respostas', fn (Request $request) => Limit::perMinute(self::LIMITE_RESPOSTAS_POR_MINUTO)->by((string) ($request->user()?->getAuthIdentifier() ?? $request->ip())));
        RateLimiter::for('cursos-publico', fn (Request $request) => Limit::perMinute(self::LIMITE_PUBLICO_POR_MINUTO)->by((string) $request->ip()));
    }

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'cursos');
        $this->app->register(RouteServiceProvider::class);
    }
}
