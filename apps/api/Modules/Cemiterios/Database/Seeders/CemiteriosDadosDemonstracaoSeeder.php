<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\FotoVistoria;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Models\Vistoria;
use Modules\Cemiterios\Services\AbandonoService;
use Modules\Cemiterios\Services\ConcessaoService;
use Modules\Cemiterios\Services\EmpreiteiroService;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Services\OperacaoService;
use Modules\Cemiterios\Services\ParametroService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\Geo;

/**
 * Seeder de demonstração do módulo Cemitérios (SIGCM): 2 cemitérios com quadras
 * e jazigos reais (grade + geometria via GisService), concessionários e
 * concessões, sepultamentos, tabela de preços e guias, um empreiteiro com obra
 * em andamento e um processo de abandono em edital — para visualizar e evoluir
 * as telas do web-client com dados realistas. Passa pelos Services do módulo
 * (não cria registros "crus"), então audita/estado ficam consistentes.
 */
final class CemiteriosDadosDemonstracaoSeeder extends Seeder
{
    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::where('slug', 'araucaria-pr')->orWhere('id', 2)->get();

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return;
        }

        app(TenantContext::class)->set($tenant);
        echo "==> Semeando dados de demonstração do Cemitérios para o Tenant: [{$tenant->id}] {$tenant->name}\n";

        DB::transaction(function () use ($tenantId): void {
            $this->configurarParametros();
            $this->criarPrecos();

            $gis = app(GisService::class);

            // ── Cemitério 1: Municipal Central — quadra de jazigos + quadra de gavetas ──
            $ref1 = [-49.4108, -25.5904];
            $parque1 = $this->criarParque($gis, 'CMC', 'Cemitério Municipal Central', 'Rua das Acácias, 100 — Centro', $ref1, 26, 22);
            $jazigosA = $this->criarSetorComGrade($gis, $parque1, $ref1, 'A', 'jazigos', 'jazigo', 3, [5, 5], [1.2, 2.5, 0.6, 5, 4], 'CMC-A-{linha}{coluna}');
            $gavetasB = $this->criarSetorComGrade($gis, $parque1, $ref1, 'B', 'gavetas', 'gaveta', 1, [17.4, 5], [0.6, 0.9, 0.5, 4, 3], 'CMC-B-{linha}{coluna}');

            // ── Cemitério 2: Jardim das Flores — uma quadra de jazigos ──
            $ref2 = [-49.4160, -25.5940];
            $parque2 = $this->criarParque($gis, 'CJF', 'Cemitério Jardim das Flores', 'Av. Victor do Amaral, 850 — Jardim das Flores', $ref2, 14, 16);
            $jazigosC = $this->criarSetorComGrade($gis, $parque2, $ref2, 'A', 'jazigos', 'jazigo', 3, [3, 3], [1.2, 2.5, 0.6, 4, 3], 'CJF-A-{linha}{coluna}');

            $concessionarios = $this->criarConcessionarios();

            // Concede parte dos jazigos e sepulta em alguns — mistura os 5 estados (RF-15 cores).
            $this->concederEInumar($jazigosA, $concessionarios, capacidadeMaxEm: 0, ocupados: [0, 1], concedidos: [0, 1, 2, 3, 4]);
            $this->concederEInumar($gavetasB, $concessionarios, capacidadeMaxEm: 0, ocupados: [0], concedidos: [0, 1]);
            $this->concederEInumar($jazigosC, $concessionarios, capacidadeMaxEm: 1, ocupados: [1], concedidos: [0, 1, 2]);

            $this->criarFinanceiroDemo($concessionarios);
            $this->criarEmpreiteiroDemo($jazigosC);
            $this->criarAbandonoDemo($tenantId, $jazigosA);
        });

        echo "    Concluído.\n";
    }

    private function configurarParametros(): void
    {
        $parametros = app(ParametroService::class);
        $parametros->vigente(); // grava a versão de referência na primeira leitura
        $parametros->novaVersao([
            'portal_habilitado' => true,
            'instrucoes_pagamento' => 'Pagamento na tesouraria municipal (2º andar) ou via PIX com a chave abaixo.',
            'chave_pix' => '76.303.676/0001-97',
        ], null);
    }

    private function criarPrecos(): void
    {
        $precos = app(PrecoService::class);
        $inicio = CarbonImmutable::now()->subYear()->startOfYear();
        foreach ([
            'concessao_temporaria' => 45000, 'concessao_perpetua' => 180000, 'renovacao' => 30000,
            'inumacao' => 15000, 'exumacao' => 20000, 'trasladacao' => 25000,
            'taxa_manutencao_anual' => 8000, 'alvara_obra' => 12000,
        ] as $servico => $centavos) {
            $precos->novaVigencia($servico, $centavos, $inicio);
        }
    }

    /** @param array{0: float, 1: float} $refLngLat */
    private function criarParque(GisService $gis, string $codigo, string $nome, string $endereco, array $refLngLat, float $larguraM, float $alturaM): Cemiterio
    {
        $parque = Cemiterio::updateOrCreate(
            ['codigo' => $codigo],
            ['nome' => $nome, 'endereco' => $endereco, 'tipo' => 'publico', 'situacao' => 'ativo', 'responsavel' => 'Secretaria Municipal de Obras e Serviços Públicos'],
        );
        $anel = Geo::desprojetar([[0, 0], [$larguraM, 0], [$larguraM, $alturaM], [0, $alturaM]], $refLngLat);
        $gis->salvar('parque', $parque->id, Geo::geojson($anel));

        return $parque->refresh();
    }

    /**
     * Cria o setor com o polígono já dimensionado para caber exatamente a grade
     * pedida (mais 1 m de folga), e gera os jazigos via GisService::gerarGrade
     * (a mesma rotina usada pelo assistente do mapa — RN-07, RN-08 por construção).
     *
     * @param array{0: float, 1: float} $refParqueCorner o mesmo canto (lng, lat) usado para desenhar o parque em criarParque()
     * @param array{0: float, 1: float} $origemParque origem do setor, em metros a partir desse canto
     * @param array{0: float, 1: float, 2: float, 3: int, 4: int} $grade [largura_m, comprimento_m, espacamento_m, colunas, linhas]
     * @return Collection<int, Jazigo>
     */
    private function criarSetorComGrade(GisService $gis, Cemiterio $parque, array $refParqueCorner, string $sufixoCodigo, string $tipoZona, string $tipoJazigo, int $capacidade, array $origemParque, array $grade, string $padraoCodigo): Collection
    {
        [$larguraM, $comprimentoM, $espacamentoM, $colunas, $linhas] = $grade;
        $refSetor = Geo::desprojetar([$origemParque], $refParqueCorner)[0];

        $larguraGrade = $colunas * ($larguraM + $espacamentoM) - $espacamentoM;
        $alturaGrade = $linhas * ($comprimentoM + $espacamentoM) - $espacamentoM;

        $setor = Setor::updateOrCreate(
            ['park_id' => $parque->id, 'codigo' => $sufixoCodigo],
            ['descricao' => "Quadra {$sufixoCodigo}", 'tipo_zona' => $tipoZona],
        );
        $anel = Geo::desprojetar([[0, 0], [$larguraGrade + 1, 0], [$larguraGrade + 1, $alturaGrade + 1], [0, $alturaGrade + 1]], $refSetor);
        $gis->salvar('setor', $setor->id, Geo::geojson($anel));

        $gis->gerarGrade($setor->refresh(), [
            'origem' => $refSetor,
            'direcao' => Geo::desprojetar([[0, 1]], $refSetor)[0],
            'linhas' => $linhas, 'colunas' => $colunas,
            'comprimento_m' => $comprimentoM, 'largura_m' => $larguraM, 'espacamento_m' => $espacamentoM,
            'padrao' => $padraoCodigo, 'tipo' => $tipoJazigo, 'capacidade' => $capacidade,
        ]);

        return Jazigo::where('sector_id', $setor->id)->orderBy('codigo')->get();
    }

    /** @return list<Concessionario> */
    private function criarConcessionarios(): array
    {
        $dados = [
            ['nome' => 'Maria Aparecida Souza', 'tipo_doc' => 'cpf', 'documento' => '12345678901', 'email' => 'maria.souza@exemplo.com.br', 'telefone' => '(41) 99801-1234'],
            ['nome' => 'João Batista Ferreira', 'tipo_doc' => 'cpf', 'documento' => '23456789012', 'email' => 'joao.ferreira@exemplo.com.br', 'telefone' => '(41) 99802-2345'],
            ['nome' => 'Sebastiana Pereira Lima', 'tipo_doc' => 'cpf', 'documento' => '34567890123', 'email' => null, 'telefone' => '(41) 99803-3456'],
            ['nome' => 'Antônio Carlos Ribeiro', 'tipo_doc' => 'cpf', 'documento' => '45678901234', 'email' => 'antonio.ribeiro@exemplo.com.br', 'telefone' => null],
            ['nome' => 'Paróquia Nossa Senhora Aparecida', 'tipo_doc' => 'cnpj', 'documento' => '12345678000199', 'email' => 'secretaria@paroquia-demo.org.br', 'telefone' => '(41) 3699-4455'],
        ];

        return array_map(fn (array $d) => Concessionario::create($d + ['base_legal' => 'execucao_contrato']), $dados);
    }

    /**
     * @param Collection<int, Jazigo> $jazigos
     * @param list<Concessionario> $concessionarios
     * @param list<int> $ocupados índices (na coleção) que recebem sepultamento
     * @param list<int> $concedidos índices que recebem concessão (superconjunto de $ocupados)
     */
    private function concederEInumar(Collection $jazigos, array $concessionarios, int $capacidadeMaxEm, array $ocupados, array $concedidos): void
    {
        $concessoes = app(ConcessaoService::class);
        $operacoes = app(OperacaoService::class);
        $nomes = ['Antônio Pereira dos Santos', 'Luzia Maria da Conceição', 'Osvaldo Nunes Cardoso', 'Terezinha de Jesus Almeida', 'Waldemar Souza Filho', 'Aparecida Rosa Martins'];

        foreach ($concedidos as $i => $idx) {
            if (! isset($jazigos[$idx])) {
                continue;
            }
            $jazigo = $jazigos[$idx];
            $titular = $concessionarios[$i % count($concessionarios)];
            $concessoes->conceder([
                'plot_id' => $jazigo->id, 'holder_id' => $titular->id,
                'modalidade' => $i % 3 === 0 ? 'perpetua' : 'temporaria',
                'inicio' => now()->subMonths(random_int(1, 36))->toDateString(),
                'lock_version' => $jazigo->lock_version,
            ]);
        }

        foreach ($ocupados as $n => $idx) {
            if (! isset($jazigos[$idx])) {
                continue;
            }
            $jazigo = $jazigos[$idx]->refresh();
            $vezes = $idx === $capacidadeMaxEm ? $jazigo->capacidade : 1;
            for ($v = 0; $v < $vezes; $v++) {
                $operacoes->inumar(
                    [
                        'nome' => $nomes[($n + $v) % count($nomes)],
                        'nascimento' => now()->subYears(random_int(45, 90))->toDateString(),
                        'falecimento' => now()->subDays(random_int(10, 900))->toDateString(),
                        'certidao_numero' => sprintf('%06d-55-2024-8-16-%04d', random_int(100000, 999999), random_int(1000, 9999)),
                    ],
                    ['plot_id' => $jazigo->id, 'sepultado_em' => now()->subDays(random_int(5, 890))->toDateString()],
                );
            }
        }
    }

    /** @param list<Concessionario> $concessionarios */
    private function criarFinanceiroDemo(array $concessionarios): void
    {
        $guias = app(GuiaService::class);
        $concessoesTemp = $concessionarios[0]->concessoes()->where('modalidade', 'temporaria')->get()
            ->merge($concessionarios[1]->concessoes()->where('modalidade', 'temporaria')->get());

        foreach ($concessoesTemp->take(3) as $i => $concessao) {
            $guia = $guias->emitirParaConcessao($concessao, 'taxa_manutencao_anual', now()->year);
            match ($i) {
                0 => $guias->baixar($guia->refresh(), now()->subDays(3)->toDateString(), $guia->valor_centavos, $this->comprovanteDemo(), null),
                1 => $guia->update(['vencimento' => now()->subDays(15)->toDateString()]), // vencida, para o relatório de inadimplência
                default => null,
            };
        }

        if ($concessoesTemp->isNotEmpty()) {
            app(ConcessaoService::class)->renovar($concessoesTemp->first()); // gera guia de renovação (RF-13)
        }
    }

    /** @param Collection<int, Jazigo> $jazigosDisponiveis */
    private function criarEmpreiteiroDemo(Collection $jazigosDisponiveis): void
    {
        $empreiteiros = app(EmpreiteiroService::class);
        $empreiteiro = Empreiteiro::create(['nome' => 'Construtora Marmoraria Bom Pastor Ltda', 'tipo_doc' => 'cnpj', 'documento' => '98765432000155', 'responsavel_tecnico' => 'Eng. Ricardo Almeida Santos', 'contatos' => '(41) 3699-8877']);
        $empreiteiro->alvaras()->create(['numero' => 'ALV-2026/0042', 'validade' => now()->addMonths(8)->toDateString()]);

        $jazigoObra = $jazigosDisponiveis->firstWhere(fn (Jazigo $j) => $j->refresh()->concessaoVigente() !== null);
        if ($jazigoObra) {
            $empreiteiros->emitirObra($empreiteiro, [
                'plot_id' => $jazigoObra->id, 'descricao' => 'Construção de jazigo em granito cinza, base e tampa com gravação',
                'comprimento_m' => 2.4, 'largura_m' => 1.1, 'prazo_fim' => now()->addDays(20)->toDateString(),
            ]);
        }
    }

    /** @param Collection<int, Jazigo> $jazigosConcedidos */
    private function criarAbandonoDemo(int $tenantId, Collection $jazigosConcedidos): void
    {
        $jazigo = $jazigosConcedidos->first(fn (Jazigo $j) => $j->refresh()->estado === EstadoJazigo::Concedido);
        if (! $jazigo) {
            return;
        }

        $vistoria = Vistoria::create([
            'plot_id' => $jazigo->id, 'data' => now()->subDays(5)->toDateString(),
            'estado_conservacao' => 'em_ruina', 'risco' => 'alto',
            'observacoes' => 'Estrutura com trincas e risco de desmoronamento; concessionário não localizado (dados de demonstração).',
        ]);
        FotoVistoria::create(['inspection_id' => $vistoria->id, 'arquivo' => $this->fotoVistoriaDemo($tenantId, $jazigo->id), 'capturada_em' => $vistoria->data]);

        app(JazigoEstadoService::class)->manual($jazigo, EstadoJazigo::Manutencao->value, 'Vistoria #' . $vistoria->id . ': em ruína (dados de demonstração)', $jazigo->lock_version);

        $abandono = app(AbandonoService::class);
        $processo = $abandono->instaurar($jazigo->id);
        $abandono->edital($processo, now()->subDays(2)->toDateString());
    }

    /** JPEG mínimo (1×1 px) só para a foto de vistoria e o comprovante de guia não ficarem sem arquivo no disco. */
    private function fotoVistoriaDemo(int $tenantId, int $jazigoId): string
    {
        $caminho = "cemiterios/{$tenantId}/vistorias/demo-{$jazigoId}.jpg";
        Storage::disk('local')->put($caminho, base64_decode('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMDAwMDAwMDAwMEBAMEBQYFBQUFBgcHBgcJCQoKCQoKCgsMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM/9sAQwEDBAQFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQX/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAX8H/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k='));

        return $caminho;
    }

    private function comprovanteDemo(): string
    {
        $caminho = 'cemiterios/comprovantes-demo/comprovante-' . uniqid() . '.txt';
        Storage::disk('local')->put($caminho, 'Comprovante de pagamento (dados de demonstração).');

        return $caminho;
    }
}
