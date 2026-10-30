<?php

declare(strict_types=1);

namespace Modules\Passeio\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Support\EscolaContext;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Services\FrotaService;
use Modules\Passeio\Services\InscricaoService;
use Modules\Passeio\Services\PasseioService;

/**
 * Massa de dados de demonstração do módulo Passeio: em cada escola que tem turmas, um passeio já
 * concluído e outro agendado; na primeira escola, também um em andamento e um cancelado. Cada passeio
 * inscreve duas turmas, com alunos que não vão, termos de autorização entregues ou pendentes,
 * pagamentos em dia e em aberto, e ônibus/van com os assentos ocupados pelos alunos que vão.
 *
 * Tudo passa pelos Services do módulo (inscrição, assentos, auditoria). Nomes de motoristas, placas e
 * telefones são fictícios.
 *
 * Uso: php artisan db:seed --force --class='Modules\Passeio\Database\Seeders\PasseioDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Não roda se o tenant já tiver passeios.
 */
final class PasseioDadosDemonstracaoSeeder extends Seeder
{
    private const DESTINOS = [
        ['Parque Estadual de Vila Velha', 'Ponta Grossa'],
        ['Museu Paranaense', 'Curitiba'],
        ['Jardim Botânico', 'Curitiba'],
        ['Zoológico Municipal', 'Curitiba'],
        ['Usina de Reciclagem Municipal', 'Araucária'],
        ['Teatro Guaíra', 'Curitiba'],
        ['Fazenda Escola Santa Maria', 'Contenda'],
    ];

    private const RESPONSAVEIS = ['Profa. Helena Duarte', 'Prof. Rafael Nogueira', 'Profa. Sandra Vieira', 'Prof. Carlos Menezes', 'Profa. Fernanda Rocha', 'Prof. João Lima'];

