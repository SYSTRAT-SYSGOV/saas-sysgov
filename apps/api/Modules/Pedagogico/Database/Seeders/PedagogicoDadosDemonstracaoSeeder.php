<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Modules\Pedagogico\Enums\StatusAta;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Services\AtaService;
use Modules\Pedagogico\Services\CronogramaService;
use Modules\Pedagogico\Services\FrequenciaService;
use Modules\Pedagogico\Services\NotaService;
use Modules\Pedagogico\Services\OcorrenciaService;
use Modules\Pedagogico\Services\PreConselhoService;

/**
 * Massa de dados de demonstração do Acompanhamento Pedagógico, para cada escola que tem turmas:
 *
 *  - cronograma dos três trimestres (as mesmas datas do ano letivo da escola);
 *  - notas dos dois primeiros trimestres em todas as matérias (com recuperação para quem ficou
 *    abaixo da média) e do trimestre em curso nas três primeiras matérias de cada turma;
 *  - frequência dos últimos dias letivos, com presenças, faltas e faltas justificadas;
 *  - ocorrências disciplinares e elogios, em todas as severidades;
 *  - fichas de pré-conselho do 2º trimestre (duas matérias por turma), com alunos em atenção;
 *  - atas de conselho: 1º e 2º trimestres finalizadas (a do 1º arquivada) e a do 3º em rascunho.
 *
 * Tudo passa pelos Services do módulo (turma do aluno, datas no ano letivo, transições de ata,
 * auditoria). Nomes de direção, pedagogia e secretaria são fictícios; nenhum anexo é criado.
 *
 * Uso: php artisan db:seed --force --class='Modules\Pedagogico\Database\Seeders\PedagogicoDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Não roda se o tenant já tiver notas
 * ou frequências lançadas.
 */
final class PedagogicoDadosDemonstracaoSeeder extends Seeder
{
    private const DIRECAO = ['Marta Helena Souza', 'Roberto Alves Pinto', 'Cláudia Regina Matos', 'Paulo César Duarte', 'Ivone Beatriz Lima', 'Sérgio Luiz Nunes'];

    private const PEDAGOGIA = ['Juliana Prado Moreira', 'Patrícia Gomes Ramos', 'Elisa Cristina Rocha', 'Tatiane Borges Dias', 'Aline Teixeira Cunha', 'Renata Vieira Lopes'];

    private const SECRETARIA = ['Neusa Maria Campos', 'Adriana Pacheco Reis', 'Sueli Aparecida Faria', 'Rosana Siqueira Melo', 'Vera Lúcia Barros', 'Luzia Freitas Neves'];

    private const OCORRENCIAS = [
        ['alta', 'Discussão com colega durante o intervalo, com empurrões; famílias comunicadas.'],
        ['media', 'Uso de celular durante a aula, mesmo após o aviso do professor.'],
        ['baixa', 'Esqueceu o material pela terceira vez no mês; bilhete enviado à família.'],
        ['media', 'Saiu da sala sem autorização e ficou no pátio.'],
        ['critica', 'Dano ao patrimônio escolar (carteira e porta do banheiro); direção convocou os responsáveis.'],
        ['baixa', 'Atraso recorrente na entrada, sem justificativa.'],
        ['baixa', 'Destaque na turma: ajudou colegas com a atividade de leitura e foi elogiado em sala.'],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Pedagógico.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('pedagogico_notas')->where('tenant_id', $tenant->id)->exists() || DB::table('pedagogico_frequencias')->where('tenant_id', $tenant->id)->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem lançamentos pedagógicos — nada a fazer.");
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

        $totais = ['cronogramas' => 0, 'notas' => 0, 'frequencias' => 0, 'ocorrencias' => 0, 'pre_conselhos' => 0, 'atas' => 0];

        DB::transaction(function () use ($escolasIds, $usuario, &$totais): void {
            foreach ($escolasIds as $indice => $escolaId) {
                app(EscolaContext::class)->set(Escola::query()->findOrFail($escolaId));
                $this->semearEscola((int) $escolaId, $indice, $usuario, $totais);
            }
        });

        app(EscolaContext::class)->clear();

        $this->informar(sprintf(
            'Pedagógico de demonstração criado no tenant [%d] %s: %d cronogramas, %d notas, %d frequências, %d ocorrências, %d fichas de pré-conselho e %d atas.',
            $tenant->id, $tenant->name, $totais['cronogramas'], $totais['notas'], $totais['frequencias'], $totais['ocorrencias'], $totais['pre_conselhos'], $totais['atas'],
        ));
    }

