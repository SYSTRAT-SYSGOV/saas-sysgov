<?php

declare(strict_types=1);

namespace Modules\Portfolio\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Modules\Portfolio\Services\TrabalhoService;

/**
 * Massa de dados de demonstração do Portfólio do aluno: trabalhos (redações, experimentos, mapas,
 * desenhos, provas práticas) registrados nas matérias de cada turma, com data dentro dos trimestres do
 * ano letivo, descrição, observação do professor e avaliação de 5,0 a 10,0. As turmas de Educação
 * Infantil e as multisseriadas entram como as demais, com as matérias que tiverem.
 *
 * Tudo passa pelo TrabalhoService (matéria da turma, data no ano letivo, trimestre, auditoria). Não
 * anexa imagens: o envio de arquivos fica para a demonstração ao vivo.
 *
 * Uso: php artisan db:seed --force --class='Modules\Portfolio\Database\Seeders\PortfolioDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Não roda se o tenant já tiver trabalhos.
 */
final class PortfolioDadosDemonstracaoSeeder extends Seeder
{
    /** Título por matéria; a que não estiver aqui usa o genérico. */
    private const TITULOS = [
        'Língua Portuguesa' => ['Redação: Minha cidade', 'Reescrita do conto estudado', 'Cartaz sobre leitura'],
        'Matemática' => ['Resolução de problemas do cotidiano', 'Maquete de figuras geométricas', 'Jogo das tabuadas'],
        'Ciências' => ['Experimento: germinação do feijão', 'Cartaz do ciclo da água', 'Relatório da horta escolar'],
        'História' => ['Linha do tempo da família', 'Entrevista com um morador antigo', 'Painel sobre a fundação do município'],
        'Geografia' => ['Mapa do bairro', 'Maquete do relevo', 'Cartaz sobre as regiões do Brasil'],
        'Arte' => ['Releitura de obra de arte', 'Colagem com materiais recicláveis', 'Autorretrato'],
        'Educação Física' => ['Registro da circuito de atividades', 'Cartaz sobre alimentação saudável'],
        'Língua Inglesa' => ['Vocabulário ilustrado', 'Diálogo em dupla'],
        'Ensino Religioso' => ['Painel sobre respeito às diferenças'],
    ];

    private const OBSERVACOES = [
        'Capricho na apresentação e boa organização das ideias.',
        'Participou bem, mas precisa revisar a ortografia.',
        'Trabalho criativo; vale incentivar a escrita em casa.',
        'Cumpriu o combinado dentro do prazo.',
        'Precisa de apoio para concluir as atividades sem pressa.',
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Portfólio.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('portfolio_trabalhos')->where('tenant_id', $tenant->id)->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem trabalhos no portfólio — nada a fazer.");
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

        $total = 0;

        DB::transaction(function () use ($escolasIds, $usuario, &$total): void {
            foreach ($escolasIds as $escolaId) {
                app(EscolaContext::class)->set(Escola::query()->findOrFail($escolaId));
                $total += $this->semearEscola((int) $escolaId, $usuario);
            }
        });

        app(EscolaContext::class)->clear();

        $this->informar("Portfólio de demonstração criado no tenant [{$tenant->id}] {$tenant->name}: {$total} trabalhos.");
    }

    private function semearEscola(int $escolaId, User $usuario): int
    {
        $hoje = CarbonImmutable::today();
        $servico = app(TrabalhoService::class);
        $criados = 0;

        $turmas = DB::table('escola_turmas')->where('escola_id', $escolaId)->whereNull('deleted_at')->orderBy('id')->get(['id', 'ano_letivo']);
        foreach ($turmas as $turma) {
            $materias = DB::table('escola_turma_materias as tm')->join('escola_materias as m', 'm.id', '=', 'tm.materia_id')
                ->where('tm.turma_id', $turma->id)->orderBy('m.id')->get(['m.id', 'm.nome']);
            if ($materias->isEmpty()) {
                continue;
            }
            $inicio = CarbonImmutable::create((int) $turma->ano_letivo, 2, 16);
            $limite = $hoje->lessThan($inicio) ? $inicio : $hoje->subDay();
            $dias = max(1, (int) $inicio->diffInDays($limite));

            $alunos = Aluno::query()->where('turma_id', $turma->id)->where('situacao', '!=', 'transferido')->orderBy('id')->limit(10)->get();
            foreach ($alunos as $i => $aluno) {
                // Cada aluno tem de 2 a 4 trabalhos, em matérias diferentes, espalhados pelo ano.
                for ($k = 0; $k < 2 + $i % 3; $k++) {
                    $materia = $materias[($i + $k) % $materias->count()];
                    $titulos = self::TITULOS[$materia->nome] ?? ['Atividade avaliativa de ' . $materia->nome];
                    $data = $inicio->addDays(intdiv($dias * (($i * 3 + $k * 5) % 23), 23));
                    $servico->criar($aluno, [
                        'materia_id' => (int) $materia->id,
                        'titulo' => $titulos[($i + $k) % count($titulos)],
                        'data' => $data->toDateString(),
                        'avaliacao' => 5 + (($i * 7 + $k * 11) % 11) / 2,
                        'descricao' => 'Trabalho realizado em sala com a turma, em duas aulas.',
                        'observacoes' => self::OBSERVACOES[($i + $k) % count(self::OBSERVACOES)],
                    ], $usuario);
                    $criados++;
                }
            }
        }

        return $criados;
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
