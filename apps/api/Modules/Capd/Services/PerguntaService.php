<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\Pergunta;
use Modules\Capd\Models\PlanoCarreira;
use Modules\Capd\Models\Servidor;

/**
 * Gestão de Modelos de Formulário e Cadastro de Perguntas do Instrumento de Avaliação.
 *
 * Baseado no padrão CampoConfiguracao do Licita:
 * - Validação estrita de schema e tipos
 * - Suporte à "Escala Gráfica para Avaliação de Desempenho" (Chiavenato) graus 1 a 5
 * - Regras condicionais entre respostas
 * - Grupos com pesos ponderados
 * - Trava antileniência vinculada ao Diário de Bordo (CIT)
 * - Separação por Grupos Funcionais: Segurança Pública, Saúde, Magistério e Quadro Geral
 */
final class PerguntaService
{
    private const PRECISAO = 10;
    private const FATOR_CONVERSAO = '2.5';

    public function __construct(
        private readonly AuditLogger            $audit,
        private readonly TenantContext          $tenantContext,
        private readonly TravaElectronicaService $trava,
    ) {}

    /**
     * Identifica o grupo funcional/carreira com base no servidor, cargo ou lotação:
     * - seguranca: Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito, SMSP
     * - saude: Médicos, Enfermagem, Técnicos, Odontólogos, ACS/ACE, SMS
     * - magisterio: Professores, Pedagogos, Educadores Infantis, SMED
     * - geral: Quadro Geral Administrativo / Operacional
     *
     * @return array{chave: string, nome: string, codigo_modelo: string, descricao: string, icone: string}
     */
    public function identificarGrupoFuncional(?Servidor $servidor = null, ?string $cargo = null, ?string $lotacao = null): array
    {
        $planoCodigo = ($servidor !== null && $servidor->planoCarreira !== null) ? (string) $servidor->planoCarreira->codigo : null;
        if ($planoCodigo === 'SEGURANCA') {
            return [
                'chave'         => 'seguranca',
                'nome'          => 'Segurança Pública',
                'codigo_modelo' => 'FORM_SEGURANCA_V1',
                'descricao'     => 'Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito e Defesa Social (SMSP)',
                'icone'         => 'Shield',
            ];
        }
        if ($planoCodigo === 'SAUDE') {
            return [
                'chave'         => 'saude',
                'nome'          => 'Saúde Pública',
                'codigo_modelo' => 'FORM_SAUDE_V1',
                'descricao'     => 'Médicos, Enfermagem, Odontologia, Técnicos e Agentes de Saúde/Endemias (SMS)',
                'icone'         => 'HeartPulse',
            ];
        }
        if ($planoCodigo === 'MAGISTERIO') {
            return [
                'chave'         => 'magisterio',
                'nome'          => 'Magistério',
                'codigo_modelo' => 'FORM_MAGISTERIO_V1',
                'descricao'     => 'Professores, Pedagogos, Educadores e Especialistas de Educação (SMED)',
                'icone'         => 'GraduationCap',
            ];
        }

        $cargoServidor = $servidor !== null ? (string) ($servidor->cargo_efetivo ?? '') : '';
        $orgaoServidor = $servidor !== null ? (string) ($servidor->orgao_lotacao ?? '') : '';
        $lotacaoFisicaServidor = $servidor !== null ? (string) ($servidor->lotacao_fisica ?? '') : '';
        $orgUnitName = ($servidor !== null && $servidor->orgUnit !== null) ? (string) $servidor->orgUnit->name : '';
        $orgUnitCode = ($servidor !== null && $servidor->orgUnit !== null) ? (string) $servidor->orgUnit->code : '';

        $textoCargo = mb_strtolower(trim($cargoServidor . ' ' . ($cargo ?? '')));
        $textoLotacao = mb_strtolower(trim(
            $orgaoServidor . ' ' .
            $lotacaoFisicaServidor . ' ' .
            $orgUnitName . ' ' .
            $orgUnitCode . ' ' .
            ($lotacao ?? '')
        ));
        $textoGeral = $textoCargo . ' ' . $textoLotacao;

        // 1. Segurança Pública
        if (preg_match('/(guarda|gcm|seguran|vigilante|patrimonial|transito|trânsito|defesa civil|smsp|polic|polícia)/iu', $textoGeral)) {
            return [
                'chave'         => 'seguranca',
                'nome'          => 'Segurança Pública',
                'codigo_modelo' => 'FORM_SEGURANCA_V1',
                'descricao'     => 'Guarda Municipal, Agentes de Segurança Patrimonial, Trânsito e Defesa Social (SMSP)',
                'icone'         => 'Shield',
            ];
        }

        // 2. Saúde Pública
        if (preg_match('/(medico|médico|médic|medic|enferm|tecnico|técnico|odont|dentist|farmac|psicol|psicól|fisioter|saude|saúde|sms|upa|ubs|acs|ace|endemia|hospital|pronto socorro|clinic|clínic)/iu', $textoGeral)) {
            return [
                'chave'         => 'saude',
                'nome'          => 'Saúde Pública',
                'codigo_modelo' => 'FORM_SAUDE_V1',
                'descricao'     => 'Médicos, Enfermagem, Odontologia, Técnicos e Agentes de Saúde/Endemias (SMS)',
                'icone'         => 'HeartPulse',
            ];
        }

        // 3. Magistério
        if (preg_match('/(professor|docente|pedagog|educador|educac|educaç|smed|escola|cmei|creche|ensino)/iu', $textoGeral)) {
            return [
                'chave'         => 'magisterio',
                'nome'          => 'Magistério',
                'codigo_modelo' => 'FORM_MAGISTERIO_V1',
                'descricao'     => 'Professores, Pedagogos, Educadores e Especialistas de Educação (SMED)',
                'icone'         => 'GraduationCap',
            ];
        }

        // 4. Quadro Geral (Padrão)
        return [
            'chave'         => 'geral',
            'nome'          => 'Quadro Geral',
            'codigo_modelo' => 'FORM_GERAL_V1',
            'descricao'     => 'Cargos Administrativos, Operacionais, Obras, Finanças e Planejamento',
            'icone'         => 'Building2',
        ];
    }

