<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Multiprofissional\Models\Acompanhado;
use Modules\Multiprofissional\Models\Cargo;
use Modules\Multiprofissional\Models\Condicao;
use Modules\Multiprofissional\Models\Equipe;
use Modules\Multiprofissional\Models\Profissional;
use Modules\Multiprofissional\Models\TipoAtendimento;
use Modules\Multiprofissional\Services\AcompanhadoService;
use Modules\Multiprofissional\Services\AtendimentoService;
use Modules\Multiprofissional\Services\CadastroService;
use Modules\Multiprofissional\Services\EquipeService;
use Modules\Multiprofissional\Services\ProfissionalService;

/**
 * Massa de dados de demonstração do Atendimento Multiprofissional:
 *
 *  - os cargos e tipos de atendimento padrão, mais 8 condições com CID;
 *  - 8 profissionais (psicologia, fonoaudiologia, assistência social, psicopedagogia, terapia
 *    ocupacional e pedagogia), cada um ligado a uma pessoa do Cadastro Único;
 *  - 2 equipes, com profissionais e escolas atendidas;
 *  - cerca de 30 estudantes acompanhados, com condições, profissionais de referência e observações;
 *  - cerca de 90 atendimentos nos últimos três meses, individuais e em grupo, alguns sigilosos.
 *
 * Tudo passa pelos Services do módulo (CPF validado e resolvido no Cadastro Único, vínculos com
 * tenant, auditoria). Os CPFs são gerados com dígitos verificadores válidos a partir de uma base
 * fixa e os nomes são fictícios; os laudos (arquivos) ficam para a demonstração ao vivo.
 *
 * Uso: php artisan db:seed --force --class='Modules\Multiprofissional\Database\Seeders\MultiprofissionalDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Não roda se o tenant já tiver
 * profissionais cadastrados.
 */
final class MultiprofissionalDadosDemonstracaoSeeder extends Seeder
{
    /** @var list<array{string, string, string|null, string}> nome, cargo, registro, telefone */
    private const PROFISSIONAIS = [
        ['Camila Ferraz Antunes', 'Psicólogo(a)', 'CRP 08/21345', '(41) 99910-0101'],
        ['Rodrigo Menezes Salles', 'Psicólogo(a)', 'CRP 08/19872', '(41) 99910-0102'],
        ['Beatriz Andrade Moura', 'Fonoaudiólogo(a)', 'CRFa 3-14210', '(41) 99910-0103'],
        ['Letícia Prado Cardoso', 'Assistente Social', 'CRESS 11/9087', '(41) 99910-0104'],
        ['Gustavo Henrique Lacerda', 'Assistente Social', 'CRESS 11/8814', '(41) 99910-0105'],
        ['Mariana Tavares Bastos', 'Psicopedagogo(a)', 'ABPp 4421/PR', '(41) 99910-0106'],
        ['Daniela Rezende Cunha', 'Terapeuta Ocupacional', 'CREFITO 8/55120-TO', '(41) 99910-0107'],
        ['Viviane Castro Lima', 'Pedagogo(a)', null, '(41) 99910-0108'],
    ];

    /** @var list<array{string, string}> nome, CID */
    private const CONDICOES = [
        ['Transtorno do Espectro Autista', 'F84.0'],
        ['TDAH — Transtorno de Déficit de Atenção e Hiperatividade', 'F90.0'],
        ['Dislexia', 'F81.0'],
        ['Deficiência intelectual leve', 'F70'],
        ['Transtorno de ansiedade', 'F41.1'],
        ['Deficiência auditiva', 'H90'],
        ['Transtorno opositivo-desafiador', 'F91.3'],
        ['Atraso no desenvolvimento da linguagem', 'F80.1'],
    ];

    private const RELATOS = [
        'Atendimento individual para escuta e observação do comportamento em sala. O estudante participou das atividades propostas.',
        'Orientação à professora sobre adaptações das atividades e organização da rotina da turma.',
        'Conversa com a família sobre os encaminhamentos combinados e o acompanhamento em casa.',
        'Observação em sala durante a aula de língua portuguesa; registrada dificuldade de atenção nos momentos de leitura.',
        'Atendimento em grupo com atividades de socialização e regulação emocional.',
        'Avaliação da linguagem oral com material lúdico; indicada continuidade do acompanhamento.',
        'Devolutiva à equipe pedagógica com as estratégias sugeridas para o próximo trimestre.',
        'Visita à família para conhecer a rotina do estudante e reforçar a importância da frequência.',
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Multiprofissional.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('multi_profissionais')->where('tenant_id', $tenant->id)->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem profissionais do Multiprofissional — nada a fazer.");
            return;
        }