    /** @param array<string, int> $totais */
    private function semearEscola(int $escolaId, int $indice, User $usuario, array &$totais): void
    {
        $trimestres = DB::table('escola_trimestres')->where('escola_id', $escolaId)->orderBy('numero')->get(['numero', 'ano_letivo', 'data_inicio', 'data_fim']);
        foreach ($trimestres as $t) {
            app(CronogramaService::class)->criar([
                'ano_letivo' => (int) $t->ano_letivo, 'periodo' => (int) $t->numero,
                'data_inicio' => substr((string) $t->data_inicio, 0, 10), 'data_fim' => substr((string) $t->data_fim, 0, 10),
            ]);
            $totais['cronogramas']++;
        }

        $categorias = DB::table('escola_categorias_ocorrencia')->where('escola_id', $escolaId)->orderBy('id')->pluck('id')->all();
        $turmas = DB::table('escola_turmas')->where('escola_id', $escolaId)->whereNull('deleted_at')->orderBy('id')->get(['id', 'nome', 'ano_letivo']);

        foreach ($turmas as $n => $turma) {
            $ano = (int) $turma->ano_letivo;
            $alunos = DB::table('escola_alunos')->where('turma_id', $turma->id)->where('situacao', '!=', 'transferido')->whereNull('deleted_at')->orderBy('id')->pluck('id')->all();
            $materias = DB::table('escola_turma_materias as tm')->join('escola_materias as m', 'm.id', '=', 'tm.materia_id')
                ->where('tm.turma_id', $turma->id)->orderBy('m.id')->get(['m.id', 'm.nome']);
            if ($alunos === [] || $materias->isEmpty()) {
                continue;
            }

            $this->lancarNotas((int) $turma->id, $ano, $alunos, $materias->pluck('id')->map(fn ($id): int => (int) $id)->all(), $usuario, $totais);
            $this->registrarFrequencia((int) $turma->id, $alunos, $usuario, $totais);
            $this->registrarOcorrencias($alunos, $categorias, $usuario, $totais);
            $this->criarPreConselhos((int) $turma->id, $ano, $alunos, $materias->take(2)->pluck('id')->map(fn ($id): int => (int) $id)->all(), $usuario, $totais);
            $this->criarAtas((int) $turma->id, $ano, $indice + $n, $alunos, $usuario, $totais);
        }
    }

    /**
     * @param list<int> $alunos
     * @param list<int> $materias
     * @param array<string, int> $totais
     */
    private function lancarNotas(int $turmaId, int $ano, array $alunos, array $materias, User $usuario, array &$totais): void
    {
        $servico = app(NotaService::class);
        foreach ($materias as $m => $materiaId) {
            foreach ([1, 2, 3] as $trimestre) {
                if ($trimestre === 3 && $m >= 3) {
                    continue;
                }
                $notas = [];
                foreach ($alunos as $i => $alunoId) {
                    $base = 4.5 + (($i * 7 + $m * 5 + $trimestre * 3) % 11) / 2;
                    $nota = min(10.0, $base);
                    $linha = ['aluno_id' => $alunoId, 'nota' => $nota];
                    if ($trimestre < 3 && $nota < 6.0) {
                        $linha['nota_recuperacao'] = 5.0 + (($i + $m) % 7) / 2;
                    }
                    $notas[] = $linha;
                }
                $servico->lancar($turmaId, $materiaId, $ano, $trimestre, $notas, $usuario);
                $totais['notas'] += count($notas);
            }
        }
    }

    /**
     * @param list<int> $alunos
     * @param array<string, int> $totais
     */
    private function registrarFrequencia(int $turmaId, array $alunos, User $usuario, array &$totais): void
    {
        $dia = CarbonImmutable::today();
        $registrados = 0;
        while ($registrados < 10) {
            $dia = $dia->subDay();
            if ($dia->isWeekend()) {
                continue;
            }
            $registros = [];
            foreach ($alunos as $i => $alunoId) {
                $r = ($i * 5 + $registrados * 3) % 23;
                $registros[] = [
                    'aluno_id' => $alunoId,
                    'presenca' => $r === 0 ? 'falta' : ($r === 1 ? 'falta_justificada' : 'presente'),
                    'observacao' => $r === 1 ? 'Atestado médico apresentado.' : null,
                ];
            }
            $totais['frequencias'] += app(FrequenciaService::class)->registrar($turmaId, $dia->toDateString(), $registros, $usuario, 4);
            $registrados++;
        }
    }

    /**
     * @param list<int> $alunos
     * @param list<int> $categorias
     * @param array<string, int> $totais
     */
    private function registrarOcorrencias(array $alunos, array $categorias, User $usuario, array &$totais): void
    {
        if ($categorias === []) {
            return;
        }
        $hoje = CarbonImmutable::today();
        foreach ($alunos as $i => $alunoId) {
            if ($i % 6 !== 2) {
                continue;
            }
            [$severidade, $descricao] = self::OCORRENCIAS[$i % count(self::OCORRENCIAS)];
            app(OcorrenciaService::class)->registrar([
                'aluno_id' => $alunoId,
                'categoria_id' => $categorias[$i % count($categorias)],
                'data' => $hoje->subDays(3 + ($i * 4) % 40)->toDateString(),
                'descricao' => $descricao,
                'severidade' => $severidade,
            ], null, $usuario);
            $totais['ocorrencias']++;
        }
    }