    /**
     * Resolve o modelo de formulário de avaliação aplicável ao servidor ou cargo.
     */
    public function resolverModeloParaServidor(?Servidor $servidor = null, ?string $cargo = null, ?string $grupoFuncional = null): ?ModeloFormulario
    {
        $codigoModeloAlvo = null;
        if ($grupoFuncional !== null) {
            $codigoModeloAlvo = match (mb_strtolower($grupoFuncional)) {
                'seguranca', 'segurança' => 'FORM_SEGURANCA_V1',
                'saude', 'saúde'         => 'FORM_SAUDE_V1',
                'magisterio', 'magistério' => 'FORM_MAGISTERIO_V1',
                'geral'                  => 'FORM_GERAL_V1',
                default                  => null,
            };
        }

        if ($codigoModeloAlvo === null) {
            $grupoInfo = $this->identificarGrupoFuncional($servidor, $cargo);
            $codigoModeloAlvo = $grupoInfo['codigo_modelo'];
        }

        // Busca pelo código específico do grupo funcional
        $modelo = ModeloFormulario::with(['perguntasAtivas', 'planoCarreira'])
            ->ativos()
            ->where('codigo', $codigoModeloAlvo)
            ->orderByDesc('versao')
            ->first();

        if ($modelo !== null) {
            return $modelo;
        }

        // Se não encontrar pelo código direto, tenta pelo plano de carreira associado
        if ($servidor?->plano_carreira_id) {
            $modelo = ModeloFormulario::with(['perguntasAtivas', 'planoCarreira'])
                ->ativos()
                ->where('plano_carreira_id', $servidor->plano_carreira_id)
                ->orderByDesc('versao')
                ->first();

            if ($modelo !== null) {
                return $modelo;
            }
        }

        // Fallback para getModeloVigente padrão
        return $this->getModeloVigente($servidor?->plano_carreira_id, $cargo);
    }

    public function listarModelos(?int $planoCarreiraId = null, ?string $cargo = null, ?string $grupoFuncional = null): Collection
    {
        $query = ModeloFormulario::with(['perguntasAtivas', 'planoCarreira'])->ativos();

        if ($grupoFuncional !== null) {
            $codigoAlvo = match (mb_strtolower($grupoFuncional)) {
                'seguranca', 'segurança' => 'FORM_SEGURANCA_V1',
                'saude', 'saúde'         => 'FORM_SAUDE_V1',
                'magisterio', 'magistério' => 'FORM_MAGISTERIO_V1',
                'geral'                  => 'FORM_GERAL_V1',
                default                  => null,
            };
            if ($codigoAlvo) {
                $query->where('codigo', $codigoAlvo);
            }
        }

        if ($planoCarreiraId !== null) {
            $query->where('plano_carreira_id', $planoCarreiraId);
        }

        if ($cargo !== null) {
            $query->where(function ($q) use ($cargo): void {
                $q->whereNull('cargo')->orWhere('cargo', $cargo);
            });
        }

        return $query->orderByDesc('versao')->get();
    }

