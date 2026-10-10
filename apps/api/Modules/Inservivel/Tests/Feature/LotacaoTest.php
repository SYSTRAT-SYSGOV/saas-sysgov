<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Inservivel\Services\LotacaoService;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** D3: secretaria do usuário pela lotação no Organograma. */
final class LotacaoTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    public function test_lotacao_em_setor_sobe_ate_a_secretaria(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant, ['inservivel_servidor'], lotacao: 'escola');

        $secretaria = $this->noTenant($tenant, fn () => app(LotacaoService::class)->secretariaDoUsuario($user));
        self::assertSame($this->unidade($tenant, 'smed')->id, $secretaria?->id);
    }

    public function test_sem_lotacao_devolve_null(): void
    {
        $tenant = $this->criarTenant();
        $user = $this->usuario($tenant, ['inservivel_servidor']);

        self::assertNull($this->noTenant($tenant, fn () => app(LotacaoService::class)->secretariaDoUsuario($user)));
    }

    public function test_casa_secretaria_por_nome_ou_sigla_sem_acento(): void
    {
        $tenant = $this->criarTenant();
        $servico = app(LotacaoService::class);

        $this->noTenant($tenant, function () use ($servico, $tenant): void {
            self::assertSame($this->unidade($tenant, 'smad')->id, $servico->casarPorNome('SECRETARIA MUNICIPAL DE  ADMINISTRACAO')?->id);
            self::assertSame($this->unidade($tenant, 'smed')->id, $servico->casarPorNome('smed')?->id);
            self::assertNull($servico->casarPorNome('Secretaria de Obras'));
        });
    }
}
