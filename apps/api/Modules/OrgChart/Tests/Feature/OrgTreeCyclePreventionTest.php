<?php

declare(strict_types=1);

namespace Modules\OrgChart\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Tests\TestCase;

final class OrgTreeCyclePreventionTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private OrgTreeService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);
        $this->service = app(OrgTreeService::class);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_materialized_path_and_levels_are_properly_calculated(): void
    {
        // 1. Raiz (Gabinete) -> level 1, path 1
        $root = $this->service->createUnit([
            'name' => 'Gabinete do Prefeito',
            'code' => 'GAB',
            'type' => 'raiz',
        ]);

        self::assertSame(1, $root->level);
        self::assertSame((string) $root->id, $root->path);

        // 2. Secretaria (Nível 2) -> path 1.2
        $secAdmin = $this->service->createUnit([
            'name' => 'Secretaria Municipal de Administração',
            'code' => 'SMA',
            'type' => 'secretaria',
            'parent_id' => $root->id,
        ]);

        self::assertSame(2, $secAdmin->level);
        self::assertSame("{$root->id}.{$secAdmin->id}", $secAdmin->path);

        // 3. Departamento (Nível 3) -> path 1.2.3
        $deptCompras = $this->service->createUnit([
            'name' => 'Departamento de Compras e Licitações',
            'code' => 'DCL',
            'type' => 'departamento',
            'parent_id' => $secAdmin->id,
        ]);

        self::assertSame(3, $deptCompras->level);
        self::assertSame("{$root->id}.{$secAdmin->id}.{$deptCompras->id}", $deptCompras->path);

        // 4. Divisão (Nível 4) -> path 1.2.3.4
        $divPregao = $this->service->createUnit([
            'name' => 'Divisão de Pregão Eletrônico',
            'code' => 'DPE',
            'type' => 'divisao',
            'parent_id' => $deptCompras->id,
        ]);

        self::assertSame(4, $divPregao->level);
        self::assertSame("{$root->id}.{$secAdmin->id}.{$deptCompras->id}.{$divPregao->id}", $divPregao->path);
    }

    public function test_cannot_create_second_root_unit(): void
    {
        $this->service->createUnit([
            'name' => 'Gabinete do Prefeito',
            'code' => 'GAB',
            'type' => 'raiz',
        ]);

        $this->expectException(LogicException::class);

        $this->service->createUnit([
            'name' => 'Segundo Gabinete',
            'code' => 'GAB-2',
            'type' => 'raiz',
        ]);
    }

    public function test_cycle_prevention_blocks_moving_unit_to_its_own_descendant(): void
    {
        $root = $this->service->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $sec = $this->service->createUnit(['name' => 'Secretaria', 'code' => 'SEC', 'parent_id' => $root->id]);
        $dept = $this->service->createUnit(['name' => 'Departamento', 'code' => 'DEP', 'parent_id' => $sec->id]);
        $div = $this->service->createUnit(['name' => 'Divisão', 'code' => 'DIV', 'parent_id' => $dept->id]);

        // Tentativa de mover a Secretaria para baixo da Divisão (que é filha dela)
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('geraria um ciclo hierárquico proibido');

        $this->service->moveUnit($sec, $div->id);
    }

    public function test_moving_unit_recalculates_entire_subtree_paths_and_levels(): void
    {
        $root = $this->service->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $secA = $this->service->createUnit(['name' => 'Secretaria A', 'code' => 'SEC-A', 'parent_id' => $root->id]);
        $secB = $this->service->createUnit(['name' => 'Secretaria B', 'code' => 'SEC-B', 'parent_id' => $root->id]);

        $dept = $this->service->createUnit(['name' => 'Departamento X', 'code' => 'DEP-X', 'parent_id' => $secA->id]);
        $div = $this->service->createUnit(['name' => 'Divisão Y', 'code' => 'DIV-Y', 'parent_id' => $dept->id]);

        self::assertSame("{$root->id}.{$secA->id}.{$dept->id}.{$div->id}", $div->fresh()->path);
        self::assertSame(4, $div->fresh()->level);

        // Move o Departamento de Secretaria A para Secretaria B
        $this->service->moveUnit($dept, $secB->id);

        $dept = $dept->fresh();
        $div = $div->fresh();

        self::assertSame("{$root->id}.{$secB->id}.{$dept->id}", $dept->path);
        self::assertSame(3, $dept->level);

        // Subárvore recalculada automaticamente em cascata (RN-ORG-006)
        self::assertSame("{$root->id}.{$secB->id}.{$dept->id}.{$div->id}", $div->path);
        self::assertSame(4, $div->level);
    }
}
