<?php

declare(strict_types=1);

namespace Modules\Vistoria\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Pergunta;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\AssinaturaService;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ExecucaoVistoriaService;
use Modules\Vistoria\Services\FormularioService;
use Modules\Vistoria\Services\LocalFiscalizavelService;
use Modules\Vistoria\Services\OrdemServicoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Services\ReinspecaoService;

/**
 * Massa de dados de demonstração do módulo Vistoria e Inspeção — fiscalização de
 * campo da Secretaria de Agricultura:
 *
 *  - pré-requisitos que o módulo exige do tenant: a unidade organizacional da
 *    Secretaria, o vínculo dos fiscais a ela e produtores/estabelecimentos no
 *    Cadastro Único (Pessoas);
 *  - 5 modelos de formulário (checklist) e 24 locais fiscalizáveis;
 *  - cerca de 48 ordens de serviço em todas as situações: agendadas (futuras e
 *    atrasadas), em execução, canceladas e concluídas (regulares ou irregulares);
 *  - nas irregulares, o documento emitido (notificação, auto de infração, termo
 *    de embargo ou de apreensão) com PDF, assinatura ou recusa, reinspeção
 *    agendada/constatada e o processo sancionatório em cada fase (aberto, em
 *    defesa, em julgamento, penalidade aplicada, arquivado, em recurso, concluído).
 *
 * Tudo passa pelos Services do módulo (numeração, PDF, auditoria, regras de
 * transição); só as datas são reescritas depois, para a linha do tempo ficar
 * coerente nos últimos meses. As fotos e as assinaturas são imagens sintéticas.
 * Os CPFs/CNPJs são gerados (dígitos válidos, mas fictícios) — podem coincidir com
 * documentos reais por acaso; remova a massa antes de qualquer uso real.
 *
 * Uso: php artisan db:seed --force --class='Modules\Vistoria\Database\Seeders\VistoriaDadosDemonstracaoSeeder'
 * Não roda se o tenant já tiver locais fiscalizáveis (evita duplicar).
 */
final class VistoriaDadosDemonstracaoSeeder extends Seeder
{
    private const CENTRO_LAT = -25.5930;

    private const CENTRO_LNG = -49.4100;

    private const OPCOES = ['Conforme', 'Não conforme', 'Não se aplica'];

    private User $fiscalA;

    private User $fiscalB;

    private OrgUnit $secretaria;

    /** @var array<int, Pessoa> */
    private array $pessoas = [];

    /** @var array<int, LocalFiscalizavel> */
    private array $locais = [];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear em Vistoria.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (LocalFiscalizavel::query()->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem locais fiscalizáveis — nada a fazer.");
            return;
        }

        $usuarios = $tenant->users()->orderBy('users.id')->limit(2)->get();
        [$a, $b] = [$usuarios->get(0), $usuarios->get(1)];
        if (!$a instanceof User || !$b instanceof User) {
            $this->informar('São necessários dois usuários no tenant (os fiscais).', aviso: true);
            return;
        }
        [$this->fiscalA, $this->fiscalB] = [$a, $b];

        // Tudo ou nada: se um cenário falhar, nada fica gravado (o guard acima bloquearia
        // uma nova execução sobre dados parciais). Os arquivos já gravados em disco ficam órfãos.
        $total = DB::transaction(function (): int {
            $this->prepararSecretaria();
            $this->criarPessoas();
            $this->criarModelos();
            $this->criarLocais();

            $total = 0;
            foreach ($this->cenarios() as $i => $cenario) {
                $this->executarCenario($cenario, $i);
                $total++;
            }

            return $total;
        });

