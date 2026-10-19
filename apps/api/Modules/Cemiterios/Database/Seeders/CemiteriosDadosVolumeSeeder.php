<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\FotoVistoria;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Models\OrdemServico;
use Modules\Cemiterios\Models\Preco;
use Modules\Cemiterios\Models\Setor;
use Modules\Cemiterios\Models\Vistoria;
use Modules\Cemiterios\Services\AbandonoService;
use Modules\Cemiterios\Services\ConcessaoService;
use Modules\Cemiterios\Services\EmpreiteiroService;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Services\OperacaoService;
use Modules\Cemiterios\Services\OperadorCemiterioService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\Geo;
use Throwable;

/**
 * Massa de dados de volume do módulo Cemitérios (SIGCM), para demonstração:
 *
 *  - reaproveita os dois seeders de demonstração do módulo (2 cemitérios, concessões,
 *    guias, empreiteiro, abandono; e 12 processos de sucessão hereditária) e
 *  - acrescenta um 3º cemitério (Distrito de Passaúna) com ~80 jazigos/gavetas,
 *    30 concessionários, 8 operadores (coveiros/pedreiros) com licenças e penalidades,
 *    concessões em todos os estados (ativa, vencendo, vencida, caduca, renunciada,
 *    revertida, transferida, solicitada), cerca de 60 inumações, exumações (ordinária
 *    concluída/pendente/suspensa e judicial), trasladações (internas e externas),
 *    ordens de serviço em várias situações, guias (pagas, abertas, vencidas, segunda
 *    via), 5 empreiteiros (apto, inapto, suspenso, cancelado) com obras, vistorias com
 *    fotos e processos de abandono (instaurado, em edital, arquivado, decidido).
 *
 * Tudo passa pelos Services do módulo (estado dos jazigos, numeração, regras de
 * prazo, histórico). Os concessionários envolvidos em fluxos que agendam e-mail
 * (vencimento, abandono) ficam sem e-mail, para nada ser enviado. CPFs/CNPJs são
 * gerados (dígitos válidos, mas fictícios). Um cenário que viole uma regra de negócio
 * não derruba a execução: é registrado como aviso.
 *
 * Uso: php artisan db:seed --force --class='Modules\Cemiterios\Database\Seeders\CemiteriosDadosVolumeSeeder'
 * Não roda se o tenant já tiver o cemitério de código CSJ (evita duplicar).
 */
class CemiteriosDadosVolumeSeeder extends Seeder
{
    protected const REF_LNG_LAT = [-49.4300, -25.6010];

    protected const PRIMEIROS = ['Adélia', 'Aloísio', 'Benedita', 'Cláudio', 'Dalva', 'Edgar', 'Eunice', 'Fausto', 'Gilda', 'Heitor', 'Irene', 'Jandira', 'Lauro', 'Marlene', 'Nelson', 'Odete', 'Pedro', 'Quitéria', 'Raimundo', 'Silvana', 'Tomás', 'Úrsula', 'Valdir', 'Wanda', 'Zélia', 'Abílio', 'Celina', 'Diógenes', 'Elvira', 'Floriano'];

    protected const SOBRENOMES = ['Andrade', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Fontana', 'Guedes', 'Holanda', 'Iório', 'Junqueira', 'Klein', 'Lopes', 'Maciel', 'Neves', 'Oliveira', 'Pacheco', 'Queiroz', 'Rezende', 'Sampaio', 'Teixeira', 'Uchoa', 'Vasconcelos', 'Werner', 'Xavier', 'Zanetti'];

    protected User $usuario;

    protected int $tenantId;

    protected int $contador = 0;

    /** @var list<Concessionario> */
    protected array $concessionarios = [];

    /** @var list<OperadorCemiterio> */
    protected array $coveiros = [];

    /** @var list<OperadorCemiterio> */
    protected array $pedreiros = [];

    /** @var list<string> */
    protected array $avisos = [];

    /** @var list<Jazigo> jazigos com concessão ativa (para obras e vistorias) */
    protected array $jazigosAtivos = [];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear em Cemitérios.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);
        $this->tenantId = (int) $tenant->id;

        if (Cemiterio::query()->where('codigo', 'CSJ')->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem o cemitério CSJ — nada a fazer.");
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->first();
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        $this->usuario = $usuario;
        // Os Services gravam o autor (histórico de estado, ordem de serviço, exceção judicial) com auth()->id().
        auth()->setUser($usuario);

        DB::transaction(function (): void {
            // Base: os seeders de demonstração do próprio módulo (cemitérios-base e sucessão).
            if (!Cemiterio::query()->where('codigo', 'CMC')->exists()) {
                // O SucessaoConfigSeeder do repositório não é chamado: usa Tenant::config(), que não existe;
                // a SucessaoConfigService já tem valores padrão embutidos.
                app(CemiteriosDadosDemonstracaoSeeder::class)->seedTenant($this->tenantId);
                app(SucessaoDemonstracaoSeeder::class)->seedTenant($this->tenantId);
            }

            $this->garantirPrecos();
            $this->criarOperadores();
            $this->criarConcessionarios();

            [$jazigos, $gavetas] = $this->criarCemiterio();

            $this->tentar('jazigos', fn () => $this->povoarJazigos($jazigos, $gavetas));
            $this->tentar('gavetas', fn () => $this->povoarGavetas($gavetas));
            $this->tentar('ordens', fn () => $this->movimentarOrdens());
            $this->tentar('concessões vencidas', fn () => $this->processarVencimentos());
            $this->tentar('financeiro', fn () => $this->criarFinanceiro());
            $this->tentar('empreiteiros', fn () => $this->criarEmpreiteiros());
            $this->tentar('vistorias', fn () => $this->criarVistorias());
        });

        $this->informar('Dados de volume de Cemitérios criados no tenant [' . $tenant->id . '] ' . $tenant->name . '.');
        foreach ($this->avisos as $aviso) {
            $this->informar("  aviso: {$aviso}", aviso: true);
        }
    }