    public function getModeloVigente(?int $planoCarreiraId = null, ?string $cargo = null): ?ModeloFormulario
    {
        $query = ModeloFormulario::with(['perguntasAtivas'])->vigentes();

        if ($planoCarreiraId !== null) {
            $query->where(function ($q) use ($planoCarreiraId): void {
                $q->where('plano_carreira_id', $planoCarreiraId)->orWhereNull('plano_carreira_id');
            });
        }

        if ($cargo !== null) {
            $query->where(function ($q) use ($cargo): void {
                $q->where('cargo', $cargo)->orWhereNull('cargo');
            });
        }

        return $query->orderByDesc('plano_carreira_id')
            ->orderByDesc('cargo')
            ->orderByDesc('versao')
            ->first();
    }

    public function salvarModelo(array $dados): ModeloFormulario
    {
        $tenantId = (int) $this->tenantContext->id();

        return DB::transaction(function () use ($tenantId, $dados): ModeloFormulario {
            $codigo = (string) ($dados['codigo'] ?? 'MODELO_PADRAO');
            $versaoAtual = (int) (ModeloFormulario::where('tenant_id', $tenantId)
                ->where('codigo', $codigo)
                ->max('versao') ?? 0);

            $novaVersao = ! empty($dados['id']) ? (int) ($dados['versao'] ?? 1) : $versaoAtual + 1;

            $modelo = ModeloFormulario::updateOrCreate(
                [
                    'id'        => $dados['id'] ?? null,
                    'tenant_id' => $tenantId,
                ],
                [
                    'codigo'            => $codigo,
                    'nome'              => $dados['nome'] ?? 'Modelo de Avaliação de Desempenho',
                    'descricao'         => $dados['descricao'] ?? null,
                    'plano_carreira_id' => $dados['plano_carreira_id'] ?? null,
                    'cargo'             => $dados['cargo'] ?? null,
                    'versao'            => $novaVersao,
                    'vigencia_inicio'   => $dados['vigencia_inicio'] ?? now()->toDateString(),
                    'vigencia_fim'      => $dados['vigencia_fim'] ?? null,
                    'grupos'            => $dados['grupos'] ?? [
                        'assiduidade' => ['nome' => 'Assiduidade e Pontualidade', 'peso' => 20.0, 'ordem' => 1],
                        'disciplina'  => ['nome' => 'Disciplina e Ética', 'peso' => 20.0, 'ordem' => 2],
                        'competencias'=> ['nome' => 'Competências e Resultados', 'peso' => 60.0, 'ordem' => 3],
                    ],
                    'ativo'             => (bool) ($dados['ativo'] ?? true),
                ]
            );

            $this->audit->record(
                'capd',
                'modelo_formulario.salvo',
                "Modelo #{$modelo->id} ({$modelo->codigo} v{$modelo->versao}) salvo",
                null,
                $modelo->toArray()
            );

            return $modelo;
        });
    }

    public function salvarPergunta(ModeloFormulario $modelo, array $dados): Pergunta
    {
        $this->validarSchemaPergunta($dados);

        $tenantId = (int) $this->tenantContext->id();

        $pergunta = Pergunta::updateOrCreate(
            [
                'id'        => $dados['id'] ?? null,
                'tenant_id' => $tenantId,
                'modelo_id' => $modelo->id,
            ],
            [
                'codigo'              => (string) $dados['codigo'],
                'enunciado'           => (string) $dados['enunciado'],
                'tipo'                => (string) $dados['tipo'],
                'opcoes'              => $dados['opcoes'] ?? null,
                'peso'                => (float) ($dados['peso'] ?? 1.0),
                'grupo_key'           => (string) ($dados['grupo_key'] ?? 'geral'),
                'ordem'               => (int) ($dados['ordem'] ?? 0),
                'obrigatoria'         => (bool) ($dados['obrigatoria'] ?? true),
                'exige_evidencia'     => (bool) ($dados['exige_evidencia'] ?? false),
                'regras_condicionais' => $dados['regras_condicionais'] ?? null,
                'cargos_permitidos'   => $dados['cargos_permitidos'] ?? null,
                'ativo'               => (bool) ($dados['ativo'] ?? true),
            ]
        );

        $this->audit->record(
            'capd',
            'pergunta.salva',
            "Pergunta #{$pergunta->id} ({$pergunta->codigo}) salva no Modelo #{$modelo->id}",
            null,
            $pergunta->toArray()
        );

        return $pergunta;
    }

