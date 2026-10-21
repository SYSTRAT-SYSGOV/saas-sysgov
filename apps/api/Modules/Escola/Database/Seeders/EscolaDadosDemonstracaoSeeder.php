<?php

declare(strict_types=1);

namespace Modules\Escola\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Models\Module;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Services\AlunoService;
use Modules\Escola\Services\CategoriaOcorrenciaService;
use Modules\Escola\Services\EquipeService;
use Modules\Escola\Services\EscolaService;
use Modules\Escola\Services\MateriaService;
use Modules\Escola\Services\TrimestreService;
use Modules\Escola\Services\TurmaService;
use Modules\Escola\Services\TurnoService;
use Modules\Escola\Support\EscolaContext;
use RuntimeException;

/**
 * Dados de demonstração do módulo Escola: 1 escola (sem unidade do organograma vinculada —
 * nenhuma unidade de educação existe ainda no organograma deste tenant, e o módulo já trata
 * escola sem org_unit_id como visível a todos), 3 turnos, equipe gestora (diretor, diretor
 * auxiliar, secretaria e pedagoga — esta última responsável por duas turmas), 4 turmas do 1º,
 * 5º e 9º anos, 8 matérias vinculadas a todas as turmas (2 delas ainda sem professor definido),
 * 12 alunos (3 por turma) com CPF válido (ligados ao Cadastro de Pessoas), CGM e 1 contato
 * responsável cada, 4 trimestres do ano corrente em situações diferentes (encerrado, em
 * andamento, agendado) e 5 categorias de ocorrência.
 *
 * Passa pelos Services do módulo (não cria registros "crus"), então auditoria, isolamento por
 * escola e regras de negócio valem como no uso real.
 *
 * Uso: php artisan tinker --execute="app(Modules\Escola\Database\Seeders\EscolaDadosDemonstracaoSeeder::class)->seedTenant(1);"
 * Não roda se o tenant já tiver escola cadastrada (evita duplicar).
 */
final class EscolaDadosDemonstracaoSeeder extends Seeder
{
    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::where('slug', 'systrat')->get();

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            $this->informar("Tenant #{$tenantId} não encontrado — nada a semear no Escola.", aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);
        echo "==> Semeando dados de demonstração do Escola para o Tenant: [{$tenant->id}] {$tenant->name}\n";

        if (Escola::query()->exists()) {
            echo "    Tenant já tem escola(s) cadastrada(s) no módulo Escola — nada a fazer.\n";
            return;
        }

        $this->habilitarModulo($tenant);
        $autor = $this->usuarioAutor($tenant);
        $professores = $this->professoresDoTenant($tenant);

        DB::transaction(function () use ($autor, $professores): void {
            $this->como($autor, function () use ($professores): void {
                $escola = $this->criarEscola();

                $contexto = app(EscolaContext::class);
                $contexto->set($escola);

                $turnos = $this->criarTurnos();
                $equipe = $this->criarEquipe();
                $turmas = $this->criarTurmas($turnos, $equipe);
                $materias = $this->criarMaterias();
                $this->vincularMateriasTurmas($turmas, $materias, $professores);
                $this->criarAlunos($turmas);
                $this->criarTrimestres();
                $this->criarCategoriasOcorrencia();

                $contexto->clear();
            });
        });

