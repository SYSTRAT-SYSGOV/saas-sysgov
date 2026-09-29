<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Database\Seeders\SucessaoDemonstracaoSeeder;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Models\SucessaoHerdeiro;
use Modules\Cemiterios\Models\SucessaoHistorico;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class SucessaoDemonstracaoSeederTest extends CemiteriosTestCase
{
    public function test_semeia_tres_processos_por_via_com_herdeiros_documentos_e_historico(): void
    {
        $tenant = $this->criarTenant();
        $this->noTenant($tenant);
        $this->actingAs($this->admin($tenant));

        app(SucessaoDemonstracaoSeeder::class)->seedTenant($tenant->id);

        self::assertSame(12, Sucessao::count());

        foreach (ViaSucessao::cases() as $via) {
            self::assertSame(3, Sucessao::where('via', $via->value)->count(), "Via {$via->value} deveria ter 3 processos.");
        }

        self::assertGreaterThan(0, SucessaoHerdeiro::count());
        self::assertGreaterThan(0, SucessaoDocumento::count());
        self::assertGreaterThan(0, SucessaoHistorico::count());

        // Cobre os desfechos: sucedida, indeferida e arquivada, além dos estados iniciais.
        self::assertGreaterThan(0, Sucessao::where('estado', EstadoSucessao::Sucedida->value)->count());
        self::assertGreaterThan(0, Sucessao::where('estado', EstadoSucessao::Indeferida->value)->count());
        self::assertGreaterThan(0, Sucessao::where('estado', EstadoSucessao::Arquivada->value)->count());
        self::assertGreaterThan(0, Sucessao::where('estado', EstadoSucessao::Solicitada->value)->count());
        self::assertGreaterThan(0, Sucessao::where('estado', EstadoSucessao::EmAnalise->value)->count());

        // Parentescos variados entre os herdeiros semeados.
        $parentescos = SucessaoHerdeiro::query()->distinct()->pluck('parentesco');
        self::assertGreaterThan(1, $parentescos->count());
    }
}
