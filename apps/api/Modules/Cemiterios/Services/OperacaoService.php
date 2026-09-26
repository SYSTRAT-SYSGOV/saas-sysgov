<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\ExcecaoJudicial;
use Modules\Cemiterios\Models\Exumacao;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OrdemServico;
use Modules\Cemiterios\Models\Trasladacao;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Operações sobre restos mortais (spec: operacoes): inumação, exumação,
 * trasladação e o ciclo de vida das ordens de serviço. Ocupação e estado do
 * jazigo mudam sempre pelo JazigoEstadoService, dentro da mesma transação.
 */
final readonly class OperacaoService
{
    public function __construct(
        private JazigoEstadoService $estados,
        private ParametroService $parametros,
    ) {}

    /** Numeração sequencial por tenant e ano (RF-07). */
    public function emitirOrdem(string $tipo, ?int $plotId, ?string $agendadaPara = null, ?string $equipe = null, ?string $observacao = null): OrdemServico
    {
        return DB::transaction(function () use ($tipo, $plotId, $agendadaPara, $equipe, $observacao): OrdemServico {
            $ano = (int) now()->year;
            $numero = (int) OrdemServico::where('ano', $ano)->lockForUpdate()->max('numero') + 1;

            return OrdemServico::create([
                'ano' => $ano, 'numero' => $numero, 'tipo' => $tipo, 'plot_id' => $plotId,
                'agendada_para' => $agendadaPara, 'equipe' => $equipe, 'observacao' => $observacao, 'situacao' => 'emitida',
            ]);
        });
    }

    /**
     * Inumação regular (RF-05..RF-07, CA-01): ocupa o jazigo na confirmação,
     * inicia a carência e emite a OS.
     *
     * @param array<string, mixed> $falecido
     * @param array<string, mixed> $dados
     */
    public function inumar(array $falecido, array $dados): Inumacao
    {
        $jazigo = Jazigo::findOrFail($dados['plot_id']);
        $this->exigirAceitaSepultamento($jazigo);
        $this->exigirCertidaoLivre((string) $falecido['certidao_numero']);
        $this->exigirSucessaoRegularizada($jazigo, $falecido, (bool) ($dados['autorizado_judicial'] ?? false));

        return DB::transaction(function () use ($jazigo, $falecido, $dados): Inumacao {
            $registro = Falecido::create($falecido);
            $this->estados->alterarOcupacao($jazigo, 1, 'Inumação confirmada');
            $ordem = $this->emitirOrdem('inumacao', $jazigo->id, $dados['agendada_para'] ?? null, $dados['equipe'] ?? null);

            // Se o falecido for o titular da concessão, atualiza o concessionário
            $concessao = $jazigo->concessaoVigente();
            if ($concessao !== null) {
                $titular = $concessao->concessionario;
                if ($titular && Falecido::normalizar($registro->nome) === Falecido::normalizar($titular->nome)) {
                    $titular->update([
                        'titular_falecido' => true,
                        'data_falecimento_titular' => $registro->falecimento,
                    ]);
                }
            }

            return Inumacao::create([
                'deceased_id' => $registro->id,
                'plot_id' => $jazigo->id,
                'tipo' => $dados['tipo'] ?? null,
                'gaveta_numero' => $dados['gaveta_numero'] ?? null,
                'sepultado_em' => $dados['sepultado_em'],
                'carencia_desde' => CarbonImmutable::parse($dados['sepultado_em'])->toDateString(),
                'service_order_id' => $ordem->id,
                'coveiro_nome' => $dados['coveiro_nome'] ?? null,
                'pedreiro_nome' => $dados['pedreiro_nome'] ?? null,
                'cartorio' => $dados['cartorio'] ?? null,
                'medico' => $dados['medico'] ?? null,
                'situacao' => 'confirmada',
            ]);
        });
    }

    /**
     * Lançamento retroativo de livro físico: sem OS, certidão opcional e
     * pendente de revisão (objetivo O1).
     *
     * @param array<string, mixed> $falecido
     * @param array<string, mixed> $dados
     */
    public function inumarHistorica(array $falecido, array $dados): Inumacao
    {
        $jazigo = Jazigo::findOrFail($dados['plot_id']);
        if (!empty($falecido['certidao_numero'])) {
            $this->exigirCertidaoLivre((string) $falecido['certidao_numero']);
        }

        return DB::transaction(function () use ($jazigo, $falecido, $dados): Inumacao {
            $registro = Falecido::create($falecido);
            $this->estados->alterarOcupacao($jazigo, 1, 'Lançamento histórico');

            return Inumacao::create([
                'deceased_id' => $registro->id,
                'plot_id' => $jazigo->id,
                'sepultado_em' => $dados['sepultado_em'],
                'carencia_desde' => CarbonImmutable::parse($dados['sepultado_em'])->toDateString(),
                'origem' => 'historico',
                'livro_referencia' => $dados['livro_referencia'],
                'revisao_pendente' => true,
                'situacao' => 'confirmada',
            ]);
        });
    }

    public function revisar(Inumacao $inumacao): Inumacao
    {
        if (!$inumacao->revisao_pendente) {
            throw new RegraNegocioException('inumacao.sem_revisao_pendente', 'Esta inumação não está pendente de revisão.');
        }
        $inumacao->update(['revisao_pendente' => false]);

        return $inumacao;
    }

    /** Cancelamento desfaz ocupação e estado (RF-06). */
    public function cancelarInumacao(Inumacao $inumacao): Inumacao
    {
        if ($inumacao->situacao !== 'confirmada') {
            throw new RegraNegocioException('inumacao.nao_cancelavel', 'Somente inumação confirmada pode ser cancelada.');
        }

        return DB::transaction(function () use ($inumacao): Inumacao {
            $this->estados->alterarOcupacao($inumacao->jazigo()->firstOrFail(), -1, 'Inumação cancelada');
            $inumacao->update(['situacao' => 'cancelada']);
            OrdemServico::whereKey($inumacao->service_order_id)->where('situacao', '!=', 'concluida')->update(['situacao' => 'cancelada']);

            return $inumacao;
        });
    }

    /**
     * Prazo legal vigente aplicável ao falecido, contado de carencia_desde (RN-01, RN-02).
     *
     * @return array{anos: int, liberada_em: CarbonImmutable}
     */
    public function liberacao(Inumacao $inumacao): array
    {
        $p = $this->parametros->vigente();
        $idade = $inumacao->falecido()->value('idade_obito');
        $anos = $idade !== null && (int) $idade < $p->idade_limite_crianca
            ? $p->prazo_exumacao_crianca_anos
            : $p->prazo_exumacao_adulto_anos;

        return ['anos' => $anos, 'liberada_em' => CarbonImmutable::parse($inumacao->carencia_desde)->addYearsNoOverflow($anos)];
    }

    /** Exumação ordinária: 422 com liberada_em enquanto o prazo não decorre (RF-08, CA-02). */
    public function exumarOrdinaria(Inumacao $inumacao, ?string $destino, ?string $agendadaPara): Exumacao
    {
        $this->exigirRestosNoJazigo($inumacao);
        ['anos' => $anos, 'liberada_em' => $liberadaEm] = $this->liberacao($inumacao);

        if (today()->lt($liberadaEm)) {
            throw new RegraNegocioException(
                'exumacao.prazo_nao_decorrido',
                'Prazo legal de exumação não decorrido.',
                ['liberada_em' => $liberadaEm->toDateString()],
            );
        }

        return DB::transaction(fn () => Exumacao::create([
            'burial_id' => $inumacao->id,
            'tipo' => 'ordinaria',
            'situacao' => 'deferida',
            'prazo_aplicado_anos' => $anos,
            'liberada_em' => $liberadaEm->toDateString(),
            'destino' => $destino,
            'service_order_id' => $this->emitirOrdem('exumacao', $inumacao->plot_id, $agendadaPara)->id,
        ]));
    }

    /**
     * Exumação judicial antes do prazo, com exceção append-only (RF-09, RN-03).
     *
     * @param array{processo: string, juizo: string, data_decisao: string, arquivo: string} $mandado
     */
    public function exumarJudicial(Inumacao $inumacao, array $mandado, ?string $destino, ?string $agendadaPara): Exumacao
    {
        $this->exigirRestosNoJazigo($inumacao);
        ['anos' => $anos, 'liberada_em' => $liberadaEm] = $this->liberacao($inumacao);

        return DB::transaction(function () use ($inumacao, $mandado, $destino, $agendadaPara, $anos, $liberadaEm): Exumacao {
            $exumacao = Exumacao::create([
                'burial_id' => $inumacao->id,
                'tipo' => 'judicial',
                'situacao' => 'deferida',
                'prazo_aplicado_anos' => $anos,
                'liberada_em' => $liberadaEm->toDateString(),
                'destino' => $destino,
                'service_order_id' => $this->emitirOrdem('exumacao', $inumacao->plot_id, $agendadaPara, null, "Processo {$mandado['processo']}")->id,
            ]);

            ExcecaoJudicial::create($mandado + [
                'exhumation_id' => $exumacao->id,
                'prazo_contornado_ate' => $liberadaEm->toDateString(),
                'autor_id' => auth()->id(),
            ]);

            return $exumacao;
        });
    }

    /**
     * Trasladação: exige exumação permitida (prazo ou exceção judicial) e,
     * se interna, destino que aceite sepultamento. Efetiva-se na conclusão da OS.
     *
     * @param array<string, mixed> $dados
     */
    public function trasladar(Inumacao $inumacao, array $dados): Trasladacao
    {
        $this->exigirRestosNoJazigo($inumacao);

        $judicial = Exumacao::where('burial_id', $inumacao->id)->where('tipo', 'judicial')->where('situacao', 'deferida')->exists();
        $liberadaEm = $this->liberacao($inumacao)['liberada_em'];
        if (!$judicial && today()->lt($liberadaEm)) {
            throw new RegraNegocioException('exumacao.prazo_nao_decorrido', 'Prazo legal de exumação não decorrido.', ['liberada_em' => $liberadaEm->toDateString()]);
        }

        $destinoId = $dados['plot_destino_id'] ?? null;
        if ($destinoId !== null) {
            if ((int) $destinoId === $inumacao->plot_id) {
                throw new RegraNegocioException('trasladacao.mesmo_jazigo', 'O destino deve ser outro jazigo.');
            }
            $this->exigirAceitaSepultamento(Jazigo::findOrFail($destinoId));
        }

        return DB::transaction(fn () => Trasladacao::create([
            'burial_id' => $inumacao->id,
            'plot_origem_id' => $inumacao->plot_id,
            'plot_destino_id' => $destinoId,
            'destino_externo' => $dados['destino_externo'] ?? null,
            'documento_destino' => $dados['documento_destino'] ?? null,
            'situacao' => 'deferida',
            'service_order_id' => $this->emitirOrdem('trasladacao', $inumacao->plot_id, $dados['agendada_para'] ?? null)->id,
        ]));
    }

    /** Ciclo da OS: Emitida → Em Execução → Concluída; Suspensa/Cancelada (RF-07, RF-10). */
    public function transicao(OrdemServico $ordem, string $acao, ?string $motivo = null): OrdemServico
    {
        $permitidas = [
            'iniciar' => ['emitida'],
            'concluir' => ['emitida', 'em_execucao'],
            'suspender' => ['emitida', 'em_execucao'],
            'cancelar' => ['emitida', 'em_execucao', 'suspensa'],
        ];
        if (!in_array($ordem->situacao, $permitidas[$acao], true)) {
            throw new RegraNegocioException('ordem.transicao_invalida', "Não é possível {$acao} uma ordem {$ordem->situacao}.");
        }

        return DB::transaction(function () use ($ordem, $acao, $motivo): OrdemServico {
            match ($acao) {
                'iniciar' => $ordem->update(['situacao' => 'em_execucao']),
                'concluir' => $this->concluir($ordem),
                'suspender' => $this->suspender($ordem, (string) $motivo),
                default => $this->cancelar($ordem),
            };

            return $ordem->refresh();
        });
    }

    private function concluir(OrdemServico $ordem): void
    {
        match ($ordem->tipo) {
            'exumacao' => $this->concluirExumacao(Exumacao::where('service_order_id', $ordem->id)->firstOrFail()),
            'trasladacao' => $this->concluirTrasladacao(Trasladacao::where('service_order_id', $ordem->id)->firstOrFail()),
            'demolicao' => $this->concluirDemolicao($ordem),
            default => null,
        };

        $ordem->update(['situacao' => 'concluida', 'executada_por' => auth()->id(), 'executada_em' => now()]);
    }

    private function concluirExumacao(Exumacao $exumacao): void
    {
        $inumacao = $exumacao->inumacao()->firstOrFail();
        $this->estados->alterarOcupacao($inumacao->jazigo()->firstOrFail(), -1, 'Exumação concluída');
        $inumacao->update(['situacao' => 'removida']);
        $exumacao->update(['situacao' => 'concluida']);
    }

    /** Demolida a construção, o jazigo sai de Manutenção e volta ao estado derivado (RF-36). */
    private function concluirDemolicao(OrdemServico $ordem): void
    {
        $jazigo = Jazigo::find($ordem->plot_id);
        if ($jazigo?->estado === EstadoJazigo::Manutencao) {
            $this->estados->manual($jazigo, 'restaurar', 'Demolição concluída', null);
        }
    }

    /** Origem −1 e destino +1 na mesma transação; destino lotado desfaz tudo. */
    private function concluirTrasladacao(Trasladacao $trasladacao): void
    {
        $inumacao = $trasladacao->inumacao()->firstOrFail();
        $this->estados->alterarOcupacao(Jazigo::findOrFail($trasladacao->plot_origem_id), -1, 'Trasladação (saída)');

        if ($trasladacao->plot_destino_id) {
            $this->estados->alterarOcupacao(Jazigo::findOrFail($trasladacao->plot_destino_id), 1, 'Trasladação (entrada)');
            $inumacao->update(['plot_id' => $trasladacao->plot_destino_id]);
        } else {
            $inumacao->update(['situacao' => 'removida']);
        }

        $trasladacao->update(['situacao' => 'concluida']);
        Exumacao::where('burial_id', $inumacao->id)->where('tipo', 'judicial')->where('situacao', 'deferida')->update(['situacao' => 'concluida']);
    }

    /** Suspensão em campo: restos permanecem e a carência reinicia na data da suspensão (RF-10). */
    private function suspender(OrdemServico $ordem, string $motivo): void
    {
        if ($ordem->tipo === 'exumacao') {
            $exumacao = Exumacao::where('service_order_id', $ordem->id)->firstOrFail();
            $inumacao = $exumacao->inumacao()->firstOrFail();
            $inumacao->update(['carencia_desde' => today()->toDateString()]);
            ['anos' => $anos, 'liberada_em' => $liberadaEm] = $this->liberacao($inumacao->refresh());

            $exumacao->update([
                'situacao' => 'suspensa',
                'motivo_suspensao' => $motivo,
                'prazo_aplicado_anos' => $anos,
                'liberada_em' => $liberadaEm->toDateString(),
            ]);
        }

        $ordem->update([
            'situacao' => 'suspensa',
            'observacao' => trim(($ordem->observacao ? $ordem->observacao . "\n" : '') . 'Suspensa em ' . now()->format('d/m/Y H:i') . ": {$motivo}"),
            'executada_por' => auth()->id(),
            'executada_em' => now(),
        ]);
    }

    private function cancelar(OrdemServico $ordem): void
    {
        match ($ordem->tipo) {
            'exumacao' => Exumacao::where('service_order_id', $ordem->id)->update(['situacao' => 'cancelada']),
            'trasladacao' => Trasladacao::where('service_order_id', $ordem->id)->update(['situacao' => 'cancelada']),
            default => null,
        };

        $ordem->update(['situacao' => 'cancelada']);
    }

    private function exigirAceitaSepultamento(Jazigo $jazigo): void
    {
        if ($jazigo->aceitaSepultamento()) {
            return;
        }

        throw match ($jazigo->estado) {
            EstadoJazigo::CapacidadeMaxima => new RegraNegocioException('jazigo.capacidade_maxima', 'Jazigo em capacidade máxima.'),
            EstadoJazigo::Manutencao => new RegraNegocioException('jazigo.manutencao', 'Jazigo em ruína/manutenção.'),
            default => new RegraNegocioException('jazigo.sem_concessao', 'Jazigo disponível sem concessão só aceita sepultamento em cova pública.'),
        };
    }

    private function exigirCertidaoLivre(string $numero): void
    {
        $usada = Inumacao::where('situacao', '!=', 'cancelada')
            ->whereHas('falecido', fn ($q) => $q->where('certidao_numero', $numero))
            ->exists();

        if ($usada) {
            throw new RegraNegocioException('inumacao.certidao_duplicada', 'Certidão de óbito já vinculada a outra inumação.');
        }
    }

    private function exigirRestosNoJazigo(Inumacao $inumacao): void
    {
        if ($inumacao->situacao !== 'confirmada') {
            throw new RegraNegocioException('inumacao.sem_restos', 'Não há restos desta inumação no jazigo.');
        }

        $aberta = Exumacao::where('burial_id', $inumacao->id)->where('situacao', 'deferida')->where('tipo', '!=', 'judicial')->exists()
            || Trasladacao::where('burial_id', $inumacao->id)->where('situacao', 'deferida')->exists();
        if ($aberta) {
            throw new RegraNegocioException('exumacao.em_andamento', 'Já existe exumação ou trasladação em andamento para estes restos.');
        }
    }

    /**
     * Trava anti-sepultamento de terceiros quando o titular da concessão faleceu sem
     * sucessão hereditária ou autorização judicial (Regra Legado Clipper / Código de Posturas).
     *
     * @param array<string, mixed> $falecido
     */
    private function exigirSucessaoRegularizada(Jazigo $jazigo, array $falecido, bool $autorizadoJudicial = false): void
    {
        if ($autorizadoJudicial) {
            return;
        }

        $concessao = $jazigo->concessaoVigente();
        if ($concessao === null) {
            return;
        }

        $titular = $concessao->concessionario;
        if ($titular === null || !$titular->titular_falecido) {
            return;
        }

        // Permite o sepultamento se o falecido sendo inumado for o próprio titular
        $nomeFalecido = Falecido::normalizar((string) ($falecido['nome'] ?? ''));
        $nomeTitular = Falecido::normalizar((string) $titular->nome);

        if ($nomeFalecido === $nomeTitular) {
            return;
        }

        throw new RegraNegocioException(
            'concessao.titular_falecido_sucessao_pendente',
            'Jazigo com titular falecido e sucessão hereditária pendente. Sepultamento de terceiros bloqueado.'
        );
    }
}
