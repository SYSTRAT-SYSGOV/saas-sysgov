<?php

declare(strict_types=1);

namespace Modules\Cursos\Database\Seeders;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Admin\Models\Module;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\AulaService;
use Modules\Cursos\Services\CampoInscricaoService;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\ConfiguracaoPublicaService;
use Modules\Cursos\Services\CursoService;
use Modules\Cursos\Services\EncerramentoService;
use Modules\Cursos\Services\FormacaoService;
use Modules\Cursos\Services\InscricaoService;
use Modules\Cursos\Services\ModeloCertificadoService;
use Modules\Cursos\Services\PresencaService;
use Modules\Cursos\Services\TurmaService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use RuntimeException;

/**
 * Dados de demonstração do módulo Cursos — um cenário para cada situação
 * do fluxo: turma encerrada com certificados emitidos, turma lotada com
 * lista de espera, turma com aula acontecendo agora (para testar o QR de
 * check-in), evento com aprovação manual, curso em rascunho e uma formação.
 * O conteúdo da Fase 2 (materiais e avaliações) vem do CursosConteudoDemonstracaoSeeder.
 *
 * Fase 3 (tarefa 7.1): página pública habilitada, dois campos extras no
 * formulário de inscrição do curso de contratos, e um participante externo
 * de exemplo (mariana.freitas@fora.gov.br) já inscrito e com as respostas
 * do formulário.
 *
 * Tudo passa pelos Services (auditoria, outbox e regras valem como no uso
 * real). Cria usuários de demonstração (@demo.sysgov.local) com a senha
 * SENHA_DEMO para dar para entrar como instrutora e participantes — por isso
 * se recusa a rodar em produção.
 *
 * Uso: php artisan db:seed --class='Modules\Cursos\Database\Seeders\CursosDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver cursos (evita duplicar).
 */
final class CursosDadosDemonstracaoSeeder extends Seeder
{
    public const SENHA_DEMO = 'Cursos@Demo2026';

    private Tenant $tenant;

    private User $admin;

    private User $instrutora;

    /** @var list<User> */
    private array $participantes = [];

    /** @var list<OrgUnit> */
    private array $unidades = [];