    // ---------------------------------------------------------- pré-requisitos

    protected function garantirPrecos(): void
    {
        // Completa a tabela com os serviços que faltarem (o seeder-base não cadastra "outorga",
        // usada na guia emitida ao aprovar uma concessão).
        $precos = app(PrecoService::class);
        $inicio = CarbonImmutable::now()->subYears(2)->startOfYear();
        foreach ([
            'concessao_temporaria' => 45000, 'concessao_perpetua' => 180000, 'renovacao' => 30000, 'outorga' => 25000,
            'inumacao' => 15000, 'exumacao' => 20000, 'trasladacao' => 25000,
            'taxa_manutencao_anual' => 8000, 'alvara_obra' => 12000,
        ] as $servico => $centavos) {
            if ($precos->vigente($servico) === null) {
                $precos->novaVigencia($servico, $centavos, $inicio);
            }
        }
    }

    protected function criarOperadores(): void
    {
        $service = app(OperadorCemiterioService::class);
        $hoje = CarbonImmutable::today();

        // [nome, tipo, validade do alvará (dias a partir de hoje), ASO (dias a partir de hoje), penalidade]
        $linhas = [
            ['Valdemar Pires de Oliveira', 'coveiro', 300, 200, null],
            ['Joaquim Antunes Neto', 'coveiro', 20, 25, null],
            ['Sebastião Moreira Lima', 'coveiro', -15, 90, null],
            ['Genésio Ribas da Cruz', 'coveiro', 400, -10, ['advertencia', 'Atraso na abertura da sepultura no horário combinado.']],
            ['Osmar Tavares Filho', 'coveiro', 180, 120, ['suspensao', 'Falta de uso de EPI durante a abertura de sepultura.']],
            ['Aldair Souza Ramos', 'pedreiro', 365, 150, null],
            ['Cláudio Fernandes Rocha', 'pedreiro', 45, 60, null],
            ['Ernesto Barreto Dias', 'pedreiro', 220, 30, ['descredenciamento', 'Reincidência em obra sem comunicação à administração.']],
        ];

        foreach ($linhas as $i => [$nome, $tipo, $diasAlvara, $diasAso, $pena]) {
            $operador = $service->cadastrar([
                'nome' => $nome,
                'tipo' => $tipo,
                'cpf_cnpj' => $this->gerarCpf(612400000 + $i * 7340111),
                'matricula_funcional' => sprintf('MAT-%04d', 1200 + $i),
                'alvara_numero' => sprintf('OP-%d/%04d', $hoje->year, 40 + $i),
                'alvara_validade' => $hoje->addDays($diasAlvara)->toDateString(),
                'telefone' => sprintf('(41) 99%03d-%04d', 700 + $i, 1000 + $i * 37),
                'situacao' => 'ativo',
                'aso_validade' => $hoje->addDays($diasAso)->toDateString(),
                'epi_ultimo_registro' => $hoje->subDays(5 + $i * 9)->toDateString(),
            ]);

            if ($pena !== null) {
                $inicio = $pena[0] === 'suspensao' ? $hoje->subDays(5) : $hoje->subDays(60);
                $service->sancionar($operador, [
                    'tipo' => $pena[0],
                    'inicio' => $inicio->toDateString(),
                    'fim' => $pena[0] === 'suspensao' ? $hoje->addDays(25)->toDateString() : null,
                    'motivo' => $pena[1],
                ]);
            }

            if ($tipo === 'coveiro') {
                $this->coveiros[] = $operador->refresh();
            } else {
                $this->pedreiros[] = $operador->refresh();
            }
        }
    }

