<?php

declare(strict_types=1);

namespace Modules\Cursos\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Services\AvaliacaoService;
use Modules\Cursos\Services\CorrecaoService;
use Modules\Cursos\Services\CursoService;
use Modules\Cursos\Services\MaterialService;
use Modules\Cursos\Services\QuestaoService;
use Modules\Cursos\Services\TentativaService;

/**
 * Conteúdo de demonstração da Fase 2 (materiais e avaliações) no curso
 * "Gestão e fiscalização de contratos", que já tem turma em andamento com
 * quatro inscritos. Entra pelos Services, como o uso real.
 *
 * Idempotente: se o curso já tem materiais ou avaliações, não faz nada — por
 * isso também roda sobre um ambiente que já tinha os cursos da Fase 1.
 *
 * Cenários: os quatro tipos de material (com um rascunho, um bloqueado por
 * dias e um bloqueado por aula), três avaliações (uma com tempo limite e
 * dissertativa, uma sem limite, uma ainda não liberada) e tentativas de
 * exemplo: aguardando correção (Carlos), corrigida (Fernanda), em andamento
 * (João) e nenhuma (Luciana, para testar do zero).
 */
final class CursosConteudoDemonstracaoSeeder extends Seeder
{
    public const TITULO_CURSO = 'Gestão e fiscalização de contratos';

    private User $admin;

    private User $instrutora;

    /** @var array<string, User> login => usuário */
    private array $alunos = [];