        echo "    Concluído.\n";
    }

    // ---------------------------------------------------------------- cenário

    private function criarEscola(): Escola
    {
        // Sem org_unit_id: nenhuma unidade de educação existe ainda no organograma deste
        // tenant (só a Secretaria de Meio Ambiente, do seeder do módulo Meio Ambiente), e
        // criar uma unidade só para isto acoplaria este seeder a dados de outro domínio.
        // EscolaService::minhas() já trata escola sem org_unit_id como visível a todos.
        return app(EscolaService::class)->criar([
            'nome' => 'Escola Municipal Prof. Antônio Carlos Ribeiro',
            'inep' => '41123456',
        ]);
    }

    /** @return array<string, Turno> */
    private function criarTurnos(): array
    {
        $turnos = app(TurnoService::class);

        return [
            'manha' => $turnos->criar(['nome' => 'Manhã', 'ordem' => 1]),
            'tarde' => $turnos->criar(['nome' => 'Tarde', 'ordem' => 2]),
            'noite' => $turnos->criar(['nome' => 'Noite', 'ordem' => 3]),
        ];
    }

    /** @return array<string, MembroEquipe> */
    private function criarEquipe(): array
    {
        $equipe = app(EquipeService::class);

        return [
            'diretora' => $equipe->criar(['nome' => 'Sandra Regina Oliveira', 'cargo' => 'diretor', 'ordem' => 1]),
            'diretor_auxiliar' => $equipe->criar(['nome' => 'Marcos Vinícius Teixeira', 'cargo' => 'diretor_auxiliar', 'ordem' => 2]),
            'secretaria' => $equipe->criar(['nome' => 'Juliana Aparecida Souza', 'cargo' => 'secretaria', 'ordem' => 3]),
            'pedagoga' => $equipe->criar(['nome' => 'Patrícia Helena Rocha', 'cargo' => 'pedagoga', 'ordem' => 4]),
        ];
    }

    /**
     * @param array<string, Turno> $turnos
     * @param array<string, MembroEquipe> $equipe
     * @return array<string, Turma>
     */
    private function criarTurmas(array $turnos, array $equipe): array
    {
        $turmas = app(TurmaService::class);
        $ano = (int) now()->year;
        $pedagogaId = $equipe['pedagoga']->id;

        return [
            '1a' => $turmas->criar(['nome' => '1º Ano A', 'turno_id' => $turnos['manha']->id, 'ano_letivo' => $ano, 'pedagoga_id' => $pedagogaId]),
            '1b' => $turmas->criar(['nome' => '1º Ano B', 'turno_id' => $turnos['manha']->id, 'ano_letivo' => $ano, 'pedagoga_id' => $pedagogaId]),
            '5a' => $turmas->criar(['nome' => '5º Ano A', 'turno_id' => $turnos['tarde']->id, 'ano_letivo' => $ano]),
            '9a' => $turmas->criar(['nome' => '9º Ano A', 'turno_id' => $turnos['tarde']->id, 'ano_letivo' => $ano]),
        ];
    }

    /** @return list<Materia> */
    private function criarMaterias(): array
    {
        $materias = app(MateriaService::class);

        return array_map(
            fn (string $nome): Materia => $materias->criar($nome),
            ['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Educação Física', 'Artes', 'Língua Inglesa'],
        );
    }

    /**
     * Todas as turmas recebem as 8 matérias; as duas últimas (Artes, Língua Inglesa) ficam
     * sem professor definido ainda, para refletir um cadastro real em andamento.
     *
     * @param array<string, Turma> $turmas
     * @param list<Materia> $materias
     * @param list<User> $professores
     */
    private function vincularMateriasTurmas(array $turmas, array $materias, array $professores): void
    {
        $turmaService = app(TurmaService::class);
        $semProfessorApartirDe = count($materias) - 2;

        foreach ($turmas as $turma) {
            $vinculos = [];
            foreach ($materias as $i => $materia) {
                $vinculos[] = [
                    'materia_id' => $materia->id,
                    'professor_user_id' => $i >= $semProfessorApartirDe ? null : $professores[$i % count($professores)]->id,
                ];
            }
            $turmaService->sincronizarMaterias($turma, $vinculos);
        }
    }

    /** @param array<string, Turma> $turmas */
    private function criarAlunos(array $turmas): void
    {
        $alunos = app(AlunoService::class);
        $cpfsUsados = [];
        $cgm = 1;

        $grupos = [
            '1a' => ['idade' => 6, 'alunos' => [
                ['nome' => 'Ana Luiza Ferreira dos Santos', 'mae' => 'Camila Ferreira dos Santos', 'telefone' => '(41) 99811-2201'],
                ['nome' => 'Bernardo Henrique Silva', 'mae' => 'Patrícia Silva Costa', 'telefone' => '(41) 99811-2202'],
                ['nome' => 'Clara Eduarda Rodrigues', 'mae' => 'Vanessa Rodrigues Lima', 'telefone' => '(41) 99811-2203'],
            ]],
            '1b' => ['idade' => 6, 'alunos' => [
                ['nome' => 'Davi Lucca Pereira', 'mae' => 'Simone Pereira Alves', 'telefone' => '(41) 99811-2204'],
                ['nome' => 'Esther Beatriz Gonçalves', 'mae' => 'Roberta Gonçalves Melo', 'telefone' => '(41) 99811-2205'],
                ['nome' => 'Felipe Augusto Barbosa', 'mae' => 'Daniela Barbosa Ramos', 'telefone' => '(41) 99811-2206'],
            ]],
            '5a' => ['idade' => 10, 'alunos' => [
                ['nome' => 'Gabriela Souza Martins', 'mae' => 'Luciana Souza Martins', 'telefone' => '(41) 99811-2207'],
                ['nome' => 'Heitor Nunes Carvalho', 'mae' => 'Fernanda Nunes Carvalho', 'telefone' => '(41) 99811-2208'],
                ['nome' => 'Isabela Cristina Almeida', 'mae' => 'Adriana Cristina Almeida', 'telefone' => '(41) 99811-2209'],
            ]],
            '9a' => ['idade' => 14, 'alunos' => [
                ['nome' => 'João Pedro Costa Lima', 'mae' => 'Mariana Costa Lima', 'telefone' => '(41) 99811-2210'],
                ['nome' => 'Larissa Fernanda Ribeiro', 'mae' => 'Gisele Fernanda Ribeiro', 'telefone' => '(41) 99811-2211'],
                ['nome' => 'Matheus Vinícius Araújo', 'mae' => 'Tatiane Vinícius Araújo', 'telefone' => '(41) 99811-2212'],
            ]],
        ];

        foreach ($grupos as $chave => $grupo) {
            $turma = $turmas[$chave];
            foreach ($grupo['alunos'] as $dados) {
                $alunos->criar([
                    'nome' => $dados['nome'],
                    'turma_id' => $turma->id,
                    'cpf' => $this->cpfInedito($cpfsUsados),
                    'cgm' => str_pad((string) $cgm, 8, '0', STR_PAD_LEFT),
                    'nascimento' => now()->subYears($grupo['idade'])->subDays(random_int(10, 300))->toDateString(),
                    'mae' => $dados['mae'],
                    'contatos' => [['telefone' => $dados['telefone'], 'descricao' => 'Responsável (mãe)']],
                ]);
                $cgm++;
            }
        }
    }

    /** 4 trimestres do ano corrente em situações diferentes (2 encerrados, 1 em andamento, 1 agendado). */
    private function criarTrimestres(): void
    {
        $trimestres = app(TrimestreService::class);
        $ano = (int) now()->year;
        $hoje = now();

        $periodos = [
            [$hoje->copy()->subMonths(8)->startOfMonth(), $hoje->copy()->subMonths(6)->endOfMonth()],
            [$hoje->copy()->subMonths(5)->startOfMonth(), $hoje->copy()->subMonths(3)->endOfMonth()],
            [$hoje->copy()->subMonth()->startOfMonth(), $hoje->copy()->addMonth()->endOfMonth()],
            [$hoje->copy()->addMonths(2)->startOfMonth(), $hoje->copy()->addMonths(4)->endOfMonth()],
        ];

        foreach ($periodos as $i => [$inicio, $fim]) {
            $trimestres->criar([
                'ano_letivo' => $ano,
                'numero' => $i + 1,
                'data_inicio' => $inicio->toDateString(),
                'data_fim' => $fim->toDateString(),
            ]);
        }
    }

    private function criarCategoriasOcorrencia(): void
    {
        $categorias = app(CategoriaOcorrenciaService::class);

        foreach ([
            'Atraso' => '#f59e0b',
            'Falta Justificada' => '#4ccce6',
            'Advertência' => '#ef4444',
            'Elogio' => '#10b981',
            'Indisciplina' => '#b626c9',
        ] as $nome => $cor) {
            $categorias->criar(['nome' => $nome, 'cor' => $cor]);
        }
    }

    // ---------------------------------------------------------------- montagem

    private function habilitarModulo(Tenant $tenant): void
    {
        $modulo = Module::query()->where('alias', 'escola')->first();
        if ($modulo === null) {
            throw new RuntimeException('Módulo "escola" não está no catálogo — rode php artisan module:register Escola antes.');
        }
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'escola');
    }

    private function usuarioAutor(Tenant $tenant): User
    {
        $usuario = User::query()->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))->orderBy('id')->first();
        if ($usuario === null) {
            throw new RuntimeException('O tenant precisa de ao menos um usuário para autorar os dados de demonstração do Escola.');
        }

        return $usuario;
    }

    /**
     * Professores das matérias: reaproveita os usuários já cadastrados no tenant (round-robin),
     * em vez de criar usuários fictícios só para isto.
     *
     * @return list<User>
     */
    private function professoresDoTenant(Tenant $tenant): array
    {
        return User::query()->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))->orderBy('id')->get()->all();
    }

    /** @param array<string, true> $usados */
    private function cpfInedito(array &$usados): string
    {
        do {
            $cpf = $this->cpfValido();
        } while (isset($usados[$cpf]));
        $usados[$cpf] = true;

        return $cpf;
    }

    /** CPF com dígitos verificadores válidos (algoritmo padrão), só com fins de demonstração. */
    private function cpfValido(): string
    {
        $n = [];
        for ($i = 0; $i < 9; $i++) {
            $n[$i] = random_int(0, 9);
        }

        $pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
        $soma = 0;
        foreach ($pesos1 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = ($soma * 10) % 11;
        $n[9] = $resto >= 10 ? 0 : $resto;

        $pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
        $soma = 0;
        foreach ($pesos2 as $i => $peso) {
            $soma += $n[$i] * $peso;
        }
        $resto = ($soma * 10) % 11;
        $n[10] = $resto >= 10 ? 0 : $resto;

        return implode('', $n);
    }

    /**
     * Executa $acao com $user como usuário da requisição — o AuditLogger lê o
     * autor de request()->user(), que no console seria null.
     *
     * @template T
     * @param callable(): T $acao
     * @return T
     */
    private function como(User $user, callable $acao): mixed
    {
        request()->setUserResolver(fn () => $user);

        try {
            return $acao();
        } finally {
            request()->setUserResolver(fn () => null);
        }
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
