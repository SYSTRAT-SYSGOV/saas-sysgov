<?php

declare(strict_types=1);

namespace Modules\Pessoas\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Policies\PessoaPolicy;

final class AuthServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    protected $policies = [
        Pessoa::class => PessoaPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
        Gate::policy(Pessoa::class, PessoaPolicy::class);
    }
}