    public function run(?int $tenantId = null): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Dados de demonstração não podem ser semeados em produção (usuários com senha conhecida).');
        }

        $tenant = $tenantId !== null ? Tenant::find($tenantId) : Tenant::where('slug', 'systrat')->first();
        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no módulo Cursos.');
            return;
        }

        $this->tenant = $tenant;
        app(TenantContext::class)->set($tenant);

        if (Curso::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem cursos — nada a fazer nos cursos da Fase 1.");
            // Ambientes semeados antes da Fase 2 ganham o conteúdo novo (idempotente).
            $this->semearConteudo($tenant->id);
            return;
        }

        (new CursosRbacSeeder())->run();
        $this->habilitarModulo($tenant);
        $this->criarPessoas($tenant);
        $this->criarUnidades($tenant);
        $this->vincularUnidades($tenant);

        $this->como($this->admin, fn () => app(ModeloCertificadoService::class)->criar([
            'nome' => 'Certificado padrão',
            'titulo' => 'Certificado',
            'corpo' => "Certificamos que {{participante}} concluiu {{curso}}, com carga horária de {{carga_horaria}}, realizado no período de {{periodo}}.\n\n{{orgao}}, {{data_emissao}}.",
            'padrao' => true,
            'assinaturas' => [
                ['nome' => 'Marta Ribeiro Alves', 'cargo' => 'Diretora da Escola de Governo'],
                ['nome' => $this->instrutora->name, 'cargo' => 'Instrutora'],
            ],
        ]));

        $lei = $this->cursoLei14133();
        $contratos = $this->cursoGestaoContratos();
        $this->eventoLgpd();
        $excel = $this->como($this->admin, fn () => app(CursoService::class)->criar([
            'titulo' => 'Excel para servidores', 'carga_horaria_minutos' => 720,
            'descricao' => 'Planilhas, fórmulas e tabelas dinâmicas aplicadas às rotinas administrativas.',
        ], $this->admin));

        $this->como($this->admin, fn () => app(FormacaoService::class)->criar(
            ['titulo' => 'Trilha de Contratações Públicas', 'descricao' => 'Do planejamento à fiscalização do contrato, na Lei 14.133/2021.'],
            [
                ['curso_id' => $lei->id, 'obrigatorio' => true],
                ['curso_id' => $contratos->id, 'obrigatorio' => true],
                ['curso_id' => $excel->id, 'obrigatorio' => false],
            ],
        ));

        $this->habilitarPaginaPublica();
        $campos = $this->camposFormularioInscricao($contratos);
        $this->inscreverExterno($contratos, $campos);

        $this->semearConteudo($tenant->id);

        $this->informar("Cursos de demonstração criados no tenant [{$tenant->id}] {$tenant->name}. Usuários @demo.sysgov.local com a senha " . self::SENHA_DEMO . '.');
    }

    /** Conteúdo da Fase 2, num seeder próprio e idempotente. */
    private function semearConteudo(int $tenantId): void
    {
        $conteudo = new CursosConteudoDemonstracaoSeeder();
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $conteudo->setCommand($this->command);
        }
        $conteudo->run($tenantId);
    }

    // ---------------------------------------------------------------- cenários

    /** Turma encerrada (certificados emitidos) + turma aberta lotada com fila. */
    private function cursoLei14133(): Curso
    {
        $curso = $this->cursoPublicado('Lei 14.133/2021 na prática', 960, 'Planejamento da contratação, modalidades, critérios de julgamento e gestão de riscos na nova lei de licitações.');
        $aulas = $this->aulas($curso, ['Planejamento e DFD', 'ETP e Mapa de Riscos', 'Modalidades e julgamento', 'Contratos e sanções'], 240);

        // Turma encerrada: 4 aulas no passado, 5 inscritos, um abaixo da frequência mínima.
        $encerrada = $this->turma($curso, 'Turma 2026/1', now()->subDays(40), now()->subDays(20), 25, 'presencial');
        $inscricoes = array_map(fn (User $p) => $this->inscrever($encerrada, $p, peloAdministrador: true), array_slice($this->participantes, 0, 5));
        foreach ($aulas as $i => $aula) {
            $inicio = now()->subDays(38 - $i * 5)->setTime(14, 0);
            $agendamento = $this->como($this->admin, fn () => app(TurmaService::class)->agendar($encerrada, $aula, $inicio->toDateTimeString(), $inicio->copy()->addHours(4)->toDateTimeString()));
            $presencas = [];
            foreach ($inscricoes as $n => $inscricao) {
                // O quinto participante falta em duas aulas: 50% < 75%, não conclui.
                $presencas[$inscricao->id] = !($n === 4 && $i >= 2) && !($n === 3 && $i === 1);
            }
            $this->como($this->instrutora, fn () => app(PresencaService::class)->registrarChamada($agendamento, $presencas, $this->instrutora));
        }
        $this->como($this->instrutora, fn () => app(EncerramentoService::class)->encerrar($encerrada->refresh(), $this->instrutora));

        // Um dos certificados emitidos fica revogado (cenário do relatório de capacitação, tarefa 5.1).
        $certificadoParaRevogar = Certificado::query()->whereHas('inscricao', fn ($q) => $q->where('turma_id', $encerrada->id))->first();
        if ($certificadoParaRevogar !== null) {
            $this->como($this->admin, fn () => app(CertificadoService::class)->revogar($certificadoParaRevogar, $this->admin, 'Certificado emitido com dados divergentes do participante — reemissão pendente.'));
        }

        // Turma aberta com 3 vagas: 3 confirmados e 2 na lista de espera.
        $aberta = $this->turma($curso, 'Turma 2026/2', now()->addDays(20), now()->addDays(50), 3, 'hibrido');
        foreach (array_slice($this->participantes, 1, 5) as $p) {
            $this->inscrever($aberta, $p);
        }
        foreach ($aulas as $i => $aula) {
            $inicio = now()->addDays(20 + $i * 7)->setTime(9, 0);
            $this->como($this->admin, fn () => app(TurmaService::class)->agendar($aberta, $aula, $inicio->toDateTimeString(), $inicio->copy()->addHours(4)->toDateTimeString()));
        }

        return $curso;
    }

    /** Turma em andamento: uma aula já realizada e outra acontecendo agora (QR de check-in). */
    private function cursoGestaoContratos(): Curso
    {
        $curso = $this->cursoPublicado('Gestão e fiscalização de contratos', 480, 'Papéis do gestor e do fiscal, medições, aditivos, reequilíbrio e aplicação de sanções.');
        [$aula1, $aula2, $aula3] = $this->aulas($curso, ['Gestor e fiscal do contrato', 'Medição e pagamento', 'Aditivos e sanções'], 160);

        // aceitaExternos: true — turma de exemplo aberta a participantes externos (tarefa 7.1, design D11).
        $turma = $this->turma($curso, 'Turma 2026/1', now()->subDays(7), now()->addDays(14), 20, 'presencial', aceitaExternos: true);
        $inscricoes = array_map(fn (User $p) => $this->inscrever($turma, $p, peloAdministrador: true), array_slice($this->participantes, 0, 4));

        $passada = $this->como($this->admin, fn () => app(TurmaService::class)->agendar($turma, $aula1, now()->subDays(5)->setTime(9, 0)->toDateTimeString(), now()->subDays(5)->setTime(11, 40)->toDateTimeString()));
        $this->como($this->instrutora, fn () => app(PresencaService::class)->registrarChamada(
            $passada,
            collect($inscricoes)->mapWithKeys(fn ($i, $n) => [$i->id => $n !== 2])->all(),
            $this->instrutora,
        ));

        // Aula "agora": começou há 30 minutos e vai até daqui a 3 horas.
        $this->como($this->admin, fn () => app(TurmaService::class)->agendar($turma, $aula2, now()->subMinutes(30)->toDateTimeString(), now()->addHours(3)->toDateTimeString()));
        $this->como($this->admin, fn () => app(TurmaService::class)->agendar($turma, $aula3, now()->addDays(7)->setTime(9, 0)->toDateTimeString(), now()->addDays(7)->setTime(11, 40)->toDateTimeString()));

        return $curso;
    }

    /** Evento online com aprovação manual: inscrições pendentes para aprovar. */
    private function eventoLgpd(): void
    {
        $evento = $this->cursoPublicado('Palestra: LGPD no serviço público', 120, 'Tratamento de dados pessoais pela administração pública e o papel do encarregado.', 'evento');
        [$aula] = $this->aulas($evento, ['Palestra e perguntas'], 120);

        $turma = $this->turma($evento, 'Edição única', now()->addDays(12), now()->addDays(12), 100, 'online', aprovacaoManual: true);
        $inicio = now()->addDays(12)->setTime(15, 0);
        $this->como($this->admin, fn () => app(TurmaService::class)->agendar($turma, $aula, $inicio->toDateTimeString(), $inicio->copy()->addHours(2)->toDateTimeString()));

        foreach (array_slice($this->participantes, 3, 3) as $p) {
            $this->inscrever($turma, $p);
        }
    }

    /** Página pública do órgão habilitada, com boas-vindas e termo de uso (tarefa 7.1, design D11). */
    private function habilitarPaginaPublica(): void
    {
        $this->como($this->admin, fn () => app(ConfiguracaoPublicaService::class)->atualizar($this->tenant, [
            'publico_habilitado' => true,
            'boas_vindas' => '<p>Conheça os cursos e eventos gratuitos oferecidos pela Escola de Governo e inscreva-se diretamente pelo catálogo abaixo.</p>',
            'documento_obrigatorio' => false,
            'termo' => ['texto' => '<p>Ao se cadastrar, você concorda com o uso dos seus dados para controle de frequência e emissão de certificado, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>'],
        ]));
    }

    /**
     * Campos extras do formulário de inscrição do curso de contratos (tarefa 7.1, design D9).
     *
     * @return list<CampoInscricao>
     */
    private function camposFormularioInscricao(Curso $curso): array
    {
        $servico = app(CampoInscricaoService::class);

        return [
            $this->como($this->admin, fn () => $servico->criar($curso, ['rotulo' => 'Órgão de origem', 'tipo' => 'texto', 'obrigatorio' => true])),
            $this->como($this->admin, fn () => $servico->criar($curso, [
                'rotulo' => 'Vínculo com a administração', 'tipo' => 'selecao', 'obrigatorio' => false,
                'opcoes' => ['Servidor efetivo', 'Comissionado', 'Terceirizado'],
            ])),
        ];
    }

    /**
     * Participante externo de exemplo (design D6/D7), cadastrado direto (sem o fluxo de
     * verificação de e-mail, que é o que a tarefa 7.3 testa de ponta a ponta no navegador) e
     * inscrito na turma de contratos aberta a externos, respondendo ao formulário da 7.1.
     *
     * @param list<CampoInscricao> $campos
     */
    private function inscreverExterno(Curso $curso, array $campos): void
    {
        $externo = User::updateOrCreate(
            ['email' => 'mariana.freitas@fora.gov.br'],
            ['name' => 'Mariana Freitas', 'password' => Hash::make(self::SENHA_DEMO), 'is_active' => true],
        );
        $this->tenant->users()->syncWithoutDetaching([$externo->id => ['status' => 'active', 'is_primary' => true]]);
        $this->atribuir($this->tenant, $externo, 'participante_externo_cursos');

        $config = app(ConfiguracaoPublicaService::class)->obter($this->tenant);
        Participante::updateOrCreate(
            ['tenant_id' => $this->tenant->id, 'user_id' => $externo->id],
            ['nome' => $externo->name, 'email' => $externo->email, 'origem' => Participante::ORIGEM_EXTERNO, 'consentimento_em' => now(), 'termo_versao' => $config['termo']['versao']],
        );

        $turma = Turma::query()->where('curso_id', $curso->id)->sole();
        $this->inscrever($turma, $externo, respostas: [
            ['campo_id' => $campos[0]->id, 'valor' => 'Secretaria de Administração'],
            ['campo_id' => $campos[1]->id, 'valor' => 'Servidor efetivo'],
        ]);
    }

    // ---------------------------------------------------------------- montagem

    private function cursoPublicado(string $titulo, int $minutos, string $descricao, string $tipo = 'curso'): Curso
    {
        return $this->como($this->admin, function () use ($titulo, $minutos, $descricao, $tipo): Curso {
            $servico = app(CursoService::class);
            $curso = $servico->criar(['tipo' => $tipo, 'titulo' => $titulo, 'descricao' => $descricao, 'carga_horaria_minutos' => $minutos], $this->admin);

            return $servico->alterarStatus($curso, StatusCurso::Publicado);
        });
    }

    /**
     * @param list<string> $titulos
     * @return list<Aula>
     */
    private function aulas(Curso $curso, array $titulos, int $duracao): array
    {
        return array_map(
            fn (string $t) => $this->como($this->admin, fn () => app(AulaService::class)->criar($curso, ['titulo' => $t, 'duracao_minutos' => $duracao])),
            $titulos,
        );
    }

    private function turma(Curso $curso, string $nome, \DateTimeInterface $inicio, \DateTimeInterface $fim, int $vagas, string $modalidade, bool $aprovacaoManual = false, bool $aceitaExternos = false): Turma
    {
        return $this->como($this->admin, fn () => app(TurmaService::class)->criar($curso, [
            'nome' => $nome,
            'data_inicio' => $inicio->format('Y-m-d'),
            'data_fim' => $fim->format('Y-m-d'),
            'inscricoes_inicio' => now()->subDays(60)->toDateTimeString(),
            'inscricoes_fim' => now()->addDays(10)->toDateTimeString(),
            'vagas' => $vagas,
            'modalidade' => $modalidade,
            'local' => $modalidade === 'online' ? null : 'Auditório da Escola de Governo',
            'link' => $modalidade === 'presencial' ? null : 'https://meet.example.gov.br/escola-de-governo',
            'aprovacao_manual' => $aprovacaoManual,
            'aceita_externos' => $aceitaExternos,
        ], [$this->instrutora->id]));
    }

    /**
     * @param list<array{campo_id: int, valor: mixed}> $respostas
     */
    private function inscrever(Turma $turma, User $user, bool $peloAdministrador = false, array $respostas = []): \Modules\Cursos\Models\Inscricao
    {
        $autor = $peloAdministrador ? $this->admin : $user;

        return $this->como($autor, function () use ($turma, $user, $autor, $peloAdministrador, $respostas) {
            $servico = app(InscricaoService::class);

            return $servico->inscrever($turma->refresh(), $servico->participanteDoUsuario($user), $autor, $peloAdministrador, $respostas);
        });
    }

    private function habilitarModulo(Tenant $tenant): void
    {
        $modulo = Module::query()->where('alias', 'cursos')->first();
        if ($modulo === null) {
            throw new RuntimeException('Módulo "cursos" não está no catálogo — rode php artisan module:register Cursos antes.');
        }
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(\App\Services\ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'cursos');
    }

    private function criarPessoas(Tenant $tenant): void
    {
        $primeiro = User::query()->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))->orderBy('id')->first();
        if ($primeiro === null) {
            throw new RuntimeException('O tenant precisa de ao menos um usuário (o Administrador dos dados de demonstração).');
        }
        $this->admin = $primeiro;
        $this->atribuir($tenant, $this->admin, 'admin_cursos');

        $this->instrutora = $this->usuarioDemo($tenant, 'Helena Duarte', 'helena.duarte', 'instrutor_cursos');

        $nomes = [
            'Carlos Menezes' => 'carlos.menezes', 'Fernanda Rocha' => 'fernanda.rocha', 'João Batista Lima' => 'joao.lima',
            'Luciana Prado' => 'luciana.prado', 'Rafael Nogueira' => 'rafael.nogueira', 'Sandra Vieira' => 'sandra.vieira',
        ];
        foreach ($nomes as $nome => $login) {
            $this->participantes[] = $this->usuarioDemo($tenant, $nome, $login, 'participante_cursos');
        }
    }

    /**
     * Duas unidades para o filtro por unidade do relatório de capacitação (tarefa 5.1).
     * Reaproveita a árvore do OrgChart se o tenant já tiver uma (ex.: `OrgChartDatabaseSeeder`);
     * senão cria uma raiz mínima só para isto, para não depender de outro seeder ter rodado.
     */
    private function criarUnidades(Tenant $tenant): void
    {
        $existentes = OrgUnit::query()->orderBy('path')->limit(2)->get();
        if ($existentes->count() >= 2) {
            $this->unidades = $existentes->all();
            return;
        }

        $secretaria1 = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Secretaria de Administração', 'code' => 'CUR-SMA', 'type' => 'secretaria', 'level' => 1, 'path' => '0']);
        $secretaria1->update(['path' => (string) $secretaria1->id]);

        $secretaria2 = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Secretaria de Educação', 'code' => 'CUR-SMED', 'type' => 'secretaria', 'level' => 1, 'path' => '0']);
        $secretaria2->update(['path' => (string) $secretaria2->id]);

        $this->unidades = [$secretaria1, $secretaria2];
    }

    /** Metade dos participantes de demonstração em cada unidade (idempotente por conta do guard em `run()`). */
    private function vincularUnidades(Tenant $tenant): void
    {
        if ($this->unidades === []) {
            return;
        }

        foreach ($this->participantes as $i => $participante) {
            $unidade = $this->unidades[$i % count($this->unidades)];
            OrgUnitUser::updateOrCreate(
                ['tenant_id' => $tenant->id, 'org_unit_id' => $unidade->id, 'user_id' => $participante->id],
                ['role' => 'membro'],
            );
        }
    }

    private function usuarioDemo(Tenant $tenant, string $nome, string $login, string $perfil): User
    {
        $user = User::updateOrCreate(
            ['email' => "{$login}@demo.sysgov.local"],
            ['name' => $nome, 'password' => Hash::make(self::SENHA_DEMO), 'is_active' => true],
        );
        $tenant->users()->syncWithoutDetaching([$user->id => ['status' => 'active', 'is_primary' => true]]);
        $this->atribuir($tenant, $user, $perfil);

        return $user;
    }

    private function atribuir(Tenant $tenant, User $user, string $perfil): void
    {
        $role = Role::query()->where('slug', $perfil)->where('tenant_id', $tenant->id)->firstOrFail();
        if (!$user->roles()->whereKey($role->id)->exists()) {
            $user->roles()->attach($role->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache($tenant->id);
    }

    /**
     * Executa com $user como usuário da requisição — o AuditLogger lê o
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
    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}