    protected function criarConcessionarios(): void
    {
        $bairros = ['Centro', 'Jardim das Flores', 'Vila Nova', 'Passaúna', 'Costeira', 'Iguaçu', 'Capela Velha', 'Thomaz Coelho'];

        for ($i = 0; $i < 30; $i++) {
            $juridica = in_array($i, [9, 21], true);
            $nome = $juridica
                ? ($i === 9 ? 'Irmandade Santa Casa de Misericórdia' : 'Associação Beneficente Pão de Santo Antônio')
                : self::PRIMEIROS[$i % count(self::PRIMEIROS)] . ' ' . self::SOBRENOMES[($i * 7) % count(self::SOBRENOMES)] . ' ' . self::SOBRENOMES[($i * 11 + 3) % count(self::SOBRENOMES)];

            $documento = $juridica ? $this->gerarCnpj(33170000 + $i * 70421) : $this->gerarCpf(402300000 + $i * 9137113);

            $this->concessionarios[] = Concessionario::create([
                'nome' => $nome,
                'tipo_doc' => $juridica ? 'cnpj' : 'cpf',
                'documento' => $documento,
                // Só os 12 primeiros têm e-mail; os demais (usados nos fluxos que agendam e-mail) ficam sem.
                'email' => $i < 12 && !$juridica ? sprintf('titular%02d@exemplo.invalid', $i) : null,
                'telefone' => $i % 4 === 3 ? null : sprintf('(41) 9%04d-%04d', 8000 + $i * 13, 2000 + $i * 41),
                'endereco' => sprintf('Rua %s, %d — %s', self::SOBRENOMES[($i * 5) % count(self::SOBRENOMES)], 40 + $i * 17, $bairros[$i % count($bairros)]),
                'cidade' => 'Araucária',
                'uf' => 'PR',
                'base_legal' => 'execucao_contrato',
            ]);
        }
    }

    // --------------------------------------------------------------- inventário

    /** @return array{0: Collection<int, Jazigo>, 1: Collection<int, Jazigo>} jazigos (quadras A e B) e gavetas (quadra C) */
    protected function criarCemiterio(): array
    {
        $gis = app(GisService::class);
        $ref = self::REF_LNG_LAT;

        $parque = Cemiterio::updateOrCreate(
            ['codigo' => 'CSJ'],
            ['nome' => 'Cemitério Municipal São José (Passaúna)', 'endereco' => 'Estrada do Passaúna, km 3 — Distrito de Passaúna', 'tipo' => 'publico', 'situacao' => 'ativo', 'responsavel' => 'Secretaria Municipal de Obras e Serviços Públicos'],
        );
        $anel = Geo::desprojetar([[0, 0], [42, 0], [42, 34], [0, 34]], $ref);
        $gis->salvar('parque', $parque->id, Geo::geojson($anel));

        $a = $this->criarSetorComGrade($gis, $parque, $ref, 'A', 'jazigos', 'jazigo', 3, [3, 3], [1.2, 2.5, 0.6, 6, 5], 'CSJ-A-{linha}{coluna}');
        $b = $this->criarSetorComGrade($gis, $parque, $ref, 'B', 'jazigos', 'jazigo', 2, [17, 3], [1.2, 2.5, 0.6, 5, 4], 'CSJ-B-{linha}{coluna}');
        $c = $this->criarSetorComGrade($gis, $parque, $ref, 'C', 'gavetas', 'gaveta', 1, [3, 22], [0.6, 0.9, 0.5, 8, 4], 'CSJ-C-{linha}{coluna}');

        return [$a->concat($b)->values(), $c];
    }

    /**
     * @param array{0: float, 1: float} $refCanto
     * @param array{0: float, 1: float} $origem
     * @param array{0: float, 1: float, 2: float, 3: int, 4: int} $grade [largura_m, comprimento_m, espaçamento_m, colunas, linhas]
     * @return Collection<int, Jazigo>
     */
    protected function criarSetorComGrade(GisService $gis, Cemiterio $parque, array $refCanto, string $codigo, string $tipoZona, string $tipoJazigo, int $capacidade, array $origem, array $grade, string $padrao): Collection
    {
        [$larguraM, $comprimentoM, $espacamentoM, $colunas, $linhas] = $grade;
        $refSetor = Geo::desprojetar([$origem], $refCanto)[0];

        $larguraGrade = $colunas * ($larguraM + $espacamentoM) - $espacamentoM;
        $alturaGrade = $linhas * ($comprimentoM + $espacamentoM) - $espacamentoM;

        $setor = Setor::updateOrCreate(['park_id' => $parque->id, 'codigo' => $codigo], ['descricao' => "Quadra {$codigo}", 'tipo_zona' => $tipoZona]);
        $anel = Geo::desprojetar([[0, 0], [$larguraGrade + 1, 0], [$larguraGrade + 1, $alturaGrade + 1], [0, $alturaGrade + 1]], $refSetor);
        $gis->salvar('setor', $setor->id, Geo::geojson($anel));

        $gis->gerarGrade($setor->refresh(), [
            'origem' => $refSetor,
            'direcao' => Geo::desprojetar([[0, 1]], $refSetor)[0],
            'linhas' => $linhas, 'colunas' => $colunas,
            'comprimento_m' => $comprimentoM, 'largura_m' => $larguraM, 'espacamento_m' => $espacamentoM,
            'padrao' => $padrao, 'tipo' => $tipoJazigo, 'capacidade' => $capacidade,
        ]);

        return Jazigo::where('sector_id', $setor->id)->orderBy('codigo')->get();
    }

    // ---------------------------------------------------- concessões e inumações