        $escolas = DB::table('escola_turmas')->where('tenant_id', $tenant->id)->whereNull('deleted_at')->distinct()->orderBy('escola_id')->pluck('escola_id')->map(fn ($id): int => (int) $id)->all();
        if ($escolas === []) {
            $this->informar('Não há escolas com turmas — execute antes o EscolaDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $totais = ['profissionais' => 0, 'equipes' => 0, 'acompanhados' => 0, 'atendimentos' => 0];

        DB::transaction(function () use ($escolas, $usuario, &$totais): void {
            $this->semear($escolas, $usuario, $totais);
        });

        $this->informar(sprintf(
            'Multiprofissional de demonstração criado no tenant [%d] %s: %d profissionais, %d equipes, %d estudantes acompanhados e %d atendimentos.',
            $tenant->id, $tenant->name, $totais['profissionais'], $totais['equipes'], $totais['acompanhados'], $totais['atendimentos'],
        ));
    }

    /**
     * @param list<int> $escolas
     * @param array<string, int> $totais
     */
    private function semear(array $escolas, User $usuario, array &$totais): void
    {
        app(CadastroService::class)->carregarPadroes();
        $condicoes = [];
        foreach (self::CONDICOES as [$nome, $cid]) {
            $condicoes[] = (int) app(CadastroService::class)->salvar('condicoes', null, ['nome' => $nome, 'cid' => $cid, 'ativo' => true])->getKey();
        }
        $tipos = TipoAtendimento::query()->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $cargos = Cargo::query()->pluck('id', 'nome')->all();

        $profissionais = [];
        foreach (self::PROFISSIONAIS as $i => [$nome, $cargo, $registro, $telefone]) {
            $profissionais[] = (int) app(ProfissionalService::class)->salvar(null, [
                'cpf' => $this->gerarCpf(713400000 + $i * 8123457),
                'nome' => $nome,
                'cargo_id' => (int) $cargos[$cargo],
                'registro_profissional' => $registro,
                'telefone' => $telefone,
                'ativo' => true,
            ])->getKey();
            $totais['profissionais']++;
        }

        // Duas equipes: cada uma com metade dos profissionais e metade das escolas.
        $meioEscolas = max(1, intdiv(count($escolas), 2));
        $equipes = [
            app(EquipeService::class)->salvar(null, ['nome' => 'Equipe Multiprofissional Norte', 'turno' => 'manha', 'profissionais' => array_slice($profissionais, 0, 4), 'escolas' => array_slice($escolas, 0, $meioEscolas)]),
            app(EquipeService::class)->salvar(null, ['nome' => 'Equipe Multiprofissional Sul', 'turno' => 'tarde', 'profissionais' => array_slice($profissionais, 4), 'escolas' => array_slice($escolas, $meioEscolas) ?: $escolas]),
        ];
        $totais['equipes'] = count($equipes);

        $estudantes = DB::table('escola_alunos as a')->join('escola_turmas as t', 't.id', '=', 'a.turma_id')
            ->whereNull('a.deleted_at')->where('a.situacao', '!=', 'transferido')
            ->orderBy('a.id')->get(['a.id', 't.escola_id']);
        $acompanhados = [];
        foreach ($estudantes->filter(fn ($e, $k): bool => $k % 13 === 4)->take(30)->values() as $i => $estudante) {
            $acompanhado = app(AcompanhadoService::class)->salvar(null, [
                'aluno_id' => (int) $estudante->id,
                'observacoes' => $i % 3 === 0 ? 'Família colaborativa; acompanha as orientações e comparece às reuniões.' : 'Necessita de apoio na organização das atividades e de rotina previsível.',
                'ativo' => $i % 10 !== 9,
                'condicoes' => [
                    ['id' => $condicoes[$i % count($condicoes)], 'diagnosticado_em' => CarbonImmutable::today()->subMonths(6 + $i % 30)->toDateString()],
                    ...($i % 4 === 0 ? [['id' => $condicoes[($i + 3) % count($condicoes)], 'diagnosticado_em' => null]] : []),
                ],
                'profissionais' => [
                    ['id' => $profissionais[$i % count($profissionais)], 'papel' => 'Referência'],
                    ['id' => $profissionais[($i + 3) % count($profissionais)], 'papel' => 'Apoio'],
                ],
            ], $usuario);
            $acompanhados[] = ['aluno' => (int) $estudante->id, 'escola' => (int) $estudante->escola_id, 'profissionais' => [$profissionais[$i % count($profissionais)], $profissionais[($i + 3) % count($profissionais)]], 'equipe' => $equipes[$i % 2]->id];
            $totais['acompanhados']++;
        }

        $hoje = CarbonImmutable::today();
        for ($n = 0; $n < 90; $n++) {
            $a = $acompanhados[$n % count($acompanhados)];
            $dia = $hoje->subDays(1 + intdiv($n * 90, 90));
            while ($dia->isWeekend()) {
                $dia = $dia->subDay();
            }
            $emGrupo = $n % 9 === 0 && count($acompanhados) > 2;
            $alunos = $emGrupo ? [$a['aluno'], $acompanhados[($n + 1) % count($acompanhados)]['aluno']] : [$a['aluno']];
            app(AtendimentoService::class)->salvar(null, [
                'data_hora' => $dia->setTime(8 + $n % 8, [0, 30][$n % 2])->format('Y-m-d H:i:s'),
                'turno' => $n % 8 < 4 ? 'manha' : 'tarde',
                'escola_id' => $a['escola'],
                'equipe_id' => $a['equipe'],
                'relato' => self::RELATOS[$n % count(self::RELATOS)],
                'sigiloso' => $n % 6 === 0,
                'alunos' => array_values(array_unique($alunos)),
                'profissionais' => $a['profissionais'],
                'tipos' => [$tipos[$n % count($tipos)], ...($emGrupo ? [$tipos[2 % count($tipos)]] : [])],
            ], $usuario);
            $totais['atendimentos']++;
        }
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

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
