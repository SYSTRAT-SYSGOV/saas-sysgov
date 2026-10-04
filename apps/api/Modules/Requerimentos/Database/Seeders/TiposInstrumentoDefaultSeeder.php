<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Database\Seeders;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Modules\Requerimentos\Models\TipoInstrumento;

final class TiposInstrumentoDefaultSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = [
            [
                'nome' => 'Requerimento',
                'slug' => 'requerimento',
                'descricao' => 'Solicitação formal de informações ou providências ao Poder Executivo',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => 30,
                'exige_tramitacao_interna' => false,
                'ordem' => 1,
            ],
            [
                'nome' => 'Indicação',
                'slug' => 'indicacao',
                'descricao' => 'Sugestão de medida de interesse público ao Poder Executivo',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => 30,
                'exige_tramitacao_interna' => false,
                'ordem' => 2,
            ],
            [
                'nome' => 'Projeto de Lei',
                'slug' => 'projeto_lei',
                'descricao' => 'Proposição legislativa com força de lei após aprovação e sanção',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => null,
                'exige_tramitacao_interna' => true,
                'campos_especificos' => [
                    'etapas' => ['protocolo', 'comissao_constituicao_justica', 'comissao_financas', 'pauta', 'votacao', 'sancao', 'publicacao'],
                ],
                'ordem' => 3,
            ],
            [
                'nome' => 'Projeto de Resolução',
                'slug' => 'projeto_resolucao',
                'descricao' => 'Proposição sobre matéria interna da Câmara Municipal',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => null,
                'exige_tramitacao_interna' => true,
                'campos_especificos' => [
                    'etapas' => ['protocolo', 'comissao_constituicao_justica', 'pauta', 'votacao', 'publicacao'],
                ],
                'ordem' => 4,
            ],
            [
                'nome' => 'Projeto de Decreto Legislativo',
                'slug' => 'projeto_decreto_legislativo',
                'descricao' => 'Proposição sobre matéria de competência exclusiva da Câmara com efeitos externos',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => null,
                'exige_tramitacao_interna' => true,
                'campos_especificos' => [
                    'etapas' => ['protocolo', 'comissao_constituicao_justica', 'pauta', 'votacao', 'publicacao'],
                ],
                'ordem' => 5,
            ],
            [
                'nome' => 'Moção',
                'slug' => 'mocao',
                'descricao' => 'Manifestação formal da Câmara sobre assunto específico (aplauso, repúdio, pesar)',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => null,
                'exige_tramitacao_interna' => true,
                'campos_especificos' => [
                    'etapas' => ['protocolo', 'pauta', 'votacao'],
                ],
                'ordem' => 6,
            ],
            [
                'nome' => 'Ofício',
                'slug' => 'oficio',
                'descricao' => 'Comunicação formal entre os Poderes ou com entidades externas',
                'poder_origem' => 'camara',
                'prazo_regimental_dias' => 15,
                'exige_tramitacao_interna' => false,
                'ordem' => 7,
            ],
            [
                'nome' => 'Ofício (Prefeitura)',
                'slug' => 'oficio_prefeitura',
                'descricao' => 'Comunicação formal da Prefeitura para a Câmara Municipal',
                'poder_origem' => 'prefeitura',
                'prazo_regimental_dias' => 15,
                'exige_tramitacao_interna' => false,
                'ordem' => 8,
            ],
        ];

        $tenantContext = app(TenantContext::class);

        if ($tenantContext->hasTenant()) {
            $this->seedParaTenant($tenantContext->get(), $tipos);
            return;
        }

        foreach (Tenant::all() as $tenant) {
            $this->seedParaTenant($tenant, $tipos);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $tipos
     */
    private function seedParaTenant(Tenant $tenant, array $tipos): void
    {
        foreach ($tipos as $tipo) {
            TipoInstrumento::withoutGlobalScopes()->firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'slug' => $tipo['slug'],
                ],
                array_merge($tipo, ['tenant_id' => $tenant->id])
            );
        }
    }
}