<?php

declare(strict_types=1);

namespace Modules\Escola\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Escola;
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
use Modules\OrgChart\Database\Seeders\OrgChartDadosDemonstracaoSeeder;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Massa de dados de demonstração do Cadastro Escolar: 6 escolas da rede municipal (cada uma ligada
 * à sua unidade do organograma), com turnos, matérias, trimestres do ano letivo, categorias de
 * ocorrência, equipe gestora, turmas com matérias e pedagoga, e 400 alunos com contatos.
 *
 * Depende do organograma: cada escola é ligada a uma unidade criada pelo
 * OrgChartDadosDemonstracaoSeeder (códigos ESC-01 a ESC-06), e é essa ligação que o acesso por
 * unidade do organograma usa para filtrar as escolas de cada usuário. Rode aquele seeder antes.
 *
 * Tudo passa pelos Services do módulo (numeração de alunos, regras de nome/CGM, auditoria). Os
 * alunos não têm CPF, de propósito: informar o CPF cadastraria cada criança no Cadastro Único de
 * Pessoas. Os professores das turmas não são atribuídos, para não vincular pessoas reais a
 * disciplinas. Nomes, telefones e datas de nascimento são fictícios.
 *
 * Uso: php artisan db:seed --force --class='Modules\Escola\Database\Seeders\EscolaDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver escolas (evita duplicar).
 */
final class EscolaDadosDemonstracaoSeeder extends Seeder
{
    private const PRIMEIROS_F = ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Julia', 'Larissa', 'Manuela', 'Natália', 'Olívia', 'Priscila', 'Rafaela', 'Sofia', 'Valentina', 'Yasmin', 'Alice'];

    private const PRIMEIROS_M = ['Arthur', 'Bernardo', 'Caio', 'Davi', 'Enzo', 'Felipe', 'Gabriel', 'Heitor', 'Igor', 'João', 'Kauã', 'Lucas', 'Miguel', 'Nicolas', 'Otávio', 'Pedro', 'Rafael', 'Samuel', 'Theo', 'Vitor'];

