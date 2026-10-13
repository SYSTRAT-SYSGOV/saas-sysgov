<?php

declare(strict_types=1);

namespace Modules\Protocolo\Tests\Unit;

use Modules\Protocolo\Contracts\EntidadeVinculavel;
use Modules\Protocolo\Services\VinculoRegistry;
use PHPUnit\Framework\TestCase;

final class VinculoRegistryTest extends TestCase
{
    public function test_registro_e_resolucao_de_handler(): void
    {
        $registry = new VinculoRegistry();

        self::assertFalse($registry->tem('requerimento'));
        self::assertNull($registry->resolver('requerimento'));

        $fakeHandler = new class implements EntidadeVinculavel {
            public function tipo(): string { return 'requerimento'; }
            public function existe(int $entidadeId): bool { return true; }
            public function jaPromovida(int $entidadeId): bool { return false; }
            public function aoPromover(int $entidadeId, int $processoId): void {}
            public function resumo(int $entidadeId): array { return ['titulo' => 'Requerimento Teste']; }
        };

        $registry->registrar($fakeHandler);

        self::assertTrue($registry->tem('requerimento'));
        self::assertSame($fakeHandler, $registry->resolver('requerimento'));
        self::assertCount(1, $registry->todos());
    }
}