    /**
     * Cenários por jazigo (quadras A e B). Os últimos jazigos ficam disponíveis, sem concessão.
     *
     * @param Collection<int, Jazigo> $jazigos
     * @param Collection<int, Jazigo> $gavetas
     */
    protected function povoarJazigos(Collection $jazigos, Collection $gavetas): void
    {
        $cenarios = [
            'perp_vazio', 'perp_vazio', 'perp_vazio', 'perp_vazio',
            'perp_1', 'perp_1', 'perp_1', 'perp_1',
            'perp_2', 'perp_2', 'perp_2',
            'perp_cheio', 'perp_cheio', 'perp_cheio',
            'temp_ativa_1', 'temp_ativa_1', 'temp_ativa_1', 'temp_vazio', 'temp_vazio',
            'temp_vencendo', 'temp_vencendo', 'temp_vencida', 'temp_vencida', 'temp_vencida_ocupada', 'temp_caduca',
            'renunciada', 'revertida', 'transferida', 'transferida', 'solicitada', 'solicitada',
            'exumacao_concluida', 'exumacao_concluida', 'exumacao_concluida', 'exumacao_concluida',
            'exumacao_pendente', 'exumacao_pendente', 'exumacao_suspensa',
            'trasladacao_interna', 'trasladacao_interna', 'trasladacao_externa', 'judicial',
            'abandono_instaurado', 'abandono_edital', 'abandono_arquivado', 'abandono_decidido',
        ];

        foreach ($cenarios as $i => $cenario) {
            $jazigo = $jazigos->get($i);
            if (!$jazigo instanceof Jazigo) {
                break;
            }

            $this->tentar("jazigo {$jazigo->codigo} ({$cenario})", fn () => $this->cenarioJazigo($jazigo->refresh(), $cenario, $i, $gavetas));
        }
    }

    /** @param Collection<int, Jazigo> $gavetas */
    protected function cenarioJazigo(Jazigo $jazigo, string $cenario, int $i, Collection $gavetas): void
    {
        $perpetua = str_starts_with($cenario, 'perp') || !str_starts_with($cenario, 'temp');
        $holder = $this->titular($i, semEmail: str_starts_with($cenario, 'abandono') || str_starts_with($cenario, 'temp_ven'));

        // Concessões temporárias que vencem ou venceram, com início ajustado ao cenário.
        $inicio = match ($cenario) {
            'temp_vencendo' => CarbonImmutable::today()->subYears(5)->addDays(25 + $i % 10),
            'temp_vencida', 'temp_vencida_ocupada', 'temp_caduca' => CarbonImmutable::today()->subYears(5)->subDays(40 + $i * 3),
            'exumacao_concluida', 'exumacao_pendente', 'exumacao_suspensa', 'trasladacao_interna', 'trasladacao_externa' => CarbonImmutable::today()->subYears(8)->subMonths($i % 12),
            default => CarbonImmutable::today()->subMonths(2 + ($i * 5) % 70),
        };

        $estadoInicial = $cenario === 'solicitada' ? 'Solicitada' : null;
        $tipo = in_array($cenario, ['perp_vazio', 'perp_1', 'perp_2', 'perp_cheio', 'renunciada', 'revertida', 'transferida', 'judicial'], true)
            || str_starts_with($cenario, 'abandono') || str_starts_with($cenario, 'exumacao') || str_starts_with($cenario, 'trasladacao')
            ? 'perpetua'
            : 'temporaria';
        unset($perpetua);

        $concessoes = app(ConcessaoService::class);
        $concessao = $concessoes->solicitar([
            'plot_id' => $jazigo->id,
            'holder_id' => $holder->id,
            'tipo' => $tipo,
            'data_inicio' => $inicio->toDateString(),
            'lock_version' => $jazigo->lock_version,
            'processo_administrativo' => sprintf('PA-%d/%04d', $inicio->year, 300 + $i),
        ] + ($estadoInicial !== null ? ['estado' => $estadoInicial] : []));

        if ($cenario === 'solicitada') {
            if ($i % 2 === 0) {
                $concessoes->aprovar($concessao->refresh());   // emite a guia de outorga
            }
            return;
        }

        $this->jazigosAtivos[] = $jazigo;
        $nBurials = match ($cenario) {
            'perp_1', 'temp_ativa_1', 'temp_vencida_ocupada', 'revertida', 'abandono_decidido', 'abandono_edital', 'abandono_instaurado', 'abandono_arquivado' => 1,
            'perp_2' => 2,
            'perp_cheio' => $jazigo->capacidade,
            default => 0,
        };

        for ($k = 0; $k < $nBurials; $k++) {
            $this->inumar($jazigo->refresh(), 20 + (($i * 41 + $k * 173) % 700), comOperadores: $k === 0 && $i % 2 === 0);
        }

        // Exumações e trasladações: precisam de sepultamento antigo (prazo legal decorrido).
        if (str_starts_with($cenario, 'exumacao') || str_starts_with($cenario, 'trasladacao')) {
            $inumacao = $this->inumar($jazigo->refresh(), 365 * 5 + ($i * 37) % 700, comOperadores: true);
            $this->movimentarRestos($inumacao, $cenario, $i, $gavetas);
        }

        if ($cenario === 'judicial') {
            $inumacao = $this->inumar($jazigo->refresh(), 260 + $i, comOperadores: false);
            $this->exumacaoJudicial($inumacao, $i);
        }

        match ($cenario) {
            'renunciada' => $concessoes->renunciar($concessao->refresh(), 'Renúncia expressa do concessionário, por mudança de município.', 'PA-REN-' . $i),
            'revertida' => $concessoes->reverter($concessao->refresh(), 'Reversão por descumprimento do dever de conservação.', 'PA-REV-' . $i),
            'transferida' => $concessoes->transferir($concessao->refresh(), $this->titular($i + 7, semEmail: false)->id, 'PA-TRF-' . $i),
            'abandono_instaurado', 'abandono_edital', 'abandono_arquivado', 'abandono_decidido' => $this->abandono($jazigo->refresh(), $cenario),
            default => null,
        };
    }