        $this->informar("{$total} ordens de serviço de demonstração (e seus desdobramentos) criadas no tenant [{$tenant->id}] {$tenant->name}.");
    }

    // ------------------------------------------------------- pré-requisitos

    private function prepararSecretaria(): void
    {
        $this->secretaria = OrgUnit::query()->where('code', 'SEC-AGR')->first()
            ?? OrgUnit::create([
                'name' => 'Secretaria Municipal de Agricultura',
                'code' => 'SEC-AGR',
                'acronym' => 'SEMAGRI',
                'type' => 'secretaria',
                'level' => 1,
                'path' => '0',
                'order' => 1,
                'is_active' => true,
            ]);

        if ($this->secretaria->path === '0') {
            $this->secretaria->update(['path' => (string) $this->secretaria->id]);
        }

        foreach ([$this->fiscalA, $this->fiscalB] as $user) {
            OrgUnitUser::query()->firstOrCreate(
                ['org_unit_id' => $this->secretaria->id, 'user_id' => $user->id],
                ['role' => 'membro', 'is_primary' => false],
            );
        }
    }

    private function criarPessoas(): void
    {
        $fisicas = ['Antônio Carlos Ribeiro', 'Maria Aparecida Souza', 'José Roberto Almeida', 'Luiz Fernando Pereira', 'Ana Paula Martins', 'Paulo Sérgio Nogueira', 'Francisca das Dores Lima', 'Carlos Eduardo Teixeira', 'Rosa Maria Batista', 'Marcos Vinícius Barros', 'Sebastião Gomes da Silva', 'Teresinha de Jesus Rocha'];
        $juridicas = ['Agropecuária Boa Safra Ltda.', 'Casa do Produtor Insumos Agrícolas Ltda.', 'Laticínios Vale Verde Ltda.', 'Frigorífico Santa Clara Ltda.'];

        foreach ($fisicas as $i => $nome) {
            $this->pessoas[] = Pessoa::create([
                'tipo' => 'fisica',
                'documento' => $this->gerarCpf(310200000 + $i * 7919137),
                'nome' => $nome,
                'sexo' => $i % 2 === 0 ? 'M' : 'F',
                'status' => 'ativo',
            ]);
        }

        foreach ($juridicas as $i => $razao) {
            $this->pessoas[] = Pessoa::create([
                'tipo' => 'juridica',
                'documento' => $this->gerarCnpj(41230000 + $i * 83117),
                'nome' => $razao,
                'razao_social' => $razao,
                'nome_fantasia' => Str::before($razao, ' Ltda.'),
                'status' => 'ativo',
            ]);
        }
    }

    private function criarModelos(): void
    {
        $service = app(FormularioService::class);

        $modelos = [
            'producao_animal' => ['Inspeção de produção animal', ['Os animais possuem vacinação em dia (febre aftosa, brucelose)?', 'As instalações estão limpas e em bom estado de conservação?', 'Há controle sanitário e registro de movimentação do rebanho?', 'Os medicamentos veterinários estão armazenados corretamente?', 'O destino dos resíduos e dejetos é adequado?']],
            'producao_vegetal' => ['Vistoria de produção vegetal', ['O produtor possui receituário agronômico para os defensivos aplicados?', 'As embalagens vazias de agrotóxicos são destinadas corretamente?', 'O armazenamento de defensivos atende às normas?', 'Há uso de EPI pelos trabalhadores na aplicação?', 'A propriedade respeita as faixas de proteção de nascentes e cursos d’água?']],
            'agroindustria' => ['Inspeção de agroindústria', ['O estabelecimento possui registro no serviço de inspeção?', 'As boas práticas de fabricação estão sendo cumpridas?', 'Há controle de temperatura nas câmaras de armazenamento?', 'Os produtos estão rotulados conforme a legislação?', 'O controle de pragas é realizado e documentado?']],
            'comercio_insumos' => ['Fiscalização de comércio de insumos', ['O comércio possui licença e responsável técnico habilitado?', 'Os produtos estão dentro do prazo de validade?', 'O armazenamento de defensivos está segregado e sinalizado?', 'As notas fiscais de origem dos produtos estão disponíveis?', 'Há procedimento de devolução de embalagens vazias?']],
            'outro' => ['Vistoria geral de feiras e eventos', ['O espaço possui licença e alvará de funcionamento?', 'Os produtos expostos têm procedência identificada?', 'As condições de higiene das bancas estão adequadas?', 'Os alimentos perecíveis estão mantidos sob refrigeração?', 'Há extintores e saídas de emergência sinalizados?']],
        ];

        foreach ($modelos as $tipo => [$nome, $enunciados]) {
            $perguntas = [];
            foreach ($enunciados as $enunciado) {
                $perguntas[] = ['enunciado' => $enunciado, 'tipo' => Pergunta::TIPO_MULTIPLA_ESCOLHA, 'opcoes' => self::OPCOES, 'obrigatoria' => true];
            }
            $perguntas[] = ['enunciado' => 'Observações do fiscal', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE, 'obrigatoria' => false];
            $perguntas[] = ['enunciado' => 'Foto geral do local vistoriado', 'tipo' => Pergunta::TIPO_FOTO, 'obrigatoria' => false];

            $service->criarModeloFormulario([
                'tipo_fiscalizacao' => $tipo,
                'nome' => $nome,
                'descricao' => 'Checklist padrão da Secretaria de Agricultura.',
                'perguntas' => $perguntas,
            ]);
        }
    }

    private function criarLocais(): void
    {
        $service = app(LocalFiscalizavelService::class);

        // [nome, tipo, classificação, índice do proprietário, endereço]
        $linhas = [
            ['Sítio Boa Esperança', 'propriedade_rural', 'producao_animal', 0, 'Estrada do Sertão, km 7'],
            ['Fazenda Três Irmãos', 'propriedade_rural', 'producao_animal', 1, 'Estrada Rural do Capivari, km 12'],
            ['Chácara Recanto das Águas', 'propriedade_rural', 'producao_vegetal', 2, 'Estrada do Cercadinho, 340'],
            ['Granja São José', 'propriedade_rural', 'producao_animal', 3, 'Estrada da Roseira, km 3'],
            ['Sítio Vale Verde', 'propriedade_rural', 'producao_vegetal', 4, 'Estrada Velha de Campo Largo, km 9'],
            ['Fazenda Santa Luzia', 'propriedade_rural', 'producao_vegetal', 5, 'Rodovia do Contorno, km 21'],
            ['Sítio Pé de Serra', 'propriedade_rural', 'producao_animal', 6, 'Estrada do Guajuvira, km 5'],
            ['Chácara Flor do Campo', 'propriedade_rural', 'producao_vegetal', 7, 'Estrada do Passaúna, 1200'],
            ['Propriedade Rural Ribeirão Claro', 'propriedade_rural', 'producao_animal', 8, 'Estrada do Ribeirão Claro, km 14'],
            ['Sítio Santa Rita', 'propriedade_rural', 'producao_vegetal', 9, 'Estrada da Barra, km 2'],
            ['Agropecuária Boa Safra', 'estabelecimento_comercial', 'comercio_insumos', 12, 'Av. das Indústrias, 1450'],
            ['Casa do Produtor Insumos', 'estabelecimento_comercial', 'comercio_insumos', 13, 'Rua XV de Novembro, 820'],
            ['Agroveterinária Campo Verde', 'estabelecimento_comercial', 'comercio_insumos', 10, 'Rua Tiradentes, 95'],
            ['Armazém Rural do Sul', 'estabelecimento_comercial', 'comercio_insumos', 11, 'Rodovia do Xisto, km 4'],
            ['Laticínios Vale Verde', 'estabelecimento_comercial', 'agroindustria', 14, 'Estrada do Leite, 800'],
            ['Frigorífico Santa Clara', 'estabelecimento_comercial', 'agroindustria', 15, 'Distrito Industrial, lote 12'],
            ['Agroindústria Doces da Roça', 'estabelecimento_comercial', 'agroindustria', 4, 'Estrada do Doce, 55'],
            ['Casa de Carnes Rural', 'estabelecimento_comercial', 'agroindustria', 3, 'Rua Marechal Deodoro, 410'],
            ['Feira do Produtor — Centro', 'feira', 'outro', 0, 'Praça Central'],
            ['Feira Livre do Bairro Alto', 'feira', 'outro', 1, 'Rua das Flores, s/n'],
            ['Feira da Agricultura Familiar', 'feira', 'outro', 2, 'Av. Brasil, 2200'],
            ['Exposição Agropecuária Municipal', 'evento', 'outro', 12, 'Parque de Exposições'],
            ['Festa do Colono', 'evento', 'outro', 5, 'Salão Paroquial'],
            ['Leilão de Gado Santa Fé', 'evento', 'producao_animal', 6, 'Parque de Exposições'],
        ];

        foreach ($linhas as $i => [$nome, $tipo, $classificacao, $dono, $endereco]) {
            $this->locais[] = $service->criarLocal([
                'proprietario_pessoa_id' => $this->pessoas[$dono]->id,
                'nome' => $nome,
                'tipo' => $tipo,
                'classificacao_atividade' => $classificacao,
                'latitude' => round(self::CENTRO_LAT + (($i * 37) % 21 - 10) * 0.012, 7),
                'longitude' => round(self::CENTRO_LNG + (($i * 53) % 21 - 10) * 0.012, 7),
                'endereco' => $endereco . ' — Zona ' . ($tipo === 'propriedade_rural' ? 'rural' : 'urbana'),
            ]);
        }
    }

    // ------------------------------------------------------------ cenários

    /**
     * Cada cenário: dias atrás em que a vistoria ocorreu (negativo = futura),
     * tipo da ação, criticidade e o desfecho.
     *
     * - situacao: agendada | atrasada | em_execucao | cancelada | concluida
     * - documento: null | notificacao | auto_infracao | termo_embargo | termo_apreensao
     * - assinatura: assinada | recusada | pendente
     * - processo: aberto | defesa | julgamento | penalidade | arquivado | recurso | concluido
     * - reinspecao: pendente | regularizado | nao_regularizado
     *
     * @return array<int, array<string, mixed>>
     */
    private function cenarios(): array
    {
        $c = static fn (int $dias, string $situacao, string $acao = 'vistoria_rotina', string $crit = 'media', ?string $doc = null, array $extra = []): array => [
            'dias' => $dias, 'situacao' => $situacao, 'acao' => $acao, 'criticidade' => $crit, 'documento' => $doc,
            'prazo' => 15, 'assinatura' => 'assinada', 'processo' => null, 'reinspecao' => 'pendente', ...$extra,
        ];

        return [
            // Planejamento: agendadas futuras
            $c(-12, 'agendada'), $c(-9, 'agendada', 'inspecao_sanitaria', 'alta'), $c(-6, 'agendada', 'atendimento_denuncia', 'urgente'),
            $c(-4, 'agendada'), $c(-2, 'agendada', 'inspecao_sanitaria'), $c(-1, 'agendada', 'vistoria_rotina', 'baixa'),
            // Atrasadas, em execução e canceladas
            $c(4, 'atrasada'), $c(2, 'atrasada', 'atendimento_denuncia', 'alta'), $c(1, 'atrasada', 'inspecao_sanitaria'),
            $c(0, 'em_execucao', 'vistoria_rotina', 'alta'), $c(0, 'em_execucao', 'atendimento_denuncia', 'urgente'), $c(1, 'em_execucao'),
            $c(10, 'cancelada'), $c(20, 'cancelada', 'inspecao_sanitaria'),
            // Concluídas regulares
            $c(5, 'concluida'), $c(9, 'concluida', 'inspecao_sanitaria'), $c(14, 'concluida', 'vistoria_rotina', 'baixa'),
            $c(21, 'concluida'), $c(30, 'concluida', 'inspecao_sanitaria', 'alta'), $c(45, 'concluida', 'vistoria_rotina', 'baixa'),
            $c(60, 'concluida'), $c(80, 'concluida', 'atendimento_denuncia'),
            // Notificações com reinspeção
            $c(6, 'concluida', 'vistoria_rotina', 'media', 'notificacao', ['prazo' => 30, 'reinspecao' => 'pendente']),
            $c(12, 'concluida', 'inspecao_sanitaria', 'alta', 'notificacao', ['prazo' => 20, 'reinspecao' => 'pendente']),
            $c(40, 'concluida', 'vistoria_rotina', 'media', 'notificacao', ['prazo' => 15, 'reinspecao' => 'pendente']),
            $c(50, 'concluida', 'vistoria_rotina', 'media', 'notificacao', ['prazo' => 20, 'reinspecao' => 'regularizado']),
            $c(70, 'concluida', 'inspecao_sanitaria', 'media', 'notificacao', ['prazo' => 30, 'reinspecao' => 'regularizado']),
            $c(55, 'concluida', 'atendimento_denuncia', 'alta', 'notificacao', ['prazo' => 15, 'reinspecao' => 'nao_regularizado']),
            $c(75, 'concluida', 'vistoria_rotina', 'media', 'notificacao', ['prazo' => 20, 'reinspecao' => 'nao_regularizado']),
            // Autos de infração e processos sancionatórios
            $c(3, 'concluida', 'atendimento_denuncia', 'urgente', 'auto_infracao', ['assinatura' => 'pendente', 'processo' => 'aberto']),
            $c(5, 'concluida', 'inspecao_sanitaria', 'alta', 'auto_infracao', ['processo' => 'aberto']),
            $c(9, 'concluida', 'vistoria_rotina', 'alta', 'auto_infracao', ['processo' => 'defesa']),
            $c(8, 'concluida', 'atendimento_denuncia', 'alta', 'auto_infracao', ['assinatura' => 'recusada', 'processo' => 'defesa']),
            $c(16, 'concluida', 'inspecao_sanitaria', 'alta', 'auto_infracao', ['assinatura' => 'recusada', 'processo' => 'julgamento']),
            $c(22, 'concluida', 'vistoria_rotina', 'alta', 'auto_infracao', ['processo' => 'penalidade']),
            $c(21, 'concluida', 'inspecao_sanitaria', 'urgente', 'auto_infracao', ['processo' => 'penalidade']),
            $c(28, 'concluida', 'atendimento_denuncia', 'media', 'auto_infracao', ['processo' => 'arquivado', 'reinspecao' => 'regularizado']),
            $c(33, 'concluida', 'vistoria_rotina', 'alta', 'auto_infracao', ['processo' => 'recurso']),
            $c(48, 'concluida', 'inspecao_sanitaria', 'alta', 'auto_infracao', ['processo' => 'concluido', 'reinspecao' => 'nao_regularizado']),
            $c(90, 'concluida', 'atendimento_denuncia', 'urgente', 'auto_infracao', ['processo' => 'concluido', 'reinspecao' => 'regularizado']),
            // Termos de embargo e apreensão
            $c(7, 'concluida', 'inspecao_sanitaria', 'urgente', 'termo_embargo', ['prazo' => 20]),
            $c(35, 'concluida', 'atendimento_denuncia', 'alta', 'termo_embargo', ['prazo' => 30, 'reinspecao' => 'regularizado']),
            $c(4, 'concluida', 'inspecao_sanitaria', 'alta', 'termo_apreensao', ['prazo' => null, 'assinatura' => 'recusada']),
            $c(26, 'concluida', 'atendimento_denuncia', 'media', 'termo_apreensao', ['prazo' => null]),
        ];
    }

    /** @param array<string, mixed> $cenario */
    private function executarCenario(array $cenario, int $i): void
    {
        $local = $this->locais[$i % count($this->locais)];
        $fiscal = $i % 3 === 0 ? null : ($i % 2 === 0 ? $this->fiscalA : $this->fiscalB);
        $quando = Carbon::today()->subDays((int) $cenario['dias'])->setTime(8 + $i % 8, ($i * 11) % 60);

        $ordem = $this->como($this->fiscalA, fn () => app(OrdemServicoService::class)->criarOrdemServico([
            'local_id' => $local->id,
            'org_unit_id' => $this->secretaria->id,
            'fiscal_id' => $fiscal?->id,
            'tipo_acao' => $cenario['acao'],
            'criticidade' => $cenario['criticidade'],
            'data_prevista' => $quando->toDateString(),
            'roteiro_deslocamento' => 'Saída da Secretaria às 8h. ' . ($local->tipo === 'propriedade_rural' ? 'Acesso por estrada de terra; levar kit de coleta.' : 'Atendimento no horário comercial.'),
        ]));
        $ordem->refresh();
        $this->datarOrdem($ordem->id, $quando);

        switch ($cenario['situacao']) {
            case 'em_execucao':
                $ordem->update(['status' => OrdemServico::STATUS_EM_EXECUCAO]);
                return;
            case 'cancelada':
                $ordem->update(['status' => OrdemServico::STATUS_CANCELADA]);
                return;
            case 'agendada':
            case 'atrasada':
                return;
        }

        $fiscalExecutor = User::find($ordem->fiscal_id) ?? $this->fiscalA;
        $irregular = $cenario['documento'] !== null;

        $execucao = $this->como($fiscalExecutor, fn () => app(ExecucaoVistoriaService::class)->sincronizar(
            $fiscalExecutor,
            $ordem,
            (string) Str::uuid(),
            $this->dadosExecucao($ordem, $quando, $irregular),
        ))['execucao'];

        $ordem->update(['resultado' => $irregular ? 'irregular' : 'regular']);
        DB::table('vistoria_execucoes')->where('id', $execucao->id)->update([
            'created_at' => $quando->copy()->addHours(2), 'updated_at' => $quando->copy()->addHours(2),
            'sincronizado_em' => $quando->copy()->addHours(2),
            'iniciado_em_dispositivo' => $quando, 'concluido_em_dispositivo' => $quando->copy()->addHour(),
        ]);

        if (!$irregular) {
            return;
        }

        $this->como($fiscalExecutor, fn () => $this->desdobrarIrregularidade($cenario, $execucao->id, $fiscalExecutor, $quando, $local));
    }

    /**
     * @param array<string, mixed> $cenario
     */
    private function desdobrarIrregularidade(array $cenario, int $execucaoId, User $fiscal, Carbon $quando, LocalFiscalizavel $local): void
    {
        $execucao = \Modules\Vistoria\Models\ExecucaoVistoria::findOrFail($execucaoId);
        $tipo = (string) $cenario['documento'];
        $prazo = $cenario['prazo'];

        $documento = $this->como($fiscal, fn () => app(DocumentoService::class)->emitirDocumento($execucao, $tipo, [
            'irregularidade' => $this->irregularidade($local),
            'enquadramento_legal' => 'Lei Municipal de Defesa Agropecuária, art. 12, incisos II e IV, e regulamento da Secretaria de Agricultura.',
            'prazo_dias' => $prazo,
        ]));

        $this->assinar($documento, (string) $cenario['assinatura'], $fiscal);

        // Datas do documento, da reinspeção e do processo, a partir do dia da vistoria.
        $prazoLimite = $prazo !== null ? $quando->copy()->addDays((int) $prazo) : null;
        DB::table('vistoria_documentos')->where('id', $documento->id)->update([
            'created_at' => $quando->copy()->addHours(3), 'updated_at' => $quando->copy()->addHours(3),
            'prazo_limite' => $prazoLimite?->toDateString(),
        ]);

        $reinspecao = Reinspecao::query()->where('documento_id', $documento->id)->first();
        if ($reinspecao !== null) {
            $this->concluirReinspecao($reinspecao, (string) $cenario['reinspecao'], $prazoLimite ?? $quando);
        }

        $processo = ProcessoSancionatorio::query()->where('documento_id', $documento->id)->first();
        if ($processo !== null && $cenario['processo'] !== null) {
            $this->avancarProcesso($processo, (string) $cenario['processo'], $quando->copy()->addHours(3));
        } elseif ($processo !== null) {
            $this->datarProcesso($processo->id, $quando->copy()->addHours(3));
        }
    }

    // ------------------------------------------------------ desdobramentos

    private function assinar(Documento $documento, string $modo, User $fiscal): void
    {
        $service = app(AssinaturaService::class);

        if ($modo === 'assinada') {
            $this->como($fiscal, fn () => $service->sincronizarAssinatura($documento, (string) Str::uuid(), [
                'papel' => 'autuado',
                'imagem_base64' => $this->assinaturaPng((int) $documento->id),
                'tracado_vetorial' => [[10, 40], [40, 12], [70, 44], [100, 14], [150, 36]],
                'latitude' => self::CENTRO_LAT,
                'longitude' => self::CENTRO_LNG,
                'coletado_em_dispositivo' => now()->toIso8601String(),
            ]));
        } elseif ($modo === 'recusada') {
            $this->como($fiscal, fn () => $service->registrarRecusa($documento, (string) Str::uuid(), [
                'papel' => 'autuado',
                'motivo' => 'O autuado recusou-se a assinar alegando discordância com a autuação.',
                'testemunha_pessoa_id' => $this->pessoas[($documento->id) % 12]->id,
                'latitude' => self::CENTRO_LAT,
                'longitude' => self::CENTRO_LNG,
                'coletado_em_dispositivo' => now()->toIso8601String(),
            ]));
        }
    }

    private function concluirReinspecao(Reinspecao $reinspecao, string $estado, Carbon $limite): void
    {
        DB::table('vistoria_reinspecoes')->where('id', $reinspecao->id)->update(['data_limite' => $limite->toDateString()]);

        if ($reinspecao->ordem_servico_reinspecao_id !== null) {
            DB::table('vistoria_ordens_servico')->where('id', $reinspecao->ordem_servico_reinspecao_id)->update([
                'data_prevista' => $limite->toDateString(),
            ]);
        }

        if ($estado === 'pendente') {
            return;
        }

        $regularizado = $estado === 'regularizado';
        app(ReinspecaoService::class)->constatarRegularizacao(
            $reinspecao,
            $regularizado,
            $regularizado ? 'Irregularidades sanadas; local em conformidade na reinspeção.' : 'As irregularidades persistem; prazo encerrado sem regularização.',
        );

        $constatada = $limite->copy()->addDay()->setTime(10, 0);
        DB::table('vistoria_reinspecoes')->where('id', $reinspecao->id)->update(['constatada_em' => $constatada]);

        if ($reinspecao->ordem_servico_reinspecao_id !== null) {
            DB::table('vistoria_ordens_servico')->where('id', $reinspecao->ordem_servico_reinspecao_id)->update([
                'status' => OrdemServico::STATUS_CONCLUIDA,
                'resultado' => $regularizado ? 'regular' : 'irregular',
            ]);
        }
    }

    private function avancarProcesso(ProcessoSancionatorio $processo, string $estado, Carbon $abertura): void
    {
        $service = app(ProcessoSancionatorioService::class);
        $julgador = $this->fiscalB;
        $penalidade = 150000 + ($processo->id % 7) * 275000;

        $comDefesa = in_array($estado, ['defesa', 'penalidade', 'arquivado', 'recurso', 'concluido'], true);

        if ($estado === 'julgamento') {
            $service->registrarRevelia($processo);
        }
        if ($comDefesa) {
            $service->apresentarDefesa($processo, 'O autuado apresenta defesa alegando que as não conformidades foram sanadas e que não houve dolo, requerendo o arquivamento ou a conversão da multa em advertência.');
        }
        if (in_array($estado, ['penalidade', 'recurso', 'concluido'], true)) {
            $service->julgar($processo, ProcessoSancionatorio::DECISAO_PROCEDENTE, 'Infração comprovada pelo auto e pelas evidências da vistoria. A defesa não afasta as irregularidades constatadas. Aplica-se multa conforme a gradação legal.', $julgador, $penalidade);
        }
        if ($estado === 'arquivado') {
            $service->julgar($processo, ProcessoSancionatorio::DECISAO_IMPROCEDENTE, 'A defesa comprovou a regularização antes da autuação. Arquiva-se o processo sem aplicação de penalidade.', $julgador);
        }
        if (in_array($estado, ['recurso', 'concluido'], true)) {
            $service->apresentarRecurso($processo, 'Recurso contra a penalidade aplicada, requerendo a redução do valor da multa em razão da primariedade do autuado.');
        }
        if ($estado === 'concluido') {
            $service->julgarRecurso(
                $processo,
                $processo->id % 2 === 0 ? ProcessoSancionatorio::RECURSO_IMPROVIDO : ProcessoSancionatorio::RECURSO_PROVIDO,
                'Recurso analisado pela chefia; decisão fundamentada nos autos, encerrando a esfera administrativa.',
                $julgador,
            );
        }

        $this->datarProcesso($processo->id, $abertura);
    }

    /** Reescreve as datas do processo conforme a linha do tempo a partir da abertura. */
    private function datarProcesso(int $id, Carbon $abertura): void
    {
        $linha = DB::table('vistoria_processos_sancionatorios')->where('id', $id)->first();
        if ($linha === null) {
            return;
        }

        $dados = [
            'created_at' => $abertura,
            'updated_at' => $abertura,
            'prazo_defesa_limite' => $abertura->copy()->addDays(10)->toDateString(),
        ];

        $defesa = $abertura->copy()->addDays(4);
        $julgado = $abertura->copy()->addDays($linha->defesa_apresentada_em !== null ? 12 : 14);
        $recurso = $julgado->copy()->addDays(5);
        $decidido = $julgado->copy()->addDays(15);

        if ($linha->defesa_apresentada_em !== null) {
            $dados['defesa_apresentada_em'] = $defesa;
        }
        if ($linha->julgado_em !== null) {
            $dados['julgado_em'] = $julgado;
            $dados['updated_at'] = $julgado;
        }
        if ($linha->prazo_recurso_limite !== null) {
            $dados['prazo_recurso_limite'] = $julgado->copy()->addDays(10)->toDateString();
        }
        if ($linha->recurso_apresentado_em !== null) {
            $dados['recurso_apresentado_em'] = $recurso;
            $dados['updated_at'] = $recurso;
        }
        if ($linha->recurso_decidido_em !== null) {
            $dados['recurso_decidido_em'] = $decidido;
            $dados['concluido_em'] = $decidido;
            $dados['updated_at'] = $decidido;
        }

        DB::table('vistoria_processos_sancionatorios')->where('id', $id)->update($dados);
    }

    private function datarOrdem(int $id, Carbon $quando): void
    {
        DB::table('vistoria_ordens_servico')->where('id', $id)->update([
            'created_at' => $quando->copy()->subDays(5), 'updated_at' => $quando,
        ]);
    }

    // -------------------------------------------------------------- dados

    /**
     * @return array<string, mixed>
     */
    private function dadosExecucao(OrdemServico $ordem, Carbon $quando, bool $irregular): array
    {
        $ordem->loadMissing('local');
        $modelo = app(FormularioService::class)->resolverParaOrdem($ordem);
        $respostas = [];

        if ($modelo instanceof ModeloFormulario) {
            $naoConformes = 0;
            foreach ($modelo->perguntasAtivas as $pergunta) {
                $valor = null;
                if ($pergunta->tipo === Pergunta::TIPO_MULTIPLA_ESCOLHA) {
                    $nao = $irregular && $naoConformes < 2 && ($pergunta->ordem % 2 === 0);
                    $valor = $nao ? 'Não conforme' : 'Conforme';
                    $naoConformes += $nao ? 1 : 0;
                } elseif ($pergunta->tipo === Pergunta::TIPO_TEXTO_LIVRE) {
                    $valor = $irregular
                        ? 'Foram constatadas não conformidades. O responsável acompanhou a vistoria e foi orientado sobre as providências e prazos.'
                        : 'Local em condições regulares. Responsável colaborativo durante toda a vistoria.';
                } elseif ($pergunta->tipo === Pergunta::TIPO_FOTO && ($irregular || $ordem->id % 2 === 0)) {
                    $valor = $this->fotoJpeg($ordem->local->nome);
                }

                if ($valor === null) {
                    continue;
                }

                $respostas[] = [
                    'pergunta_id' => $pergunta->id,
                    'valor' => $valor,
                    'latitude' => (float) $ordem->local->latitude,
                    'longitude' => (float) $ordem->local->longitude,
                    'capturado_em' => $quando->copy()->addMinutes(20 + (int) $pergunta->ordem * 4)->toIso8601String(),
                ];
            }
        }

        return [
            'dados' => ['respostas' => $respostas, 'resultado' => $irregular ? 'irregular' : 'regular'],
            'iniciado_em_dispositivo' => $quando->toIso8601String(),
            'concluido_em_dispositivo' => $quando->copy()->addHour()->toIso8601String(),
        ];
    }

    private function irregularidade(LocalFiscalizavel $local): string
    {
        return match ($local->classificacao_atividade) {
            'producao_animal' => 'Rebanho sem comprovação de vacinação obrigatória e instalações com acúmulo de dejetos em desacordo com as normas sanitárias.',
            'producao_vegetal' => 'Armazenamento inadequado de defensivos agrícolas, ausência de receituário agronômico e embalagens vazias sem destinação correta.',
            'agroindustria' => 'Descumprimento das boas práticas de fabricação, produtos sem rotulagem adequada e ausência de controle de temperatura.',
            'comercio_insumos' => 'Comercialização de produtos com validade vencida e defensivos armazenados sem segregação e sinalização.',
            default => 'Produtos expostos sem identificação de procedência e condições de higiene inadequadas nas bancas.',
        };
    }

    // ------------------------------------------------------- imagens/doc.

    private function assinaturaPng(int $semente): string
    {
        $img = imagecreatetruecolor(300, 100);
        imagefill($img, 0, 0, (int) imagecolorallocate($img, 255, 255, 255));
        $tinta = (int) imagecolorallocate($img, 20, 30, 120);
        imagesetthickness($img, 3);
        $x = 15;
        $y = 60;
        for ($k = 0; $k < 9; $k++) {
            $nx = $x + 22 + ($semente + $k) % 9;
            $ny = 25 + (($semente * 7 + $k * 13) % 55);
            imageline($img, $x, $y, $nx, $ny, $tinta);
            [$x, $y] = [$nx, $ny];
        }
        imageline($img, 15, 85, 285, 85, $tinta);

        ob_start();
        imagepng($img);
        $bytes = (string) ob_get_clean();
        imagedestroy($img);

        return 'data:image/png;base64,' . base64_encode($bytes);
    }

    private function fotoJpeg(string $legenda): string
    {
        $img = imagecreatetruecolor(640, 480);
        for ($y = 0; $y < 480; $y++) {
            $cor = imagecolorallocate($img, 90 + (int) ($y / 8), 150 + (int) ($y / 12), 80);
            imageline($img, 0, $y, 640, $y, (int) $cor);
        }
        imagefilledrectangle($img, 0, 300, 640, 480, (int) imagecolorallocate($img, 96, 128, 56));
        imagefilledrectangle($img, 220, 180, 420, 320, (int) imagecolorallocate($img, 160, 120, 90));
        imagefilledpolygon($img, [200, 180, 320, 110, 440, 180], 3, (int) imagecolorallocate($img, 120, 60, 50));
        $branco = (int) imagecolorallocate($img, 255, 255, 255);
        imagestring($img, 5, 12, 12, 'FOTO DE DEMONSTRACAO', $branco);
        imagestring($img, 4, 12, 36, iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $legenda) ?: 'Local vistoriado', $branco);

        ob_start();
        imagejpeg($img, null, 85);
        $bytes = (string) ob_get_clean();
        imagedestroy($img);

        return 'data:image/jpeg;base64,' . base64_encode($bytes);
    }

    private function gerarCpf(int $base): string
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

    private function gerarCnpj(int $base): string
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

    // -------------------------------------------------------------- helpers

    /**
     * Executa $acao com $user como usuário da requisição (auditoria e listeners
     * leem request()->user(), que no console seria null).
     *
     * @template T
     * @param callable(): T $acao
     * @return T
     */
    private function como(User $user, callable $acao): mixed
    {
        $anterior = request()->getUserResolver();
        request()->setUserResolver(fn () => $user);

        try {
            return $acao();
        } finally {
            request()->setUserResolver($anterior);
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