    private const SOBRENOMES = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Henrique', 'Lima', 'Machado', 'Nunes', 'Oliveira', 'Pereira', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Moraes', 'Rocha', 'Campos', 'Freitas', 'Borges', 'Siqueira', 'Pacheco', 'Lopes'];

    private const MATERIAS_FUNDAMENTAL = ['Língua Portuguesa', 'Matemática', 'Ciências', 'História', 'Geografia', 'Arte', 'Educação Física', 'Língua Inglesa', 'Ensino Religioso'];

    private const MATERIAS_INFANTIL = ['Linguagem Oral e Escrita', 'Natureza e Sociedade', 'Artes e Música', 'Movimento e Brincadeiras'];

    /**
     * Escolas e turmas: [código da unidade, nome, INEP, tipo, equipe, turmas].
     * Cada turma: [nome, turno, idade dos alunos, quantidade de alunos]. Soma: 400 alunos.
     *
     * @var list<array{0: string, 1: string, 2: string, 3: string, 4: list<array{0: string, 1: string}>, 5: list<array{0: string, 1: string, 2: int, 3: int}>}>
     */
    private const ESCOLAS = [
        ['ESC-01', 'Escola Municipal Santos Dumont', '41093011', 'fundamental',
            [['Marlene Aparecida Coutinho', 'diretor'], ['Cláudio Roberto Faria', 'diretor_auxiliar'], ['Simone Alves Prado', 'secretaria'], ['Eliane Souza Ramos', 'pedagoga'], ['Rosângela Dias Leal', 'pedagoga']],
            [['1º Ano A', 'Manhã', 6, 23], ['2º Ano A', 'Manhã', 7, 22], ['3º Ano A', 'Tarde', 8, 23], ['4º Ano A', 'Tarde', 9, 22]]],
        ['ESC-02', 'Escola Municipal Tiradentes', '41093029', 'fundamental',
            [['Antônio Carlos Bittencourt', 'diretor'], ['Luciana Prates Moreira', 'diretor_auxiliar'], ['Vera Lúcia Nascimento', 'secretaria'], ['Patrícia Gomes Duarte', 'pedagoga']],
            [['5º Ano A', 'Manhã', 10, 20], ['6º Ano A', 'Manhã', 11, 20], ['7º Ano A', 'Tarde', 12, 20], ['8º Ano A', 'Tarde', 13, 20]]],
        ['ESC-03', 'Escola Municipal Monteiro Lobato', '41093037', 'fundamental',
            [['Sônia Maria Cavalcante', 'diretor'], ['Rogério Tadeu Meireles', 'diretor_auxiliar'], ['Adriana Pinto Brito', 'secretaria'], ['Cíntia Moura Fontes', 'pedagoga']],
            [['1º Ano A', 'Tarde', 6, 25], ['2º Ano A', 'Manhã', 7, 25], ['9º Ano A', 'Tarde', 14, 25]]],
        ['ESC-04', 'Escola Municipal Vila Nova', '41093045', 'fundamental',
            [['Jorge Luís Medeiros', 'diretor'], ['Tânia Regina Bastos', 'secretaria'], ['Michele Andrade Cunha', 'pedagoga']],
            [['3º Ano A', 'Manhã', 8, 22], ['4º Ano A', 'Tarde', 9, 22], ['5º Ano A', 'Manhã', 10, 21]]],
        ['ESC-05', 'CMEI Pequeno Príncipe', '41093053', 'infantil',
            [['Neusa Maria Valente', 'diretor'], ['Kátia Cilene Rosa', 'secretaria'], ['Débora Lima Siqueira', 'pedagoga']],
            [['Maternal', 'Manhã', 3, 15], ['Pré I', 'Manhã', 4, 17], ['Pré II', 'Tarde', 5, 18]]],
        ['ESC-06', 'Escola Rural Municipal do Passaúna', '41093061', 'fundamental',
            [['Geraldo Antunes Pires', 'diretor'], ['Marta Helena Souto', 'pedagoga']],
            [['Multisseriada 1º ao 3º Ano', 'Manhã', 7, 20], ['Multisseriada 4º e 5º Ano', 'Manhã', 10, 20]]],
    ];

    private int $contador = 0;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Cadastro Escolar.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (Escola::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem escolas — nada a fazer.");
            return;
        }

        $faltantes = [];
        foreach (OrgChartDadosDemonstracaoSeeder::ESCOLAS as [$codigo]) {
            if (!OrgUnit::query()->where('code', $codigo)->exists()) {
                $faltantes[] = $codigo;
            }
        }
        if ($faltantes !== []) {
            $this->informar('Unidades do organograma não encontradas (' . implode(', ', $faltantes) . ') — execute antes o OrgChartDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $totais = ['escolas' => 0, 'turmas' => 0, 'alunos' => 0];

        // Tudo ou nada: se algo falhar, nada fica gravado (o guard acima bloquearia uma nova execução).
        DB::transaction(function () use (&$totais): void {
            foreach (self::ESCOLAS as $linha) {
                $this->criarEscola($linha, $totais);
            }
        });

        app(EscolaContext::class)->clear();

        $this->informar("Cadastro Escolar de demonstração criado no tenant [{$tenant->id}] {$tenant->name}: {$totais['escolas']} escolas, {$totais['turmas']} turmas e {$totais['alunos']} alunos.");
    }

    // ------------------------------------------------------------------- escola

    /**
     * @param array{0: string, 1: string, 2: string, 3: string, 4: list<array{0: string, 1: string}>, 5: list<array{0: string, 1: string, 2: int, 3: int}>} $linha
     * @param array{escolas: int, turmas: int, alunos: int} $totais
     */
    private function criarEscola(array $linha, array &$totais): void
    {
        [$codigoUnidade, $nome, $inep, $tipo, $equipe, $turmas] = $linha;
        $unidade = OrgUnit::query()->where('code', $codigoUnidade)->firstOrFail();

        $escola = app(EscolaService::class)->criar(['nome' => $nome, 'inep' => $inep, 'org_unit_id' => $unidade->id]);
        $totais['escolas']++;

        // Os modelos do módulo filtram e gravam pela escola do contexto.
        app(EscolaContext::class)->set($escola);

        app(TurnoService::class)->garantirPadroes();
        app(CategoriaOcorrenciaService::class)->garantirPadroes();

        $materias = $this->criarMaterias($tipo);
        $this->criarTrimestres();
        $pedagogas = $this->criarEquipe($equipe);

        $ano = (int) CarbonImmutable::today()->year;
        $alunosDaEscola = [];

        foreach ($turmas as $i => [$nomeTurma, $nomeTurno, $idade, $quantidade]) {
            $turno = Turno::query()->where('nome', $nomeTurno)->firstOrFail();
            $turma = app(TurmaService::class)->criar([
                'nome' => $nomeTurma,
                'turno_id' => $turno->id,
                'ano_letivo' => $ano,
                'pedagoga_id' => $pedagogas === [] ? null : $pedagogas[$i % count($pedagogas)],
            ]);
            app(TurmaService::class)->sincronizarMaterias($turma, array_map(
                fn (int $materiaId): array => ['materia_id' => $materiaId, 'professor_user_id' => null],
                $materias,
            ));
            $totais['turmas']++;

            for ($k = 0; $k < $quantidade; $k++) {
                $alunosDaEscola[] = [$turma, $idade, $k];
            }
        }

        $primeiraTurma = Turma::query()->orderBy('id')->firstOrFail();
        foreach ($alunosDaEscola as [$turma, $idade, $k]) {
            $this->criarAluno($escola, $turma, $primeiraTurma, $idade, $k);
            $totais['alunos']++;
        }
    }

    /** @return list<int> ids das matérias criadas */
    private function criarMaterias(string $tipo): array
    {
        $nomes = $tipo === 'infantil' ? self::MATERIAS_INFANTIL : self::MATERIAS_FUNDAMENTAL;
        $ids = [];
        foreach ($nomes as $nome) {
            $ids[] = app(MateriaService::class)->criar($nome)->id;
        }

        return $ids;
    }

    private function criarTrimestres(): void
    {
        $ano = (int) CarbonImmutable::today()->year;
        $periodos = [
            [1, "{$ano}-02-02", "{$ano}-05-08"],
            [2, "{$ano}-05-11", "{$ano}-08-28"],
            [3, "{$ano}-08-31", "{$ano}-12-11"],
        ];
        foreach ($periodos as [$numero, $inicio, $fim]) {
            app(TrimestreService::class)->criar(['ano_letivo' => $ano, 'numero' => $numero, 'data_inicio' => $inicio, 'data_fim' => $fim]);
        }
    }

    /**
     * @param list<array{0: string, 1: string}> $equipe
     * @return list<int> ids das pedagogas
     */
    private function criarEquipe(array $equipe): array
    {
        $pedagogas = [];
        foreach ($equipe as $ordem => [$nome, $cargo]) {
            $membro = app(EquipeService::class)->criar(['nome' => $nome, 'cargo' => $cargo, 'ordem' => $ordem + 1]);
            if ($membro->cargo === 'pedagoga') {
                $pedagogas[] = $membro->id;
            }
        }
        // Se a escola não tem pedagoga, as turmas ficam sem (lista vazia → null no criarEscola).
        return $pedagogas;
    }

    // -------------------------------------------------------------------- alunos

    private function criarAluno(Escola $escola, Turma $turma, Turma $primeiraTurma, int $idade, int $k): void
    {
        $this->contador++;
        $n = $this->contador;
        $menina = $n % 2 === 0;
        $primeiro = $menina
            ? self::PRIMEIROS_F[($n * 7) % count(self::PRIMEIROS_F)]
            : self::PRIMEIROS_M[($n * 7) % count(self::PRIMEIROS_M)];
        $sobrenome1 = self::SOBRENOMES[($n * 11 + 3) % count(self::SOBRENOMES)];
        $sobrenome2 = self::SOBRENOMES[($n * 13 + 5) % count(self::SOBRENOMES)];

        $nascimento = CarbonImmutable::create((int) CarbonImmutable::today()->year - $idade, 1 + ($n * 5) % 12, 1 + ($n * 7) % 28);

        // ~6% transferidos (saem da turma) e ~4% remanejados (mudaram de turma dentro da escola).
        $situacao = match (true) {
            $n % 17 === 5 => SituacaoAluno::Transferido,
            $n % 23 === 7 && $turma->id !== $primeiraTurma->id => SituacaoAluno::Remanejado,
            default => SituacaoAluno::Ativo,
        };

        $contatos = [[
            'telefone' => sprintf('(41) 9%04d-%04d', 8100 + ($n * 13) % 900, 1000 + ($n * 37) % 9000),
            'descricao' => $n % 3 === 0 ? 'Pai' : 'Mãe',
        ]];
        if ($n % 4 === 0) {
            $contatos[] = [
                'telefone' => sprintf('(41) 3%03d-%04d', 600 + $n % 90, 1000 + ($n * 53) % 9000),
                'descricao' => 'Avó',
            ];
        }

        app(AlunoService::class)->criar([
            'nome' => "{$primeiro} {$sobrenome1} {$sobrenome2}",
            'cgm' => sprintf('%d%05d', $escola->id, 10000 + $n),
            'nascimento' => $nascimento->toDateString(),
            'mae' => self::PRIMEIROS_F[($n * 3 + 1) % count(self::PRIMEIROS_F)] . " {$sobrenome2} {$sobrenome1}",
            'pai' => $n % 9 === 0 ? null : self::PRIMEIROS_M[($n * 5 + 2) % count(self::PRIMEIROS_M)] . " {$sobrenome1}",
            'turma_id' => $situacao === SituacaoAluno::Transferido ? null : $turma->id,
            'turma_origem_id' => $situacao === SituacaoAluno::Remanejado ? $primeiraTurma->id : null,
            'situacao' => $situacao->value,
            'contatos' => $contatos,
        ]);
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
