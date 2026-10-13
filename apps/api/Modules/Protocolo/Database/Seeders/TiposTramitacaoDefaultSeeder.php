<?php

declare(strict_types=1);

namespace Modules\Protocolo\Database\Seeders;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Modules\Protocolo\Models\TipoTramitacao;

final class TiposTramitacaoDefaultSeeder extends Seeder
{
    /**
     * @var list<array{slug: string, nome: string, descricao: string, ativo: bool, prazo_dias: int|null, efeito_status: string|null}>
     */
    public const TIPOS_PADRAO = [
        [
            'slug' => 'entrada',
            'nome' => 'Entrada',
            'descricao' => 'Abertura ou recebimento inicial de processo',
            'ativo' => true,
            'prazo_dias' => null,
            'efeito_status' => 'aberto',
        ],
        [
            'slug' => 'despacho',
            'nome' => 'Despacho',
            'descricao' => 'Despacho administrativo ou instrução ordinária',
            'ativo' => true,
            'prazo_dias' => 5,
            'efeito_status' => null,
        ],
        [
            'slug' => 'aprovacao',
            'nome' => 'Aprovação',
            'descricao' => 'Aprovação de solicitação ou ato decisório',
            'ativo' => true,
            'prazo_dias' => 5,
            'efeito_status' => null,
        ],
        [
            'slug' => 'encaminhamento',
            'nome' => 'Encaminhamento',
            'descricao' => 'Encaminhamento para outro setor ou órgão competente',
            'ativo' => true,
            'prazo_dias' => 3,
            'efeito_status' => null,
        ],
        [
            'slug' => 'parecer',
            'nome' => 'Parecer',
            'descricao' => 'Parecer técnico, contábil ou jurídico',
            'ativo' => true,
            'prazo_dias' => 10,
            'efeito_status' => null,
        ],
        [
            'slug' => 'conclusao',
            'nome' => 'Conclusão',
            'descricao' => 'Conclusão e encerramento do processo',
            'ativo' => true,
            'prazo_dias' => null,
            'efeito_status' => 'concluido',
        ],
    ];

    public function run(?int $tenantId = null): void
    {
        if ($tenantId !== null) {
            $tenant = Tenant::find($tenantId);
            if ($tenant !== null) {
                $this->seedParaTenant($tenant);
            }
            return;
        }

        $tenantContext = app(TenantContext::class);

        if ($tenantContext->hasTenant()) {
            $this->seedParaTenant($tenantContext->get());
            return;
        }

        foreach (Tenant::all() as $tenant) {
            $this->seedParaTenant($tenant);
        }
    }

    public function seedParaTenant(Tenant $tenant): void
    {
        foreach (self::TIPOS_PADRAO as $tipo) {
            TipoTramitacao::withoutGlobalScopes()->updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'slug' => $tipo['slug'],
                ],
                [
                    'tenant_id' => $tenant->id,
                    'nome' => $tipo['nome'],
                    'descricao' => $tipo['descricao'],
                    'ativo' => $tipo['ativo'],
                    'prazo_dias' => $tipo['prazo_dias'],
                    'efeito_status' => $tipo['efeito_status'],
                ]
            );
        }
    }
}