    /**
     * @param list<int> $alunos
     * @param list<int> $materias
     * @param array<string, int> $totais
     */
    private function criarPreConselhos(int $turmaId, int $ano, array $alunos, array $materias, User $usuario, array &$totais): void
    {
        foreach ($materias as $m => $materiaId) {
            $emAtencao = [];
            foreach (array_slice($alunos, 0, 5) as $i => $alunoId) {
                $emAtencao[] = [
                    'aluno_id' => $alunoId,
                    'nivel_atencao' => ['alto', 'medio', 'baixo', 'medio', 'alto'][$i],
                    'dificuldade' => $i % 2 === 0 ? 'Dificuldade para acompanhar o ritmo da turma e concluir as atividades.' : 'Oscila entre bons e maus resultados; precisa de rotina de estudo.',
                    'encaminhamentos' => $i % 2 === 0 ? 'Reforço no contraturno e conversa com a família.' : 'Acompanhamento da pedagoga e atividades de retomada.',
                    'destaque' => $i === 3,
                ];
            }
            app(PreConselhoService::class)->salvar([
                'turma_id' => $turmaId, 'materia_id' => $materiaId, 'ano_letivo' => $ano, 'periodo' => 2,
                'data_registro' => CarbonImmutable::create($ano, 8, 20)->toDateString(),
                'desempenho_geral' => ['bom', 'regular', 'excelente', 'bom'][($turmaId + $m) % 4],
                'desempenho_justificativa' => 'A turma cumpriu a maior parte do planejamento do trimestre.',
                'conteudos_trabalhados' => 'Conteúdos previstos para o trimestre, com revisão antes das avaliações.',
                'objetivos_atingidos' => ['sim', 'parcialmente'][($turmaId + $m) % 2],
                'metodologias' => ['Aula expositiva dialogada', 'Trabalho em grupo', 'Atividades práticas'],
                'instrumentos_avaliativos' => ['Prova escrita', 'Trabalho em sala', 'Participação'],
                'instrumentos_adequados' => 'sim',
                'engajamento_nivel' => ['alto', 'medio'][($turmaId + $m) % 2],
                'engajamento_dificuldades' => 'Conversas paralelas em parte da turma.',
                'engajamento_potencialidades' => 'Boa participação nas atividades em grupo.',
                'dificuldades_aprendizagem' => 'Alguns alunos precisam retomar conteúdos do trimestre anterior.',
                'estrategias_superacao' => 'Retomada em sala e atividades de reforço.',
                'socioemocional_status' => 'adequado',
                'socioemocional_descricao' => 'Turma receptiva, sem conflitos relevantes.',
                'obs_pedagogicas' => 'Sugestão de reunião com as famílias dos alunos em atenção alta.',
            ], $emAtencao, $usuario);
            $totais['pre_conselhos']++;
        }
    }

    /**
     * @param list<int> $alunos
     * @param array<string, int> $totais
     */
    private function criarAtas(int $turmaId, int $ano, int $semente, array $alunos, User $usuario, array &$totais): void
    {
        $servico = app(AtaService::class);
        $total = count($alunos);
        foreach ([1, 2, 3] as $periodo) {
            $recuperacao = max(1, intdiv($total, 8) + $periodo % 2);
            $retidos = $periodo === 3 ? 0 : ($semente + $periodo) % 2;
            $reuniao = CarbonImmutable::create($ano, [1 => 5, 2 => 8, 3 => 12][$periodo], [1 => 15, 2 => 28, 3 => 10][$periodo]);
            $ata = $servico->criar([
                'turma_id' => $turmaId, 'ano_letivo' => $ano, 'periodo' => $periodo,
                'data_reuniao' => $reuniao->toDateString(),
                'direcao' => self::DIRECAO[$semente % count(self::DIRECAO)],
                'pedagogia' => self::PEDAGOGIA[$semente % count(self::PEDAGOGIA)],
                'secretaria' => self::SECRETARIA[$semente % count(self::SECRETARIA)],
                'texto_introducao' => 'Em ' . $reuniao->format('d/m/Y') . ", reuniu-se o conselho de classe do {$periodo}º trimestre para analisar o rendimento da turma.",
                'texto_conclusao' => 'Nada mais havendo a tratar, lavrou-se a presente ata, que segue assinada pelos presentes.',
                'deliberacoes' => 'Encaminhar os alunos em recuperação ao reforço no contraturno e convocar as famílias dos casos de maior atenção.',
                'assinaturas' => [self::DIRECAO[$semente % count(self::DIRECAO)], self::PEDAGOGIA[$semente % count(self::PEDAGOGIA)]],
                'aprovados' => $total - $recuperacao - $retidos,
                'recuperacao' => $recuperacao,
                'retidos' => $retidos,
            ], $usuario);
            $totais['atas']++;

            if ($periodo < 3) {
                $ata = $servico->alterarStatus($ata, StatusAta::Finalizada);
            }
            if ($periodo === 1) {
                $servico->alterarStatus($ata, StatusAta::Arquivada);
            }
        }
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        if ($this->command) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
