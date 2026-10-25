<?php

declare(strict_types=1);

namespace Modules\Educa\Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Modules\Educa\Models\EducaCalendarDayReason;

/**
 * Seeder de motivos padrão do calendário escolar (Feriados, Recessos, Sábados Letivos, etc.).
 *
 * Provisiona os motivos canônicos no escopo da rede municipal (school_id = null).
 */
final class EducaMotivosPadraoSeeder extends Seeder
{
    /**
     * Motivos padrão da rede municipal.
     *
     * @var list<array{codigo: string, nome: string, tipo: string, is_school_day: boolean, color_hex: string}>
     */
    public const MOTIVOS_PADRAO = [
        [
            'codigo' => 'FERIADO_NACIONAL',
            'nome' => 'Feriado Nacional',
            'tipo' => 'holiday',
            'is_school_day' => false,
            'color_hex' => '#EF4444',
        ],
        [
            'codigo' => 'FERIADO_MUNICIPAL',
            'nome' => 'Feriado Municipal',
            'tipo' => 'holiday',
            'is_school_day' => false,
            'color_hex' => '#DC2626',
        ],
        [
            'codigo' => 'RECESSO_ESCOLAR',
            'nome' => 'Recesso Escolar',
            'tipo' => 'recess',
            'is_school_day' => false,
            'color_hex' => '#F59E0B',
        ],
        [
            'codigo' => 'FERIAS_DOCENTES',
            'nome' => 'Férias Docentes',
            'tipo' => 'recess',
            'is_school_day' => false,
            'color_hex' => '#D97706',
        ],
        [
            'codigo' => 'SABADO_LETIVO',
            'nome' => 'Sábado Letivo (Reposição / Evento)',
            'tipo' => 'extra_school_day',
            'is_school_day' => true,
            'color_hex' => '#10B981',
        ],
        [
            'codigo' => 'PLANEJAMENTO',
            'nome' => 'Planejamento Pedagógico / Formação',
            'tipo' => 'pedagogical_planning',
            'is_school_day' => false,
            'color_hex' => '#6366F1',
        ],
        [
            'codigo' => 'DIA_LETIVO_REGULAR',
            'nome' => 'Dia Letivo Regular',
            'tipo' => 'regular_school_day',
            'is_school_day' => true,
            'color_hex' => '#2563EB',
        ],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::query()->where('id', $tenantId)->get()
            : Tenant::all();

        foreach ($tenants as $tenant) {
            foreach (self::MOTIVOS_PADRAO as $motivo) {
                EducaCalendarDayReason::query()->firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'school_id' => null,
                        'codigo' => $motivo['codigo'],
                    ],
                    [
                        'nome' => $motivo['nome'],
                        'tipo' => $motivo['tipo'],
                        'is_school_day' => $motivo['is_school_day'],
                        'color_hex' => $motivo['color_hex'],
                    ]
                );
            }
        }
    }
}