    protected function inumar(Jazigo $jazigo, int $diasAtras, bool $comOperadores): Inumacao
    {
        $this->contador++;
        $n = $this->contador;
        $crianca = $n % 11 === 0;
        $sepultadoEm = CarbonImmutable::today()->subDays($diasAtras)->setTime(8 + $n % 8, ($n * 13) % 60);
        $falecimento = $sepultadoEm->subDays(1 + $n % 3);
        $idade = $crianca ? 1 + $n % 4 : 38 + ($n * 7) % 55;

        $dados = [
            'plot_id' => $jazigo->id,
            'sepultado_em' => $sepultadoEm->toDateTimeString(),
            'cartorio' => 'Cartório de Registro Civil de Araucária',
            'medico' => 'Dr. ' . self::PRIMEIROS[($n * 3) % count(self::PRIMEIROS)] . ' ' . self::SOBRENOMES[($n * 5) % count(self::SOBRENOMES)],
        ];
        if ($jazigo->tipo === 'gaveta') {
            $dados['gaveta_numero'] = 1;
        }
        if ($comOperadores && $this->coveiros !== []) {
            // Só operadores sem suspensão/descredenciamento (os dois últimos coveiros/pedreiro têm penalidade).
            $dados['coveiro_id'] = $this->coveiros[$n % 3]->id;
            $dados['pedreiro_id'] = $this->pedreiros[$n % 2]->id;
        }

        return app(OperacaoService::class)->inumar([
            'nome' => $this->nomeFalecido($n),
            'nascimento' => $falecimento->subYears($idade)->subDays($n % 300)->toDateString(),
            'falecimento' => $falecimento->toDateString(),
            'certidao_numero' => sprintf('%06d-55-%d-8-16-%04d', 410000 + $n * 37, $falecimento->year, 1000 + $n * 7),
            'certidao_cartorio' => 'Cartório de Registro Civil de Araucária',
        ], $dados)->refresh();
    }

    protected function movimentarRestos(Inumacao $inumacao, string $cenario, int $i, Collection $gavetas): void
    {
        $operacoes = app(OperacaoService::class);
        $agendada = CarbonImmutable::today()->addDays(3 + $i % 12)->setTime(9, 0)->toDateTimeString();

        if (str_starts_with($cenario, 'exumacao')) {
            $exumacao = $operacoes->exumarOrdinaria($inumacao, 'Ossuário Municipal', $agendada);
            $ordem = OrdemServico::findOrFail($exumacao->service_order_id);

            match ($cenario) {
                'exumacao_concluida' => $this->concluirOrdem($ordem, $i),
                'exumacao_suspensa' => $operacoes->transicao($ordem, 'suspender', 'Família solicitou adiamento para providenciar o ossuário particular.'),
                default => null,   // exumacao_pendente: fica deferida/emitida
            };

            return;
        }

        if ($cenario === 'trasladacao_externa') {
            $trasladacao = $operacoes->trasladar($inumacao, [
                'destino_externo' => 'Cemitério da Paz — Curitiba/PR',
                'documento_destino' => 'Ofício 218/2026 — autorização do cemitério de destino',
                'agendada_para' => $agendada,
            ]);
            $this->concluirOrdem(OrdemServico::findOrFail($trasladacao->service_order_id), $i);

            return;
        }

        // Trasladação interna: para uma gaveta livre da quadra C.
        $destino = $gavetas->first(fn (Jazigo $g): bool => $g->refresh()->ocupacao === 0 && $g->concessaoVigente() === null);
        if (!$destino instanceof Jazigo) {
            return;
        }
        $this->concederGaveta($destino, $i);
        $trasladacao = $operacoes->trasladar($inumacao, ['plot_destino_id' => $destino->id, 'agendada_para' => $agendada]);
        if ($i % 2 === 0) {
            $this->concluirOrdem(OrdemServico::findOrFail($trasladacao->service_order_id), $i);
        }
    }

    protected function exumacaoJudicial(Inumacao $inumacao, int $i): void
    {
        $caminho = "cemiterios/{$this->tenantId}/mandados/mandado-demo-{$i}.pdf";
        Storage::disk('local')->put($caminho, 'Mandado judicial (dados de demonstração).');

        $exumacao = app(OperacaoService::class)->exumarJudicial($inumacao, [
            'processo' => '0004721-38.2026.8.16.0025',
            'juizo' => '2ª Vara Criminal da Comarca de Araucária',
            'data_decisao' => CarbonImmutable::today()->subDays(9)->toDateString(),
            'arquivo' => $caminho,
        ], 'Instituto Médico-Legal de Curitiba', CarbonImmutable::today()->addDays(2)->setTime(8, 0)->toDateTimeString());

        $this->concluirOrdem(OrdemServico::findOrFail($exumacao->service_order_id), $i);
    }

