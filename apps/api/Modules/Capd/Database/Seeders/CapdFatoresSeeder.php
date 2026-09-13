<?php

namespace Modules\Capd\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed canônico dos Planos de Carreira e Fatores de Avaliação.
 *
 * Pesos conforme:
 *   - Quadro Geral:   Lei Municipal nº 1.704/2006
 *   - Magistério:     Lei Municipal nº 1.835/2008
 *
 * Apenas insere para tenants existentes com módulo CAPD ativo.
 * Idempotente: usa upsert por (tenant_id, codigo).
 */
class CapdFatoresSeeder extends Seeder
{
    /** @var array<int, array{codigo:string, nome:string, descricao:string, automatizado:bool, peso_geral:float, peso_magisterio:float, ordem:int}> */
    private array $fatores = [
        [
            'codigo'          => 'F1',
            'nome'            => 'Assiduidade e Pontualidade',
            'descricao'       => 'Cumprimento da jornada de trabalho, regularidade de presença e observância aos horários regulamentares de entrada e saída.',
            'automatizado'    => true,  // Calculado via ponto eletrônico ou lançamento manual
            'peso_geral'      => 1.5,
            'peso_magisterio' => 1.5,
            'ordem'           => 1,
        ],
        [
            'codigo'          => 'F2',
            'nome'            => 'Disciplina e Respeito às Normas',
            'descricao'       => 'Cumprimento dos deveres estatutários, normas internas de serviço e ausência de penalidades disciplinares formais.',
            'automatizado'    => true,  // Calculado via folha/corregedoria ou lançamento manual
            'peso_geral'      => 1.5,
            'peso_magisterio' => 1.0,
            'ordem'           => 2,
        ],
        [
            'codigo'          => 'F3',
            'nome'            => 'Capacidade de Iniciativa',
            'descricao'       => 'Aptidão para propor soluções tempestivas, antecipar demandas e agir proativamente na resolução de problemas operacionais.',
            'automatizado'    => false,
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.0,
            'ordem'           => 3,
        ],
        [
            'codigo'          => 'F4',
            'nome'            => 'Responsabilidade e Comprometimento',
            'descricao'       => 'Zelo com materiais públicos, cumprimento rigoroso de prazos e dedicação na execução dos encargos inerentes ao cargo.',
            'automatizado'    => false,
            'peso_geral'      => 1.5,
            'peso_magisterio' => 1.5,
            'ordem'           => 4,
        ],
        [
            'codigo'          => 'F5',
            'nome'            => 'Cooperação e Trabalho em Equipe',
            'descricao'       => 'Facilidade de relacionamento interpessoal, espírito colaborativo e predisposição para atuar conjuntamente em prol das metas da unidade.',
            'automatizado'    => false,
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.0,
            'ordem'           => 5,
        ],
        [
            'codigo'          => 'F6',
            'nome'            => 'Qualidade do Trabalho Executado',
            'descricao'       => 'Exatidão técnica, organização, apresentação, esmero e ausência de retrabalho nas atividades finalísticas ou de suporte.',
            'automatizado'    => false,
            'peso_geral'      => 1.5,
            'peso_magisterio' => 2.0, // Peso maior no Magistério
            'ordem'           => 6,
        ],
        [
            'codigo'          => 'F7',
            'nome'            => 'Participação em Programas do DRH',
            'descricao'       => 'Engajamento em capacitações, treinamentos institucionais e ações de desenvolvimento promovidas pela administração.',
            'automatizado'    => false,
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.5,
            'ordem'           => 7,
        ],
        [
            'codigo'          => 'F8',
            'nome'            => 'Atendimento ao Usuário / Cidadão',
            'descricao'       => 'Urbanidade, presteza, eficácia e clareza no atendimento dispensado ao público externo e interno.',
            'automatizado'    => false,
            'peso_geral'      => 1.0,
            'peso_magisterio' => 0.5, // Peso menor no Magistério
            'ordem'           => 8,
        ],
    ];

    /** @var array<int, array{codigo:string, nome:string, lei_referencia:string}> */
    private array $planos = [
        [
            'codigo'        => 'GERAL',
            'nome'          => 'Quadro Geral de Servidores',
            'lei_referencia'=> 'Lei Municipal nº 1.704/2006',
        ],
        [
            'codigo'        => 'MAGISTERIO',
            'nome'          => 'Quadro do Magistério Público Municipal',
            'lei_referencia'=> 'Lei Municipal nº 1.835/2008',
        ],
    ];

    public function run(): void
    {
        $tenantIds = DB::table('tenants')->pluck('id');

        foreach ($tenantIds as $tenantId) {
            // Planos de Carreira
            foreach ($this->planos as $plano) {
                DB::table('capd_planos_carreira')->upsert(
                    array_merge($plano, [
                        'tenant_id'  => $tenantId,
                        'ativo'      => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]),
                    ['tenant_id', 'codigo'],
                    ['nome', 'lei_referencia', 'ativo', 'updated_at'],
                );
            }

            // Fatores de Avaliação
            foreach ($this->fatores as $fator) {
                DB::table('capd_fatores_avaliacao')->upsert(
                    array_merge($fator, [
                        'tenant_id'  => $tenantId,
                        'ativo'      => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]),
                    ['tenant_id', 'codigo'],
                    ['nome', 'descricao', 'automatizado', 'peso_geral', 'peso_magisterio', 'ordem', 'ativo', 'updated_at'],
                );
            }
        }

        $this->command->info('✓ CAPD: Planos de carreira e 8 fatores de avaliação cadastrados para ' . $tenantIds->count() . ' tenant(s).');
    }
}