    public function excluirPergunta(Pergunta $pergunta): void
    {
        $id = $pergunta->id;
        $codigo = $pergunta->codigo;
        $pergunta->delete();

        $this->audit->record(
            'capd',
            'pergunta.excluida',
            "Pergunta #{$id} ({$codigo}) desativada/excluída",
            null,
            ['id' => $id, 'codigo' => $codigo]
        );
    }

    /**
     * Valida as respostas fornecidas contra o modelo e suas perguntas ativas.
     *
     * @param array<string, mixed> $respostas Keyed por pergunta_codigo
     *
     * @throws ValidationException
     */
    public function validarRespostas(
        ModeloFormulario $modelo,
        array $respostas,
        int $cicloId,
        int $servidorId
    ): void {
        $perguntas = $modelo->perguntasAtivas;
        $erros = [];

        foreach ($perguntas as $pergunta) {
            $codigo = $pergunta->codigo;
            $valor = $respostas[$codigo]['valor'] ?? $respostas[$codigo] ?? null;

            // 1. Avaliação de Regras Condicionais (exibição/obrigatoriedade)
            if (! empty($pergunta->regras_condicionais)) {
                $dependeDe = $pergunta->regras_condicionais['depende_de'] ?? null;
                $valorEsperado = $pergunta->regras_condicionais['valor_esperado'] ?? null;

                if ($dependeDe !== null) {
                    $respostaPai = $respostas[$dependeDe]['valor'] ?? $respostas[$dependeDe] ?? null;
                    if ($respostaPai != $valorEsperado) {
                        // Se a condição não foi satisfeita, a pergunta é opcional ou ignorada
                        continue;
                    }
                }
            }

            // 2. Campo obrigatório
            if ($pergunta->obrigatoria && ($valor === null || $valor === '')) {
                $erros["respostas.{$codigo}"] = ["A pergunta \"{$pergunta->enunciado}\" é de preenchimento obrigatório."];
                continue;
            }

            if ($valor === null || $valor === '') {
                continue;
            }

            // 3. Validação do tipo escala gráfica (1 a 5)
            if ($pergunta->tipo === Pergunta::TIPO_ESCALA_GRAFICA) {
                $grau = (int) $valor;
                if ($grau < 1 || $grau > 5) {
                    $erros["respostas.{$codigo}"] = ["O grau atribuído deve estar entre 1 e 5."];
                    continue;
                }

                // 4. Trava antileniência: graus extremos (1, 2 ou 5) ou pergunta que exige_evidencia
                if (($pergunta->exige_evidencia || in_array($grau, [1, 2, 5], true))) {
                    $temCit = DiarioBordo::query()
                        ->where('servidor_id', $servidorId)
                        ->where('ciclo_id', $cicloId)
                        ->exists();

                    if (! $temCit) {
                        $erros["respostas.{$codigo}"] = [
                            "Trava Antileniência: O grau {$grau} para \"{$pergunta->enunciado}\" exige comprovação prévia por Incidente Crítico (CIT) registrado no Diário de Bordo digital."
                        ];
                    }
                }
            }
        }

        if ($erros !== []) {
            throw ValidationException::withMessages($erros);
        }
    }

