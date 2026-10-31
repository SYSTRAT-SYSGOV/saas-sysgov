<?php

declare(strict_types=1);

namespace Modules\Transporte\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Models\Empresa;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Models\Parada;
use Modules\Transporte\Models\Rota;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Services\AlocacaoService;
use Modules\Transporte\Services\EmpresaService;
use Modules\Transporte\Services\ItinerarioService;
use Modules\Transporte\Services\MotoristaService;
use Modules\Transporte\Services\ParadaService;
use Modules\Transporte\Services\RotaService;
use Modules\Transporte\Services\VeiculoService;
use Modules\Transporte\Services\VistoriaService;

/**
 * Massa de dados de demonstração do módulo Transporte: empresas (prestadora, locadora e uma com contrato perto de
 * vencer), motoristas, cinco veículos (próprio, locado, terceirizado) com vistorias vigentes, a vencer e vencida,
 * paradas georreferenciadas na região de Curitiba, quatro rotas com itinerário e alunos alocados de modo que o painel
 * mostre rotas verde, amarela e vermelha (esta, por exceção de capacidade autorizada).
 *
 * Tudo passa pelos Services do módulo (capacidade, elegibilidade, acessibilidade, auditoria). Documentos e nomes são
 * fictícios. NÃO cria usuário nenhum nem senha.
 *
 * Uso: php artisan db:seed --force --class='Modules\Transporte\Database\Seeders\TransporteDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Não roda se o tenant já tiver rotas.
 */
final class TransporteDadosDemonstracaoSeeder extends Seeder
{
    /** @var list<array{string, float|null, float|null, string, string}> nome, latitude, longitude, logradouro, bairro */
    private const PARADAS = [
        ['Praça da Matriz', -25.4284, -49.2733, 'Rua XV de Novembro', 'Centro'],
        ['Ponte do Rio Iraí', -25.4021, -49.1847, 'Estrada do Iraí', 'Zona Rural'],
        ['Escola Rural Boa Vista', -25.3876, -49.2210, 'Estrada da Boa Vista', 'Boa Vista'],
        ['Cruzamento da Linha 4', -25.3702, -49.2491, 'Linha 4', 'Zona Rural'],
        ['Armazém do Seu João', -25.3555, -49.2733, 'Estrada Velha', 'Colônia Leste'],
        ['Igreja São Pedro', -25.4469, -49.3088, 'Rua das Flores', 'São Pedro'],
        ['Posto de Saúde', -25.4552, -49.2917, 'Avenida Brasil', 'Vila Nova'],
        ['Mercadinho Central', -25.4630, -49.3215, 'Rua Paraná', 'Vila Nova'],
        ['Sítio Três Irmãos', -25.5012, -49.2630, 'Estrada do Cerne', 'Distrito Sul'],
        ['Capela Santa Luzia', -25.5190, -49.2475, 'Estrada do Cerne', 'Distrito Sul'],
        ['Porteira da Fazenda Alvorada', -25.3398, -49.3102, 'Estrada Alvorada', 'Vale Verde'],
        ['Curva do Moinho', null, null, 'Estrada do Moinho', 'Vale Verde'],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null ? Tenant::find($tenantId) : Tenant::where('slug', 'systrat')->first();
        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Transporte.', aviso: true);
            return;
        }
        app(TenantContext::class)->set($tenant);

        if (Rota::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem rotas do Transporte — nada a fazer.");
            return;
        }
        $escolas = Escola::query()->where('ativa', true)->orderBy('id')->get();
        if ($escolas->isEmpty()) {
            $this->informar('Não há escolas — execute antes o EscolaDadosDemonstracaoSeeder.', aviso: true);
            return;
        }
        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if ($usuario instanceof User) {
            auth()->setUser($usuario);
        }

        $totais = DB::transaction(fn (): array => $this->semear($escolas));