    protected function concluirOrdem(OrdemServico $ordem, int $i): void
    {
        $operacoes = app(OperacaoService::class);
        $operacoes->transicao($ordem, 'iniciar');
        $operacoes->transicao($ordem->refresh(), 'concluir');

        // A execução entra como "agora"; recua para uma data passada coerente com a linha do tempo.
        $quando = CarbonImmutable::today()->subDays(4 + ($i * 5) % 60)->setTime(10, 30);
        DB::table('cemetery_service_orders')->where('id', $ordem->id)->update(['executada_em' => $quando, 'agendada_para' => $quando->subDays(3)]);
    }

    protected function abandono(Jazigo $jazigo, string $cenario): void
    {
        $this->registrarVistoria($jazigo, $cenario === 'abandono_instaurado' ? 'em_ruina' : 'indicio_abandono', 'alto', 'Estrutura comprometida, vegetação cobrindo o jazigo e concessionário não localizado. (dados de demonstração)');
        app(JazigoEstadoService::class)->manual($jazigo->refresh(), EstadoJazigo::Manutencao->value, 'Vistoria: risco alto; processo de abandono (dados de demonstração)', null);

        $abandono = app(AbandonoService::class);
        $processo = $abandono->instaurar($jazigo->id);

        match ($cenario) {
            'abandono_edital' => $abandono->edital($processo, CarbonImmutable::today()->subDays(9)->toDateString()),
            'abandono_arquivado' => $abandono->manifestacao($abandono->edital($processo, CarbonImmutable::today()->subDays(15)->toDateString()), 'Concessionário compareceu, regularizou a conservação e pediu o arquivamento.', true),
            'abandono_decidido' => $abandono->decidir($abandono->edital($processo, CarbonImmutable::today()->subDays(150)->toDateString()), 'Abandono declarado; concessão caduca e demolição autorizada.'),
            default => null,
        };
    }

    /** @param Collection<int, Jazigo> $gavetas */
    protected function povoarGavetas(Collection $gavetas): void
    {
        // Primeiras 14 gavetas livres da quadra C: 12 concedidas (algumas ocupadas), 2 em branco.
        foreach ($gavetas->slice(10, 14)->values() as $k => $gaveta) {
            $gaveta = $gaveta->refresh();
            if ($gaveta->concessaoVigente() !== null || $gaveta->ocupacao > 0) {
                continue;
            }
            $this->tentar("gaveta {$gaveta->codigo}", function () use ($gaveta, $k): void {
                if ($k >= 12) {
                    return;
                }
                $this->concederGaveta($gaveta, 100 + $k);
                if ($k % 2 === 0) {
                    $this->inumar($gaveta->refresh(), 15 + $k * 29, comOperadores: $k % 4 === 0);
                }
            });
        }
    }

    protected function concederGaveta(Jazigo $gaveta, int $i): void
    {
        app(ConcessaoService::class)->solicitar([
            'plot_id' => $gaveta->id,
            'holder_id' => $this->titular($i, semEmail: true)->id,
            'tipo' => 'perpetua',
            'data_inicio' => CarbonImmutable::today()->subMonths(3 + $i % 20)->toDateString(),
            'lock_version' => $gaveta->refresh()->lock_version,
        ]);
    }

    // ------------------------------------------------------ ordens de serviço

    protected function movimentarOrdens(): void
    {
        $operacoes = app(OperacaoService::class);

        // Ordens de inumação: parte concluída, parte em execução, uma suspensa, uma cancelada; o resto fica emitida.
        $ordens = OrdemServico::query()->where('tipo', 'inumacao')->where('situacao', 'emitida')->orderBy('id')->get();
        foreach ($ordens as $n => $ordem) {
            $acao = match (true) {
                $n % 6 === 0, $n % 6 === 1, $n % 6 === 2 => 'concluir',
                $n % 6 === 3 => 'iniciar',
                $n % 12 === 4 => 'suspender',
                default => null,
            };
            if ($acao === null) {
                continue;
            }
            $this->tentar("ordem #{$ordem->id}", function () use ($operacoes, $ordem, $acao): void {
                $operacoes->transicao($ordem, $acao, $acao === 'suspender' ? 'Chuva forte no horário agendado; reagendar.' : null);
            });
        }
    }

    // ----------------------------------------------------- vencimentos/financeiro

    protected function processarVencimentos(): void
    {
        $concessoes = app(ConcessaoService::class);

        // "Vencendo": temporárias ativas que terminam em breve (não notifica por e-mail — só muda o estado).
        Concessao::query()->where('estado', 'Ativa')->where('tipo', 'temporaria')
            ->whereDate('data_fim', '>=', today()->toDateString())->whereDate('data_fim', '<=', today()->addDays(60)->toDateString())
            ->each(fn (Concessao $c) => $this->tentar("vencer {$c->numero}", fn () => $concessoes->vencer($c)));

        $concessoes->expirarVencidas();

        // A "caduca" parte de uma concessão vencida (a de menor id, só uma).
        $vencida = Concessao::query()->where('estado', 'Vencida')->where('pendencia_regularizacao', false)->orderBy('id')->first();
        if ($vencida !== null) {
            $concessoes->tornarCaduca($vencida, 'Prazo de manifestação esgotado sem renovação (dados de demonstração).');
        }

        // Renovação de duas temporárias ativas (gera guia de renovação).
        Concessao::query()->where('estado', 'Ativa')->where('tipo', 'temporaria')->orderBy('id')->limit(2)
            ->each(fn (Concessao $c) => $this->tentar("renovar {$c->numero}", fn () => $concessoes->renovar($c)));
    }

