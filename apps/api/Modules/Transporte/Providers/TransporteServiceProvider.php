<?php

declare(strict_types=1);

namespace Modules\Transporte\Providers;

use Illuminate\Support\ServiceProvider;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Transporte\Services\AlocacaoService;

final class TransporteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        // O Escola não dispara evento de domínio na mudança de situação; o observer no model basta (design D21).
        Aluno::updated(function (Aluno $aluno): void {
            if ($aluno->wasChanged('situacao') && in_array($aluno->situacao, [SituacaoAluno::Transferido->value, SituacaoAluno::Remanejado->value], true)) {
                app(AlocacaoService::class)->encerrarDoAluno($aluno, 'aluno_' . $aluno->situacao);
            }
        });
        Aluno::deleted(function (Aluno $aluno): void {
            app(AlocacaoService::class)->encerrarDoAluno($aluno, 'aluno_excluido');
        });
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}