    private const MOTORISTAS = ['Antônio Pereira', 'Marcos Teixeira', 'Valdir Santos', 'Edson Ribeiro', 'Luciano Campos', 'Orlando Freitas'];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Passeio.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('passeio_passeios')->where('tenant_id', $tenant->id)->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem passeios — nada a fazer.");
            return;
        }

        $escolasIds = DB::table('escola_turmas')->where('tenant_id', $tenant->id)->whereNull('deleted_at')->distinct()->orderBy('escola_id')->pluck('escola_id')->all();
        if ($escolasIds === []) {
            $this->informar('Não há escolas com turmas — execute antes o EscolaDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $totais = ['passeios' => 0, 'inscricoes' => 0, 'veiculos' => 0, 'assentos' => 0];

        DB::transaction(function () use ($escolasIds, &$totais): void {
            foreach ($escolasIds as $indice => $escolaId) {
                $escola = Escola::query()->findOrFail($escolaId);
                app(EscolaContext::class)->set($escola);
                $this->semearEscola($escola, $indice, $totais);
            }
        });

        app(EscolaContext::class)->clear();

        $this->informar("Passeios de demonstração criados no tenant [{$tenant->id}] {$tenant->name}: {$totais['passeios']} passeios, {$totais['inscricoes']} inscrições, {$totais['veiculos']} veículos e {$totais['assentos']} assentos ocupados.");
    }

    /** @param array<string, int> $totais */
    private function semearEscola(Escola $escola, int $indice, array &$totais): void
    {
        $turmas = Turma::query()->orderBy('id')->get();
        $hoje = CarbonImmutable::today();

        // [situação final, dias a partir de hoje, quantas turmas inscrever]
        $cenarios = [['concluido', -(25 + 6 * $indice), 2], ['agendado', 12 + 3 * $indice, 2]];
        if ($indice === 0) {
            $cenarios[] = ['em_andamento', 0, 1];
            $cenarios[] = ['cancelado', 20, 0];
        }

        foreach ($cenarios as $k => [$situacao, $dias, $qtdTurmas]) {
            [$destino, $cidade] = self::DESTINOS[($indice + $k) % count(self::DESTINOS)];
            $data = $hoje->addDays($dias);
            $valor = [0, 1500, 2500, 3500][($indice + $k) % 4];

            $passeio = app(PasseioService::class)->criar([
                'nome' => "Visita ao {$destino}",
                'data_passeio' => $data->toDateString(),
                'data_limite_autorizacao' => $data->subDays(5)->toDateString(),
                'horario_saida' => '07:30',
                'horario_retorno' => '16:30',
                'local_saida' => "Portão principal — {$escola->nome}",
                'destino' => $destino,
                'cidade' => $cidade,
                'valor_centavos' => $valor,
                'responsavel' => self::RESPONSAVEIS[($indice + $k) % count(self::RESPONSAVEIS)],
                'observacoes' => 'Levar lanche, garrafa de água e boné. Alunos de uniforme.',
                'status' => 'agendado',
            ]);
            $totais['passeios']++;

            $this->inscrever($passeio, $turmas->take($qtdTurmas), $situacao, $valor, $totais);
            $this->montarFrota($passeio, $indice + $k, $totais);

            if ($situacao !== 'agendado') {
                app(PasseioService::class)->atualizar($passeio, ['status' => $situacao]);
            }
        }
    }

    /**
     * @param iterable<Turma> $turmas
     * @param array<string, int> $totais
     */
    private function inscrever(Passeio $passeio, iterable $turmas, string $situacao, int $valor, array &$totais): void
    {
        $inscricoes = app(InscricaoService::class);
        $passado = $situacao === 'concluido';
        $j = 0;
        foreach ($turmas as $turma) {
            $inscricoes->inscreverTurma($passeio, $turma);
        }

        foreach (Inscricao::query()->where('passeio_id', $passeio->id)->orderBy('id')->get() as $inscricao) {
            $j++;
            $totais['inscricoes']++;
            if ($j % 9 === 0) {
                $inscricoes->atualizar($inscricao, ['vai' => false, 'observacao' => 'Família optou por não participar.']);
                continue;
            }
            $termo = $passado ? $j % 17 !== 0 : $j % 5 !== 0;
            $pago = $termo && $valor > 0 && ($passado ? $j % 13 !== 0 : $j % 3 === 0);
            $inscricoes->atualizar($inscricao, ['vai' => true, 'autorizacao_entregue' => $termo, 'pago' => $pago]);
        }
    }

    /** @param array<string, int> $totais */
    private function montarFrota(Passeio $passeio, int $semente, array &$totais): void
    {
        $vao = Inscricao::query()->where('passeio_id', $passeio->id)->where('vai', true)->orderBy('id')->pluck('aluno_id')->all();
        if ($vao === []) {
            return;
        }

        $frota = app(FrotaService::class);
        $onibus = $frota->criarVeiculo($passeio, [
            'identificacao' => 'Ônibus 01', 'placa' => sprintf('PRD%dA%02d', $semente % 10, 10 + $semente % 80),
            'motorista' => self::MOTORISTAS[$semente % count(self::MOTORISTAS)], 'telefone' => sprintf('(41) 99900-%04d', 1100 + $semente),
            'capacidade' => 46, 'cor' => 'Amarelo',
        ]);
        $van = $frota->criarVeiculo($passeio, [
            'identificacao' => 'Van de apoio', 'placa' => sprintf('PRV%dB%02d', $semente % 10, 20 + $semente % 70),
            'motorista' => self::MOTORISTAS[($semente + 1) % count(self::MOTORISTAS)], 'telefone' => sprintf('(41) 99900-%04d', 2200 + $semente),
            'capacidade' => 15, 'cor' => 'Branco',
        ]);
        $totais['veiculos'] += 2;

        // Cerca de 85% dos que vão já têm assento; os últimos ficam sem, para mostrar o aviso na tela.
        $comAssento = (int) floor(count($vao) * 0.85);
        $numeroOnibus = 1;
        $numeroVan = 1;
        foreach (array_slice($vao, 0, $comAssento) as $alunoId) {
            if ($numeroOnibus <= $onibus->capacidade) {
                $frota->ocupar($onibus, $numeroOnibus++, $alunoId);
            } elseif ($numeroVan <= $van->capacidade) {
                $frota->ocupar($van, $numeroVan++, $alunoId);
            } else {
                break;
            }
            $totais['assentos']++;
        }
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