    protected function criarFinanceiro(): void
    {
        $guias = app(GuiaService::class);
        $ano = (int) now()->year;

        $guias->loteAnual($ano);

        // Exercício anterior: guias para uma amostra de concessões vigentes, quase todas pagas.
        $amostra = Concessao::query()->vigentes()->where('sujeita_taxa_anual', true)->orderBy('id')->limit(14)->get();
        foreach ($amostra as $i => $concessao) {
            $this->tentar("guia {$concessao->numero}/anterior", function () use ($guias, $concessao, $ano, $i): void {
                $guia = $guias->emitirParaConcessao($concessao, 'taxa_manutencao_anual', $ano - 1, 30);
                if ($i % 7 === 6) {
                    $guia->update(['vencimento' => today()->subMonths(8)->toDateString()]);   // inadimplente do ano passado
                    return;
                }
                $guias->baixar($guia->refresh(), today()->subMonths(8)->subDays($i)->toDateString(), $guia->valor_centavos, $this->comprovante(), $this->usuario->id);
            });
        }

        // Exercício atual: mistura de pagas, vencidas, com segunda via e em aberto.
        $emitidas = Guia::query()->where('situacao', 'emitida')->where('exercicio', $ano)->orderBy('id')->get();
        foreach ($emitidas as $i => $guia) {
            $this->tentar("guia #{$guia->id}", function () use ($guias, $guia, $i): void {
                match ($i % 5) {
                    0, 1 => $guias->baixar($guia, today()->subDays(2 + $i % 25)->toDateString(), $guia->valor_centavos, $this->comprovante(), $this->usuario->id),
                    2 => $guia->update(['vencimento' => today()->subDays(8 + $i % 40)->toDateString()]),
                    3 => $guias->segundaVia($guia),
                    default => null,
                };
            });
        }
    }

    protected function comprovante(): string
    {
        $caminho = "cemiterios/{$this->tenantId}/comprovantes-demo/comprovante-" . uniqid() . '.txt';
        Storage::disk('local')->put($caminho, 'Comprovante de pagamento (dados de demonstração).');

        return $caminho;
    }

    // ------------------------------------------------------------- empreiteiros

    protected function criarEmpreiteiros(): void
    {
        $service = app(EmpreiteiroService::class);
        $hoje = CarbonImmutable::today();

        // [nome, responsável técnico, validade do alvará em dias (null = sem alvará), penalidades]
        $linhas = [
            ['Marmoraria e Construtora Santa Cruz Ltda', 'Eng. Paulo Roberto Dutra', 240, []],
            ['Granitos Araucária Ltda', 'Eng. Marta Helena Campos', 90, []],
            ['Jazigos & Cia Construções Ltda', 'Téc. Edison Prado', -30, []],
            ['Pedra Viva Marmoraria Ltda', 'Eng. Luís Gustavo Brandt', 150, [['suspensao', -5, 25]]],
            ['Obras Fúnebres Irmãos Rocha Ltda', 'Eng. Antônio Rocha', 200, [['suspensao', -200, -170], ['suspensao', -10, 20]]],
        ];

        $empreiteiros = [];
        foreach ($linhas as $i => [$nome, $rt, $dias, $penas]) {
            $empreiteiro = Empreiteiro::create([
                'nome' => $nome,
                'tipo_doc' => 'cnpj',
                'documento' => $this->gerarCnpj(77410000 + $i * 51233),
                'responsavel_tecnico' => $rt,
                'contatos' => sprintf('(41) 3699-%04d', 2200 + $i * 111),
            ]);
            $empreiteiro->alvaras()->create(['numero' => sprintf('ALV-%d/%04d', $hoje->year, 70 + $i), 'validade' => $hoje->addDays($dias)->toDateString()]);

            foreach ($penas as [$tipo, $inicioDias, $fimDias]) {
                $service->penalizar($empreiteiro->refresh(), [
                    'tipo' => $tipo,
                    'inicio' => $hoje->addDays($inicioDias)->toDateString(),
                    'fim' => $hoje->addDays($fimDias)->toDateString(),
                    'motivo' => 'Obra executada fora das dimensões autorizadas e sem sinalização.',
                ]);
            }

            $empreiteiros[] = $service->atualizarAptidao($empreiteiro->refresh());
        }

        // Obras: os dois primeiros (aptos) recebem obras em andamento, atrasadas e concluídas.
        $jazigos = array_values(array_filter($this->jazigosAtivos, fn (Jazigo $j): bool => $j->refresh()->concessaoVigente() !== null));
        $k = 0;
        foreach ([0, 1] as $e) {
            foreach ([['pendente', 25], ['pendente', 40], ['concluida', -50], ['concluida', -120], ['pendente', -12]] as [$situacao, $prazoDias]) {
                $jazigo = $jazigos[$k++ % max(count($jazigos), 1)] ?? null;
                if ($jazigo === null) {
                    continue;
                }
                $this->tentar("obra {$empreiteiros[$e]->nome}", function () use ($service, $empreiteiros, $e, $jazigo, $situacao, $prazoDias, $k): void {
                    $obra = $service->emitirObra($empreiteiros[$e]->refresh(), [
                        'plot_id' => $jazigo->id,
                        'descricao' => ['Construção de jazigo em granito', 'Reforma e troca de tampa', 'Pintura e gravação de lápide', 'Revestimento em mármore'][$k % 4],
                        'comprimento_m' => 2.4 - ($k % 3) * 0.2,
                        'largura_m' => 1.1 + ($k % 2) * 0.1,
                        'prazo_fim' => CarbonImmutable::today()->addDays($prazoDias)->toDateString(),
                    ]);
                    if ($situacao === 'concluida') {
                        $obra->update(['situacao' => 'concluida']);
                    }
                });
            }
        }

        // Sinaliza as obras pendentes com prazo vencido e reavalia a aptidão de todos.
        $service->rotinaDiaria();
    }

