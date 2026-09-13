<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\Recurso;
use Tests\TestCase;

/**
 * TC-03: Bloqueio Rigoroso de Membros Impedidos no Colegiado da CAPD (RN-C03).
 */
final class ImpedimentoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private CicloAvaliacao $ciclo;
    private Comissao $comissao;
    private User $servidorRecorrente;
    private User $chefeAvaliador;
    private User $membroImpedido;
    private User $membroApto;
    private Recurso $recurso;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Teste CAPD',
            'slug'   => 'pref-teste-capd',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        // Usuários
        $this->servidorRecorrente = User::factory()->create();
        $this->chefeAvaliador     = User::factory()->create();
        $this->membroImpedido     = User::factory()->create();
        $this->membroApto         = User::factory()->create();

        // Ciclo
        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'             => $this->tenant->id,
            'ano_referencia'        => 2026,
            'nome'                  => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01',
            'data_fim_avaliacao'    => '2026-06-30',
            'data_limite_recurso'   => '2026-07-31',
            'status'                => CicloAvaliacao::STATUS_RECURSIVO,
        ]);

        // Comissão
        $this->comissao = Comissao::create([
            'tenant_id'                => $this->tenant->id,
            'ciclo_id'                 => $this->ciclo->id,
            'numero_portaria'          => 'Portaria 123/2026',
            'data_publicacao_portaria' => '2026-01-02',
            'ativa'                    => true,
        ]);

        // Membros
        $cmChefe = ComissaoMembro::create([
            'tenant_id'   => $this->tenant->id,
            'comissao_id' => $this->comissao->id,
            'servidor_id' => $this->chefeAvaliador->id,
            'papel'       => ComissaoMembro::PAPEL_TITULAR_GESTAO,
            'ativo'       => true,
        ]);

        $cmImpedido = ComissaoMembro::create([
            'tenant_id'   => $this->tenant->id,
            'comissao_id' => $this->comissao->id,
            'servidor_id' => $this->membroImpedido->id,
            'papel'       => ComissaoMembro::PAPEL_TITULAR_SERVIDOR,
            'ativo'       => true,
        ]);

        $cmApto = ComissaoMembro::create([
            'tenant_id'   => $this->tenant->id,
            'comissao_id' => $this->comissao->id,
            'servidor_id' => $this->membroApto->id,
            'papel'       => ComissaoMembro::PAPEL_PRESIDENTE,
            'ativo'       => true,
        ]);

        // Fator
        $fator = FatorAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'F3',
            'nome'            => 'Produtividade',
            'descricao'       => 'Volume de trabalho',
            'automatizado'    => false,
            'peso_geral'      => 1.0,
            'peso_magisterio' => 1.0,
            'ordem'           => 3,
            'ativo'           => true,
        ]);

        // Avaliação
        $avaliacao = Avaliacao::create([
            'tenant_id'           => $this->tenant->id,
            'ciclo_id'            => $this->ciclo->id,
            'servidor_id'         => $this->servidorRecorrente->id,
            'avaliador_id'        => $this->chefeAvaliador->id,
            'respostas_fatores'   => ['F3' => ['grau' => 2, 'automatizado' => false]],
            'nota_final'          => '2.50',
            'elegivel_progressao' => false,
            'data_conclusao'      => '2026-06-15',
            'homologada'          => false,
        ]);

        // Recurso
        $this->recurso = Recurso::create([
            'tenant_id'              => $this->tenant->id,
            'avaliacao_id'           => $avaliacao->id,
            'recorrente_id'          => $this->servidorRecorrente->id,
            'fator_contestado_id'    => $fator->id,
            'justificativa_servidor' => 'Contesto a nota atribuída pela chefia imediata com base em documentos anexos.',
            'status'                 => 'interposto',
        ]);

        // Cadastra impedimento formal de parentesco para $cmImpedido em relação a $servidorRecorrente
        Impedimento::create([
            'tenant_id'          => $this->tenant->id,
            'comissao_membro_id' => $cmImpedido->id,
            'servidor_alvo_id'   => $this->servidorRecorrente->id,
            'tipo_impedimento'   => 'grau_parentesco',
            'motivo'             => 'Parentesco de 2º grau (irmão).',
            'declarado_por'      => $this->membroApto->id,
        ]);
    }

    public function test_tc03_membro_com_impedimento_nao_pode_votar(): void
    {
        self::assertFalse(
            Gate::forUser($this->membroImpedido)->allows('votar', $this->recurso),
            'Membro com impedimento declarado de parentesco não pode votar no recurso do servidor alvo.'
        );
    }

    public function test_tc03_chefe_avaliador_nao_pode_votar_em_recurso_contra_sua_propria_nota(): void
    {
        self::assertFalse(
            Gate::forUser($this->chefeAvaliador)->allows('votar', $this->recurso),
            'Chefe imediato que atribuiu a nota contestada não pode votar no recurso.'
        );
    }

    public function test_tc03_recorrente_nao_pode_votar_em_seu_proprio_recurso(): void
    {
        self::assertFalse(
            Gate::forUser($this->servidorRecorrente)->allows('votar', $this->recurso),
            'O próprio servidor recorrente não pode votar no seu próprio recurso.'
        );
    }

    public function test_tc03_membro_desimpedido_pode_votar(): void
    {
        self::assertTrue(
            Gate::forUser($this->membroApto)->allows('votar', $this->recurso),
            'Membro ativo sem impedimentos tem direito a voto garantido.'
        );
    }
}
