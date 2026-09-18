<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

// Nota: esta suite é puramente de lógica de domínio (sem banco de dados).
// Não usa RefreshDatabase — compativel com o GuardAgainstRealDatabase do projeto.
use Illuminate\Support\Collection;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ModeloFatorPeso;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\NotaCalculoService;
use Tests\TestCase;

/**
 * Testes do Motor de Cálculo de Notas (RF-07, RN-02, RN-04, RN-05, RN-08).
 *
 * Valida:
 * - Cálculo exato de Nc (média ponderada, 2 casas decimais)
 * - NFC trienal
 * - Elegibilidade dinâmica (nota_corte_nfc configurável)
 * - Conceitos por faixa
 * - Desempate RN-05
 * - Quinquênios RN-08
 */
class NotaCalculoServiceTest extends TestCase
{
    private NotaCalculoService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NotaCalculoService();
    }

    // ── RF-07: Cálculo de Nc ──────────────────────────────────────────

    /** Exemplo real do PRD §11.3: Carlos Eduardo Silveira */
    public function test_calcula_nc_conforme_exemplo_prd(): void
    {
        $respostas = [
            'ASSID' => 96.00,  // Assiduidade (15%)
            'DISC'  => 88.00,  // Disciplina (10%)
            'INIC'  => 78.00,  // Iniciativa (15%)
            'RESP'  => 95.00,  // Responsabilidade (15%)
            'COOP'  => 85.00,  // Cooperação (10%)
            'QUAL'  => 90.00,  // Qualidade do Trabalho (20%)
            'PART'  => 100.00, // Participação (5%)
            'AVAL'  => 86.00,  // Avaliação pelo Usuário (10%)
        ];

        $pesos = $this->criarPesosMock([
            'ASSID' => 15.00,
            'DISC'  => 10.00,
            'INIC'  => 15.00,
            'RESP'  => 15.00,
            'COOP'  => 10.00,
            'QUAL'  => 20.00,
            'PART'  =>  5.00,
            'AVAL'  => 10.00,
        ]);

        $nc = $this->service->calcularNotaCiclo($respostas, $pesos);

        // PRD §11.3: Nc = 89.25 pontos
        $this->assertEquals('89.25', $nc);
    }

    public function test_nc_rejeita_soma_pesos_diferente_de_100(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessageMatches('/soma dos pesos/i');

        $pesos = $this->criarPesosMock(['A' => 60.00, 'B' => 30.00]); // soma = 90%
        $this->service->calcularNotaCiclo(['A' => 80.0, 'B' => 70.0], $pesos);
    }

    public function test_nc_rejeita_pontuacao_fora_da_faixa(): void
    {
        $this->expectException(\DomainException::class);

        $pesos = $this->criarPesosMock(['A' => 100.00]);
        $this->service->calcularNotaCiclo(['A' => 150.0], $pesos); // > 100
    }

    public function test_nc_com_dois_decimais_sem_arredondamento_errado(): void
    {
        // 3 fatores iguais com peso 33.33 cada (soma = 99.99, invalido)
        // Corrige para 33.34 no último para fechar 100
        $pesos = $this->criarPesosMock(['A' => 33.33, 'B' => 33.33, 'C' => 33.34]);
        $nc = $this->service->calcularNotaCiclo(['A' => 75.0, 'B' => 75.0, 'C' => 75.0], $pesos);

        // 75 * 100% = 75.00
        $this->assertEquals('75.00', $nc);
    }

    // ── RF-06: Redistribuição do Fator H ─────────────────────────────

    public function test_atende_publico_true_nao_redistribui_por_padrao(): void
    {
        $pesos = $this->criarPesosMock(['A' => 45.00, 'B' => 45.00, 'H' => 10.00], redistribuivel: 'H');

        $nc = $this->service->calcularNotaCiclo(['A' => 80.0, 'B' => 60.0, 'H' => 100.0], $pesos);

        // Sem redistribuição: 80*0.45 + 60*0.45 + 100*0.10 = 36 + 27 + 10 = 73.00
        $this->assertEquals('73.00', $nc);
    }

    public function test_redistribui_peso_do_fator_h_quando_servidor_nao_atende_publico(): void
    {
        $pesos = $this->criarPesosMock(['A' => 45.00, 'B' => 45.00, 'H' => 10.00], redistribuivel: 'H');

        $nc = $this->service->calcularNotaCiclo(['A' => 80.0, 'B' => 60.0, 'H' => 100.0], $pesos, atendePublico: false);

        // H (10%) redistribuído proporcionalmente entre A e B (45:45) => A=50%, B=50%
        // 80*0.50 + 60*0.50 = 40 + 30 = 70.00 — H ignorado mesmo com resposta preenchida
        $this->assertEquals('70.00', $nc);
    }

    // ── RN-02: NFC Trienal ────────────────────────────────────────────

    public function test_calcula_nfc_trienal_correto(): void
    {
        $nfc = $this->service->calcularNfc(['89.25', '82.50', '91.00']);
        // (89.25 + 82.50 + 91.00) / 3 = 262.75 / 3 = 87.58
        $this->assertEquals('87.58', $nfc);
    }

    public function test_calcula_nfc_com_ciclo_unico(): void
    {
        $nfc = $this->service->calcularNfc(['80.00']);
        $this->assertEquals('80.00', $nfc);
    }

    public function test_nfc_lanca_excecao_sem_notas(): void
    {
        $this->expectException(\DomainException::class);
        $this->service->calcularNfc([]);
    }

    // ── RN-04: Elegibilidade dinâmica ────────────────────────────────

    public function test_elegibilidade_com_nota_corte_padrao_70(): void
    {
        $ciclo = $this->criarCicloMock('70.00');

        $this->assertTrue($this->service->isElegivelProgressao('75.00', $ciclo));
        $this->assertTrue($this->service->isElegivelProgressao('70.00', $ciclo));
        $this->assertFalse($this->service->isElegivelProgressao('69.99', $ciclo));
    }

    public function test_elegibilidade_com_nota_corte_customizada_pela_comissao(): void
    {
        // Comissão configurou corte mais exigente: 80 pontos
        $ciclo = $this->criarCicloMock('80.00');

        $this->assertFalse($this->service->isElegivelProgressao('75.00', $ciclo));
        $this->assertTrue($this->service->isElegivelProgressao('80.00', $ciclo));
        $this->assertTrue($this->service->isElegivelProgressao('95.00', $ciclo));
    }

    public function test_elegibilidade_com_nota_corte_minima_configuravel(): void
    {
        // Comissão configurou corte mais flexível: 60 pontos
        $ciclo = $this->criarCicloMock('60.00');

        $this->assertTrue($this->service->isElegivelProgressao('65.00', $ciclo));
        $this->assertFalse($this->service->isElegivelProgressao('59.00', $ciclo));
    }

    // ── Conceitos ────────────────────────────────────────────────────

    public function test_determina_conceito_excelente(): void
    {
        $ciclo = $this->criarCicloMock('70.00');
        $this->assertEquals('Excelente', $this->service->determinarConceito('95.00', $ciclo));
    }

    public function test_determina_conceito_bom(): void
    {
        $ciclo = $this->criarCicloMock('70.00');
        $this->assertEquals('Bom', $this->service->determinarConceito('89.25', $ciclo));
    }

    public function test_determina_conceito_regular(): void
    {
        $ciclo = $this->criarCicloMock('70.00');
        $this->assertEquals('Regular', $this->service->determinarConceito('65.00', $ciclo));
    }

    public function test_determina_conceito_insuficiente(): void
    {
        $ciclo = $this->criarCicloMock('70.00');
        $this->assertEquals('Insuficiente', $this->service->determinarConceito('45.00', $ciclo));
    }

    // ── RN-05: Desempate ─────────────────────────────────────────────

    public function test_desempate_por_nfc(): void
    {
        $candidatos = collect([
            $this->criarCandidatoMock(2, '85.00', '2010-01-01', '1980-01-01'),
            $this->criarCandidatoMock(1, '90.00', '2015-01-01', '1985-01-01'),
        ]);

        $ranking = $this->service->rankingComDesempate($candidatos);

        // Candidato 1 (NFC 90) deve ser 1°
        $this->assertEquals(1, $ranking[0]['servidor_id']);
        $this->assertEquals(2, $ranking[1]['servidor_id']);
    }

    public function test_desempate_por_tempo_servico_quando_nfc_igual(): void
    {
        $candidatos = collect([
            $this->criarCandidatoMock(2, '85.00', '2015-01-01', '1980-01-01'), // mais novo no serviço
            $this->criarCandidatoMock(1, '85.00', '2010-01-01', '1985-01-01'), // mais antigo no serviço
        ]);

        $ranking = $this->service->rankingComDesempate($candidatos);

        // Candidato 1 (mais antigo = mais tempo de serviço) deve ser 1°
        $this->assertEquals(1, $ranking[0]['servidor_id']);
    }

    public function test_desempate_por_idade_quando_nfc_e_tempo_iguais(): void
    {
        $candidatos = collect([
            $this->criarCandidatoMock(2, '85.00', '2010-01-01', '1990-06-15'), // mais novo
            $this->criarCandidatoMock(1, '85.00', '2010-01-01', '1980-03-10'), // mais velho
        ]);

        $ranking = $this->service->rankingComDesempate($candidatos);

        // Candidato 1 (mais velho) deve ser 1°
        $this->assertEquals(1, $ranking[0]['servidor_id']);
    }

    // ── RN-08: Quinquênios ────────────────────────────────────────────

    public function test_calcula_quinquenio_zero_para_menos_de_5_anos(): void
    {
        $servidor = $this->criarServidorMock('2022-01-01');
        $ciclo    = $this->criarCicloMock('70.00', '2026-01-01');

        $resultado = $this->service->calcularQuinquenios($servidor, $ciclo);

        $this->assertEquals(0, $resultado['qtd_quinquenios']);
        $this->assertEquals(0.0, $resultado['percentual_total']);
        $this->assertNotNull($resultado['proximo_em']);
    }

    public function test_calcula_dois_quinquenios(): void
    {
        $servidor = $this->criarServidorMock('2015-06-01');
        $ciclo    = $this->criarCicloMock('70.00', '2026-01-01');

        $resultado = $this->service->calcularQuinquenios($servidor, $ciclo);

        // 2015 a 2026 = ~10 anos = 2 quinquênios
        $this->assertEquals(2, $resultado['qtd_quinquenios']);
        $this->assertEquals(10.0, $resultado['percentual_total']); // 2 × 5%
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function criarPesosMock(array $pesosPorCodigo, ?string $redistribuivel = null): Collection
    {
        return collect(array_map(
            function (string $codigo, float $peso) use ($redistribuivel): ModeloFatorPeso {
                $mfp               = new ModeloFatorPeso();
                $mfp->fator_id     = crc32($codigo);
                $mfp->peso         = $peso;
                $mfp->redistribuivel = $codigo === $redistribuivel;
                // Simula relacionamento fator com código
                $mfp->setRelation('fator', (object) ['codigo' => $codigo, 'id' => crc32($codigo)]);
                return $mfp;
            },
            array_keys($pesosPorCodigo),
            array_values($pesosPorCodigo)
        ));
    }

    /**
     * Usa stdClass para evitar conexão Eloquent no PHPUnit sem boot de container.
     * Os métodos acessados pelo Service (nota_corte_nfc, getRegras(), data_fim, etc.)
     * são suportados pelo stdClass genérico.
     */
    private function criarCicloMock(string $notaCorte, string $dataFim = '2026-12-31'): object
    {
        return new class($notaCorte, $dataFim) {
            public string $nota_corte_nfc;
            public string $quinquenio_percentual = '5.00';
            public string $data_fim;
            public int $etapa_cadencia = 3;
            /** @var array<string, mixed>|null */
            public ?array $regras_config = null;
            public bool $redistribuir_fator_h = false;

            public function __construct(string $notaCorte, string $dataFim)
            {
                $this->nota_corte_nfc = $notaCorte;
                $this->data_fim       = $dataFim;
            }

            /** @return array<string, mixed> */
            public function getRegras(): array
            {
                return array_merge([
                    'nota_corte_progressao' => $this->nota_corte_nfc,
                    'quinquenio_percentual'  => $this->quinquenio_percentual,
                    'redistribuir_fator_h'   => $this->redistribuir_fator_h,
                ], $this->regras_config ?? []);
            }
        };
    }

    private function criarServidorMock(string $dataAdmissao): object
    {
        return new class($dataAdmissao) {
            public ?int $id = 1;
            public string $data_admissao;
            public ?string $data_nascimento = null;

            public function __construct(string $dataAdmissao)
            {
                $this->data_admissao = $dataAdmissao;
            }
        };
    }

    private function criarCandidatoMock(int $id, string $nfc, string $admissao, string $nascimento): array
    {
        $servidor                    = $this->criarServidorMock($admissao);
        $servidor->id                = $id;
        $servidor->data_nascimento   = $nascimento;

        return [
            'servidor_id'  => $id,
            'nome'         => "Servidor {$id}",
            'matricula'    => (string) $id,
            'notas_ciclos' => [],
            'nfc'          => $nfc,
            'conceito'     => 'Bom',
            'servidor'     => $servidor,
        ];
    }
}