    // ---------------------------------------------------------------- vistorias

    protected function criarVistorias(): void
    {
        $estados = [['bom', 'baixo'], ['regular', 'baixo'], ['regular', 'medio'], ['ruim', 'medio'], ['ruim', 'alto']];
        $obs = [
            'bom' => 'Jazigo bem conservado, pintura em dia.',
            'regular' => 'Pequenos desgastes na pintura e no rejunte; sem risco.',
            'ruim' => 'Trincas visíveis na laje e infiltração; recomenda-se reparo em breve.',
        ];

        foreach (array_slice($this->jazigosAtivos, 0, 22) as $i => $jazigo) {
            [$estado, $risco] = $estados[$i % count($estados)];
            $this->tentar("vistoria {$jazigo->codigo}", fn () => $this->registrarVistoria(
                $jazigo,
                $estado,
                $risco,
                ($obs[$estado] ?? '') . ' (dados de demonstração)',
                CarbonImmutable::today()->subDays(7 + $i * 9)->toDateString(),
            ));
        }
    }

    protected function registrarVistoria(Jazigo $jazigo, string $estado, string $risco, string $observacoes, ?string $data = null): Vistoria
    {
        $vistoria = Vistoria::create([
            'plot_id' => $jazigo->id,
            'vistoriador_id' => $this->usuario->id,
            'data' => $data ?? CarbonImmutable::today()->subDays(4)->toDateString(),
            'estado_conservacao' => $estado,
            'risco' => $risco,
            'observacoes' => $observacoes,
        ]);

        $caminho = "cemiterios/{$this->tenantId}/vistorias/demo-{$jazigo->id}-{$vistoria->id}.jpg";
        Storage::disk('local')->put($caminho, base64_decode('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMDAwMDAwMDAwMEBAMEBQYFBQUFBgcHBgcJCQoKCQoKCgsMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM/9sAQwEDBAQFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQX/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhADEAAAAX8H/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB//9k='));
        FotoVistoria::create(['inspection_id' => $vistoria->id, 'arquivo' => $caminho, 'capturada_em' => CarbonImmutable::parse($vistoria->data)->setTime(10, 15)]);

        return $vistoria;
    }

    // ---------------------------------------------------------------- helpers

    protected function titular(int $i, bool $semEmail): Concessionario
    {
        // Quem fica sem e-mail: os índices 12+ (ver criarConcessionarios). Com $semEmail, escolhe só desses.
        $base = $semEmail ? 12 + $i % 18 : $i % 30;

        return $this->concessionarios[$base];
    }

    protected function nomeFalecido(int $n): string
    {
        return self::PRIMEIROS[($n * 7) % count(self::PRIMEIROS)] . ' ' . self::SOBRENOMES[($n * 13 + 1) % count(self::SOBRENOMES)] . ' ' . self::SOBRENOMES[($n * 17 + 5) % count(self::SOBRENOMES)];
    }

    protected function gerarCpf(int $base): string
    {
        $d = str_split(str_pad((string) ($base % 1000000000), 9, '0', STR_PAD_LEFT));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($d as $i => $n) {
                $soma += (int) $n * ($peso - $i);
            }
            $resto = ($soma * 10) % 11;
            $d[] = (string) ($resto === 10 ? 0 : $resto);
        }

        return implode('', $d);
    }

    protected function gerarCnpj(int $base): string
    {
        $d = str_split(str_pad((string) ($base % 100000000), 8, '0', STR_PAD_LEFT) . '0001');
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += (int) $d[$i] * $peso;
            }
            $resto = $soma % 11;
            $d[] = (string) ($resto < 2 ? 0 : 11 - $resto);
        }

        return implode('', $d);
    }

    /**
     * Executa um bloco e, se uma regra de negócio ou de concorrência o recusar, registra um aviso
     * em vez de derrubar a execução inteira (a falha fica restrita ao savepoint do Service).
     */
    protected function tentar(string $descricao, callable $acao): void
    {
        try {
            $acao();
        } catch (Throwable $e) {
            $this->avisos[] = "{$descricao}: " . class_basename($e) . ' — ' . mb_strimwidth($e->getMessage(), 0, 160, '…');
        }
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    protected function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