    /**
     * Calcula a nota final consolidada com base no modelo dinâmico e pesos dos grupos.
     *
     * @param array<string, mixed> $respostas
     * @return array{nota_final: string, elegivel_progressao: bool, detalhamento: array}
     */
    public function calcularNota(ModeloFormulario $modelo, array $respostas): array
    {
        $perguntas = $modelo->perguntasAtivas;
        $gruposConfig = $modelo->grupos ?? [];

        $notasPorGrupo = [];
        $pesosPorGrupo = [];
        $detalhamento = [];

        foreach ($perguntas as $pergunta) {
            $codigo = $pergunta->codigo;
            $grupoKey = $pergunta->grupo_key;
            $valor = $respostas[$codigo]['valor'] ?? $respostas[$codigo] ?? null;

            if ($valor === null || $valor === '') {
                continue;
            }

            $notaItem = '0.00';
            if ($pergunta->tipo === Pergunta::TIPO_ESCALA_GRAFICA) {
                $grau = (int) $valor;
                // Fórmula de conversão Chiavenato: (grau - 1) × 2,5
                $notaItem = bcmul(
                    bcsub((string) $grau, '1', self::PRECISAO),
                    self::FATOR_CONVERSAO,
                    self::PRECISAO
                );
            } elseif ($pergunta->tipo === Pergunta::TIPO_NOTA_0_10) {
                $notaItem = number_format((float) $valor, self::PRECISAO, '.', '');
            } elseif ($pergunta->tipo === Pergunta::TIPO_SIM_NAO) {
                $notaItem = (bool) $valor ? '10.0000000000' : '0.0000000000';
            } else {
                // Outros tipos qualitativos não entram no cálculo aritmético
                continue;
            }

            $pesoItem = number_format($pergunta->peso, self::PRECISAO, '.', '');

            if (! isset($notasPorGrupo[$grupoKey])) {
                $notasPorGrupo[$grupoKey] = '0';
                $pesosPorGrupo[$grupoKey] = '0';
            }

            $notasPorGrupo[$grupoKey] = bcadd(
                $notasPorGrupo[$grupoKey],
                bcmul($notaItem, $pesoItem, self::PRECISAO),
                self::PRECISAO
            );
            $pesosPorGrupo[$grupoKey] = bcadd($pesosPorGrupo[$grupoKey], $pesoItem, self::PRECISAO);

            $detalhamento[$codigo] = [
                'enunciado' => $pergunta->enunciado,
                'valor'     => $valor,
                'nota'      => number_format((float) $notaItem, 2, '.', ''),
                'peso'      => (float) $pesoItem,
                'grupo'     => $grupoKey,
            ];
        }

        // Consolida grupos com seus respectivos pesos globais
        $somaPonderadaGlobal = '0';
        $somaPesosGrupos = '0';

        foreach ($notasPorGrupo as $grupoKey => $somaGrupo) {
            $pesoGrupo = (float) ($gruposConfig[$grupoKey]['peso'] ?? 1.0);
            $pesoGrupoStr = number_format($pesoGrupo, self::PRECISAO, '.', '');

            $somaPesosQuestoes = $pesosPorGrupo[$grupoKey] ?? '0';
            $mediaGrupo = bccomp($somaPesosQuestoes, '0', self::PRECISAO) > 0
                ? bcdiv($somaGrupo, $somaPesosQuestoes, self::PRECISAO)
                : '0';

            $somaPonderadaGlobal = bcadd(
                $somaPonderadaGlobal,
                bcmul($mediaGrupo, $pesoGrupoStr, self::PRECISAO),
                self::PRECISAO
            );
            $somaPesosGrupos = bcadd($somaPesosGrupos, $pesoGrupoStr, self::PRECISAO);
        }

        $notaFinalRaw = bccomp($somaPesosGrupos, '0', self::PRECISAO) > 0
            ? bcdiv($somaPonderadaGlobal, $somaPesosGrupos, self::PRECISAO)
            : '0';

        $notaFinal = number_format((float) $notaFinalRaw, 2, '.', '');
        $elegivel = bccomp($notaFinal, '7.00', 2) >= 0;

        return [
            'nota_final'          => $notaFinal,
            'elegivel_progressao' => $elegivel,
            'detalhamento'        => $detalhamento,
        ];
    }

    private function validarSchemaPergunta(array $dados): void
    {
        $tipo = $dados['tipo'] ?? null;
        if (! in_array($tipo, Pergunta::TIPOS_VALIDOS, true)) {
            throw new DomainException("Tipo de pergunta inválido: {$tipo}.");
        }

        $codigo = $dados['codigo'] ?? null;
        if (! is_string($codigo) || trim($codigo) === '') {
            throw new DomainException('Todo item de avaliação deve ter um código identificador válido.');
        }

        $enunciado = $dados['enunciado'] ?? null;
        if (! is_string($enunciado) || trim($enunciado) === '') {
            throw new DomainException('O enunciado da pergunta é obrigatório.');
        }

        // Se for escala gráfica, valida opções de 1 a 5 com descrições sumárias e objetivas (Chiavenato)
        if ($tipo === Pergunta::TIPO_ESCALA_GRAFICA && isset($dados['opcoes'])) {
            if (! is_array($dados['opcoes']) || count($dados['opcoes']) !== 5) {
                throw new DomainException('A escala gráfica deve conter exatamente 5 graus (grau 1 a grau 5).');
            }
        }
    }
}