    public function run(?int $tenantId = null): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Dados de demonstração não podem ser semeados em produção.');
        }

        $tenant = $tenantId !== null ? Tenant::find($tenantId) : Tenant::where('slug', 'systrat')->first();
        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear.');
            return;
        }

        app(TenantContext::class)->set($tenant);

        $curso = Curso::query()->where('titulo', self::TITULO_CURSO)->first();
        if ($curso === null) {
            $this->informar('O curso de demonstração não existe: rode o CursosDadosDemonstracaoSeeder antes.');
            return;
        }
        if (Material::query()->where('curso_id', $curso->id)->exists() || Avaliacao::query()->where('curso_id', $curso->id)->exists()) {
            $this->informar('O curso de demonstração já tem materiais ou avaliações — nada a fazer.');
            return;
        }

        $this->carregarPessoas($tenant);
        $turma = $curso->turmas()->firstOrFail();
        $aulas = $curso->aulas()->get();

        $this->como($this->admin, fn () => app(CursoService::class)->atualizar($curso, ['nota_minima' => 7]));
        $this->materiais($curso, $aulas->last()->id);
        [$avaliacao1, $avaliacao2] = $this->avaliacoes($curso);
        $this->tentativas($turma->id, $avaliacao1, $avaliacao2);

        $this->informar('Conteúdo da Fase 2 criado no curso "' . self::TITULO_CURSO . '" (nota mínima 7): 7 materiais, 3 avaliações e tentativas de exemplo de Carlos, Fernanda e João. A Luciana não fez nenhuma, para testar do zero.');
    }

    // ---------------------------------------------------------------- materiais

    private function materiais(Curso $curso, int $ultimaAulaId): void
    {
        $servico = app(MaterialService::class);
        $criar = fn (array $dados): Material => $this->como($this->admin, fn () => $servico->criar($curso, ['publicado' => true, ...$dados]));

        $criar([
            'tipo' => 'texto', 'titulo' => 'Guia rápido do gestor e do fiscal', 'descricao' => 'Leitura de 5 minutos antes da primeira aula.',
            'conteudo' => '<h3>Quem faz o quê</h3><p>O <strong>gestor</strong> acompanha a execução como um todo; o <strong>fiscal</strong> verifica, no dia a dia, se o objeto entregue confere com o contratado.</p><ul><li>Registrar ocorrências por escrito</li><li>Atestar medições apenas do que foi executado</li><li>Comunicar irregularidades à autoridade competente</li></ul><p>Base legal: arts. 117 e 140 da Lei 14.133/2021.</p>',
        ]);
        $criar(['tipo' => 'link', 'titulo' => 'Portal Nacional de Contratações Públicas (PNCP)', 'descricao' => 'Onde os contratos e aditivos são publicados.', 'url' => 'https://pncp.gov.br']);
        $criar(['tipo' => 'video', 'titulo' => 'Fiscalização de contratos — aula gravada', 'descricao' => 'Vídeo de demonstração do player incorporado.', 'url' => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ']);

        $pdf = $criar(['tipo' => 'arquivo', 'titulo' => 'Modelo de relatório de fiscalização', 'descricao' => 'Modelo em PDF para preencher a cada medição.', 'publicado' => false]);
        $this->como($this->admin, function () use ($servico, $pdf): void {
            $servico->definirArquivo($pdf, $this->pdfDeExemplo());
            $servico->atualizar($pdf, ['publicado' => true]);
        });

        // Ainda bloqueados: um por prazo (a turma começou há 7 dias) e outro pelo início da aula 3.
        $criar(['tipo' => 'texto', 'titulo' => 'Módulo avançado: aditivos e reequilíbrio', 'conteudo' => '<p>Conteúdo liberado 30 dias depois do início da turma.</p>', 'liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 30]);
        $criar(['tipo' => 'texto', 'titulo' => 'Roteiro da aula 3', 'conteudo' => '<p>Liberado no início da aula sobre aditivos e sanções.</p>', 'liberacao_regra' => 'inicio_aula', 'aula_id' => $ultimaAulaId]);
        // Rascunho: só o Administrador e o instrutor veem.
        $criar(['tipo' => 'texto', 'titulo' => 'Material em elaboração', 'conteudo' => '<p>Ainda não publicado.</p>', 'publicado' => false]);
    }

    private function pdfDeExemplo(): UploadedFile
    {
        $html = '<h1 style="font-family: sans-serif">Modelo de relatório de fiscalização</h1>'
            . '<p style="font-family: sans-serif">Contrato nº ____ / Objeto: ________________</p>'
            . '<p style="font-family: sans-serif">Período: ___/___/______ a ___/___/______</p>'
            . '<p style="font-family: sans-serif">Ocorrências: ______________________________________________</p>'
            . '<p style="font-family: sans-serif">Fiscal do contrato: ____________________</p>'
            . '<p style="font-family: sans-serif; color: #666">Documento de demonstração gerado pelo seeder do módulo Cursos.</p>';
        $caminho = (string) tempnam(sys_get_temp_dir(), 'demo-pdf');
        file_put_contents($caminho, Pdf::loadHTML($html)->output());

        return new UploadedFile($caminho, 'modelo-relatorio-fiscalizacao.pdf', 'application/pdf', null, true);
    }

    // ---------------------------------------------------------------- questões e avaliações

    /**
     * @return array{0: Avaliacao, 1: Avaliacao}
     */
    private function avaliacoes(Curso $curso): array
    {
        $questoes = app(QuestaoService::class);
        $objetiva = fn (string $enunciado, array $alternativas, int $correta): Questao => $this->como($this->admin, fn () => $questoes->criar($curso, [
            'tipo' => 'objetiva', 'enunciado' => "<p>{$enunciado}</p>",
            'alternativas' => array_map(fn (string $t, int $i): array => ['texto' => $t, 'correta' => $i === $correta], $alternativas, array_keys($alternativas)),
        ]));

        $q1 = $objetiva('Quem acompanha e verifica, no dia a dia, se o objeto entregue confere com o contratado?', ['O gestor do contrato', 'O fiscal do contrato', 'O ordenador de despesa', 'O pregoeiro'], 1);
        $q2 = $objetiva('A medição de um serviço pode ser atestada quando...', ['o fornecedor envia a nota fiscal', 'o serviço foi efetivamente executado e conferido', 'o prazo do contrato vence', 'o gestor autoriza por telefone'], 1);
        $q3 = $objetiva('Qual é o instrumento usado para alterar as cláusulas de um contrato vigente?', ['Termo aditivo', 'Nota de empenho', 'Ata de registro de preços', 'Edital'], 0);
        $q4 = $this->como($this->admin, fn () => $questoes->criar($curso, [
            'tipo' => 'dissertativa', 'pontuacao' => 2,
            'enunciado' => '<p>Descreva duas providências do fiscal ao constatar que o serviço foi entregue fora da especificação.</p>',
            'orientacao_correcao' => '<p>Esperado: registrar a ocorrência por escrito e notificar o contratado para corrigir; comunicar o gestor. Meio ponto por providência bem descrita e um ponto pela fundamentação.</p>',
        ]));
        $q5 = $this->como($this->admin, fn () => $questoes->criar($curso, [
            'tipo' => 'dissertativa', 'pontuacao' => 5,
            'enunciado' => '<p><strong>Estudo de caso.</strong> Um contrato de limpeza teve a medição do mês atestada sem visita ao local. Analise a situação e proponha o procedimento correto.</p>',
            'orientacao_correcao' => '<p>Avaliar: identificação da falha, responsabilidade do fiscal, procedimento de conferência in loco e registro.</p>',
        ]));

        $servico = app(AvaliacaoService::class);
        $publicar = fn (array $dados, array $ids): Avaliacao => $this->como($this->admin, function () use ($servico, $curso, $dados, $ids): Avaliacao {
            $avaliacao = $servico->criar($curso, [...$dados, 'questoes' => $ids]);

            return $servico->alterarPublicacao($avaliacao, true);
        });

        $a1 = $publicar(['titulo' => 'Avaliação de conhecimentos', 'instrucoes' => '<p>Responda com atenção. Você tem <strong>30 minutos</strong> e até duas tentativas; vale a melhor nota.</p>', 'peso' => 1, 'tentativas_max' => 2, 'tempo_limite_minutos' => 30], [$q1->id, $q2->id, $q3->id, $q4->id]);
        $a2 = $publicar(['titulo' => 'Estudo de caso', 'instrucoes' => '<p>Sem limite de tempo, uma tentativa. Peso 2 na nota final.</p>', 'peso' => 2, 'tentativas_max' => 1], [$q5->id]);
        $publicar(['titulo' => 'Prova de recuperação', 'peso' => 1, 'liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 20], [$q1->id, $q3->id]);

        return [$a1, $a2];
    }

    // ---------------------------------------------------------------- tentativas

    private function tentativas(int $turmaId, Avaliacao $a1, Avaliacao $a2): void
    {
        $inscricao = fn (string $login): Inscricao => Inscricao::query()->where('turma_id', $turmaId)->whereHas('participante', fn ($q) => $q->where('user_id', $this->alunos[$login]->id))->firstOrFail();
        $tentativas = app(TentativaService::class);
        $questoesDe = fn (Avaliacao $a): array => $a->questoes()->with('questao.alternativas')->get()->map(fn ($aq) => $aq->questao)->all();

        // Carlos: tudo certo nas objetivas e uma dissertativa a corrigir → fila da Helena.
        $carlos = $this->alunos['carlos.menezes'];
        $this->como($carlos, function () use ($tentativas, $a1, $inscricao, $questoesDe): void {
            $t = $tentativas->iniciar($a1, $inscricao('carlos.menezes'));
            $this->responderTudo($tentativas, $t, $questoesDe($a1), acertos: 3, texto: 'Notificar o contratado por escrito para refazer o serviço e registrar a ocorrência no relatório de fiscalização, comunicando o gestor.');
            $tentativas->enviar($t);
        });

        // Fernanda: 2 de 3 nas objetivas; a Helena já corrigiu a dissertativa.
        $fernanda = $this->alunos['fernanda.rocha'];
        $tentativaFernanda = $this->como($fernanda, function () use ($tentativas, $a1, $inscricao, $questoesDe): Tentativa {
            $t = $tentativas->iniciar($a1, $inscricao('fernanda.rocha'));
            $this->responderTudo($tentativas, $t, $questoesDe($a1), acertos: 2, texto: 'O fiscal deve anotar o problema e avisar a empresa.');

            return $tentativas->enviar($t);
        });
        $dissertativa = collect($tentativaFernanda->questoes)->firstWhere('tipo', 'dissertativa');
        $this->como($this->instrutora, fn () => app(CorrecaoService::class)->corrigirResposta($tentativaFernanda, $dissertativa['questao_id'], 1.5, 'Faltou fundamentar na lei e citar a comunicação ao gestor.', $this->instrutora));

        // João: começou o estudo de caso (sem limite de tempo) e não enviou — "Continuar tentativa".
        $joao = $this->alunos['joao.lima'];
        $this->como($joao, function () use ($tentativas, $a2, $inscricao, $questoesDe): void {
            $t = $tentativas->iniciar($a2, $inscricao('joao.lima'));
            $questao = $questoesDe($a2)[0];
            $tentativas->salvarResposta($t, $questao->id, ['texto' => 'A medição não poderia ter sido atestada sem conferir o serviço no local. O fiscal deve']);
        });
    }

    /**
     * Responde as objetivas (as primeiras `$acertos` certas, o resto errado) e a dissertativa.
     *
     * @param list<Questao> $questoes
     */
    private function responderTudo(TentativaService $tentativas, Tentativa $tentativa, array $questoes, int $acertos, string $texto): void
    {
        $objetivas = 0;
        foreach ($questoes as $questao) {
            if ($questao->tipo === 'dissertativa') {
                $tentativas->salvarResposta($tentativa, $questao->id, ['texto' => $texto]);
                continue;
            }
            $alternativas = $questao->alternativas;
            $escolhida = $objetivas < $acertos
                ? $alternativas->firstWhere('correta', true)
                : $alternativas->firstWhere('correta', false);
            $tentativas->salvarResposta($tentativa, $questao->id, ['alternativa_id' => $escolhida->id]);
            $objetivas++;
        }
    }

    // ---------------------------------------------------------------- pessoas

    private function carregarPessoas(Tenant $tenant): void
    {
        $admin = User::query()->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))->orderBy('id')->firstOrFail();
        $this->admin = $admin;
        $this->instrutora = User::query()->where('email', 'helena.duarte@' . 'demo.sysgov.local')->firstOrFail();
        foreach (['carlos.menezes', 'fernanda.rocha', 'joao.lima', 'luciana.prado'] as $login) {
            $this->alunos[$login] = User::query()->where('email', "{$login}@demo.sysgov.local")->firstOrFail();
        }
    }

    /**
     * Executa com $user como usuário da requisição — o AuditLogger lê o autor de request()->user().
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

    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}