        $this->informar(
            "Transporte de demonstração criado no tenant [{$tenant->id}] {$tenant->name}: {$totais['empresas']} empresas, {$totais['motoristas']} motoristas, "
            . "{$totais['veiculos']} veículos, {$totais['paradas']} paradas, {$totais['rotas']} rotas e {$totais['alocacoes']} alunos alocados.",
        );
    }

    /**
     * @param \Illuminate\Support\Collection<int, Escola> $escolas
     * @return array<string, int>
     */
    private function semear($escolas): array
    {
        $hoje = CarbonImmutable::today();

        $empresas = app(EmpresaService::class);
        $viacao = $empresas->salvar(null, ['cnpj' => $this->cnpj(1), 'razao_social' => 'Viação Rio Claro Ltda', 'tipo' => 'prestadora', 'contrato_numero' => 'CT-014/2026',
            'vigencia_inicio' => $hoje->subMonths(6)->toDateString(), 'vigencia_fim' => $hoje->addMonths(18)->toDateString()]);
        $locadora = $empresas->salvar(null, ['cnpj' => $this->cnpj(2), 'razao_social' => 'Locadora Serra Azul Ltda', 'tipo' => 'locadora', 'contrato_numero' => 'CT-021/2026',
            'vigencia_inicio' => $hoje->subMonths(3)->toDateString(), 'vigencia_fim' => $hoje->addMonths(9)->toDateString()]);
        $valeVerde = $empresas->salvar(null, ['cnpj' => $this->cnpj(3), 'razao_social' => 'Transportes Vale Verde ME', 'tipo' => 'prestadora', 'contrato_numero' => 'CT-003/2025',
            'vigencia_inicio' => $hoje->subMonths(11)->toDateString(), 'vigencia_fim' => $hoje->addDays(20)->toDateString()]);

        $motoristas = app(MotoristaService::class);
        $dadosMotorista = fn (int $n, string $nome, int $anos, string $cnhValidade, ?int $empresaId = null): array => [
            'cpf' => $this->cpf($n), 'nome' => $nome, 'data_nascimento' => $hoje->subYears($anos)->subDays(40)->toDateString(),
            'empresa_id' => $empresaId, 'cnh_numero' => sprintf('DEMO%07d', $n), 'cnh_categoria' => 'D', 'cnh_primeira_habilitacao' => $hoje->subYears($anos - 22)->toDateString(),
            'cnh_validade' => $cnhValidade, 'curso_certificado' => sprintf('CURSO-%04d', $n), 'curso_validade' => $hoje->addMonths(14)->toDateString(),
            'toxicologico_data' => $hoje->subMonths(8)->toDateString(), 'toxicologico_validade' => $hoje->addMonths(28)->toDateString(),
        ];
        $m1 = $motoristas->salvar(null, $dadosMotorista(1, 'Antônio Pereira', 48, $hoje->addYears(3)->toDateString()));
        $m2 = $motoristas->salvar(null, $dadosMotorista(2, 'Marcos Teixeira', 41, $hoje->addDays(15)->toDateString()));
        $m3 = $motoristas->salvar(null, $dadosMotorista(3, 'Valdir Santos', 52, $hoje->addYears(2)->toDateString(), $viacao->id));
        $m4 = $motoristas->salvar(null, $dadosMotorista(4, 'Edson Ribeiro', 37, $hoje->addYears(4)->toDateString(), $valeVerde->id));

        $veiculos = app(VeiculoService::class);
        $vistorias = app(VistoriaService::class);
        $novo = function (array $dados, string $validade) use ($veiculos, $vistorias, $hoje) {
            $v = $veiculos->salvar(null, ['uso_exclusivo' => true, 'tipo_rede' => 'rural', ...$dados]);
            $vistorias->registrar($v, ['data_vistoria' => $hoje->subMonths(5)->toDateString(), 'certificado' => 'VST-' . $v->placa, 'validade' => $validade]);

            return $v;
        };
        $v1 = $novo(['origem' => 'propria', 'descricao' => 'Ônibus escolar 01', 'placa' => 'DEM1A01', 'capacidade' => 44, 'tipologia_inep' => 3, 'acessivel' => true, 'marca_modelo' => 'Mercedes OF-1519'], $hoje->addMonths(4)->toDateString());
        $v2 = $novo(['origem' => 'propria', 'descricao' => 'Van escolar 02', 'placa' => 'DEM1A02', 'capacidade' => 15, 'tipologia_inep' => 1, 'tipo_rede' => 'urbana', 'marca_modelo' => 'Renault Master'], $hoje->addDays(20)->toDateString());
        $v3 = $novo(['origem' => 'locada', 'empresa_id' => $locadora->id, 'descricao' => 'Microônibus locado 03', 'placa' => 'DEM1A03', 'capacidade' => 25, 'tipologia_inep' => 2, 'tipo_rede' => 'mista'], $hoje->addMonths(3)->toDateString());
        $v4 = $novo(['origem' => 'terceirizada', 'empresa_id' => $viacao->id, 'descricao' => 'Ônibus terceirizado 04', 'placa' => 'DEM1A04', 'capacidade' => 46, 'tipologia_inep' => 3], $hoje->addMonths(5)->toDateString());
        $novo(['origem' => 'propria', 'descricao' => 'Kombi 05 (vistoria vencida)', 'placa' => 'DEM1A05', 'capacidade' => 9, 'tipologia_inep' => 1], $hoje->subDays(5)->toDateString());

        $paradas = collect(self::PARADAS)->map(fn (array $p): Parada => app(ParadaService::class)->salvar(null, [
            'nome' => $p[0], 'latitude' => $p[1], 'longitude' => $p[2], 'logradouro' => $p[3], 'bairro' => $p[4], 'cidade' => 'Curitiba', 'uf' => 'PR', 'ativa' => true,
        ]));

        $anoLetivo = $this->anoLetivo();
        $alunos = Aluno::query()->withoutGlobalScope('escola')->with('turma')->where('situacao', 'ativo')
            ->whereHas('turma', fn ($q) => $q->where('ano_letivo', $anoLetivo))->orderBy('id')->get();

        $rotas = app(RotaService::class);
        $itinerario = app(ItinerarioService::class);
        $alocacoes = app(AlocacaoService::class);
        $fila = $alunos->all();
        $alocados = 0;

        $e = fn (int $i): Escola => $escolas[min($i, $escolas->count() - 1)];
        /** @var list<array{nome: string, escola: Escola, turno: string, rede: string, veiculo: Veiculo, motorista: Motorista, empresa: Empresa|null, km: array{float, float}, paradas: list<int>, alunos: int, extra: int}> $plano */
        $plano = [
            ['nome' => 'Rota Rural Norte', 'escola' => $e(0), 'turno' => 'manha', 'rede' => 'rural', 'veiculo' => $v1, 'motorista' => $m1, 'empresa' => null, 'km' => [18.5, 9.2], 'paradas' => [1, 2, 3, 4], 'alunos' => 22, 'extra' => 0],
            ['nome' => 'Rota Distrito Sul', 'escola' => $e(1), 'turno' => 'tarde', 'rede' => 'urbana', 'veiculo' => $v2, 'motorista' => $m2, 'empresa' => null, 'km' => [14.0, 0.0], 'paradas' => [5, 6, 7, 8], 'alunos' => 15, 'extra' => 0],
            ['nome' => 'Rota Colônia Leste', 'escola' => $e(0), 'turno' => 'manha', 'rede' => 'mista', 'veiculo' => $v3, 'motorista' => $m3, 'empresa' => $locadora, 'km' => [10.3, 15.6], 'paradas' => [9, 10, 11, 0], 'alunos' => 25, 'extra' => 3],
            ['nome' => 'Rota Vale Verde', 'escola' => $e(2), 'turno' => 'manha', 'rede' => 'rural', 'veiculo' => $v4, 'motorista' => $m4, 'empresa' => $viacao, 'km' => [22.0, 11.8], 'paradas' => [1, 3, 5, 11], 'alunos' => 6, 'extra' => 0],
        ];

        foreach ($plano as $p) {
            $turno = $p['turno'];
            $rede = $p['rede'];
            $rota = $rotas->salvar(null, [
                'escola_id' => $p['escola']->id, 'ano_letivo' => $anoLetivo, 'empresa_id' => $p['empresa']?->id, 'veiculo_id' => $p['veiculo']->id, 'motorista_id' => $p['motorista']->id,
                'nome' => $p['nome'], 'turno' => $turno, 'tipo_rede' => $rede, 'km_pavimentado' => $p['km'][0], 'km_nao_pavimentado' => $p['km'][1],
                'horario_saida' => $turno === 'manha' ? '06:10' : '11:40', 'horario_chegada' => $turno === 'manha' ? '07:15' : '12:45', 'horario_retorno' => $turno === 'manha' ? '12:30' : '17:50',
                'ativa' => true,
            ]);
            $doItinerario = [];
            foreach ($p['paradas'] as $ordem => $i) {
                $parada = $paradas[$i];
                $itinerario->adicionar($rota, $parada->id, ['embarque_previsto' => sprintf('%02d:%02d', $turno === 'manha' ? 6 : 11, 15 + 10 * $ordem)]);
                $doItinerario[] = $parada->id;
            }
            foreach (range(0, $p['alunos'] + $p['extra'] - 1) as $k) {
                $aluno = array_shift($fila);
                if ($aluno === null) {
                    break;
                }
                $dentro = $k < $p['alunos'];
                $alocacoes->alocar($rota, $aluno, [
                    'parada_id' => $doItinerario[$k % count($doItinerario)],
                    'poder_publico' => 2,
                    'usa_transporte_rural' => $rede !== 'urbana',
                    'justificativa_excesso' => $dentro ? null : 'Único transporte disponível durante a reforma da van da rota vizinha.',
                ], !$dentro);
                $alocados++;
            }
        }

        return ['empresas' => 3, 'motoristas' => 4, 'veiculos' => 5, 'paradas' => $paradas->count(), 'rotas' => count($plano), 'alocacoes' => $alocados];
    }

    /** Ano letivo mais recente entre as turmas dos alunos ativos; sem turmas, o ano corrente. */
    private function anoLetivo(): int
    {
        $ano = DB::table('escola_turmas')->where('tenant_id', app(TenantContext::class)->id())->whereNull('deleted_at')->max('ano_letivo');

        return $ano !== null ? (int) $ano : (int) now()->year;
    }

    /** CPF válido e fictício (faixa 900.000.xxx), determinístico a partir de um número. */
    private function cpf(int $n): string
    {
        $d = array_map('intval', str_split(str_pad((string) (900000000 + $n), 9, '0', STR_PAD_LEFT)));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($d as $i => $v) {
                $soma += $v * ($peso - $i);
            }
            $resto = ($soma * 10) % 11;
            $d[] = $resto === 10 ? 0 : $resto;
        }

        return implode('', $d);
    }

    /** CNPJ válido e fictício, determinístico a partir de um número. */
    private function cnpj(int $n): string
    {
        $d = array_map('intval', str_split('99000' . str_pad((string) $n, 3, '0', STR_PAD_LEFT) . str_pad((string) $n, 4, '0', STR_PAD_LEFT)));
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += $d[$i] * $peso;
            }
            $resto = $soma % 11;
            $d[] = $resto < 2 ? 0 : 11 - $resto;
        }

        return implode('', $d);
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
