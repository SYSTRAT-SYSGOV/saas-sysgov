<?php

declare(strict_types=1);

namespace Modules\Formatura\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Services\AlunoService;
use Modules\Formatura\Enums\SituacaoFinanceira;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Services\Concerns\RegistraMutacao;

/**
 * Formandos = alunos do cadastro Escola nas turmas do ano letivo da configuração. Quem não tem participação
 * registrada conta como "não participa" (valor devido zero).
 */
final class FormandoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly AlunoService $alunos,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function listar(Configuracao $configuracao, ?int $turmaId = null, ?string $busca = null): Collection
    {
        $alunos = Aluno::query()
            ->with(['turma:id,nome,ano_letivo', 'contatos'])
            ->whereIn('turma_id', $configuracao->turmasFormandas())
            ->when($turmaId !== null, fn ($q) => $q->where('turma_id', $turmaId))
            ->when($busca !== null && $busca !== '', fn ($q) => $q->where('nome', 'like', '%' . $busca . '%'))
            ->orderBy('turma_id')->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')
            ->get();

        $participacoes = Participacao::query()
            ->where('configuracao_id', $configuracao->id)
            ->whereIn('aluno_id', $alunos->pluck('id'))
            ->withSum('pagamentos as pago_centavos', 'valor_centavos')
            ->get()
            ->keyBy('aluno_id');

        return $alunos->map(fn (Aluno $aluno): array => $this->linha($aluno, $participacoes->get($aluno->id), $configuracao));
    }

    /**
     * @param array{participa: bool, convidados?: int, convidados_incluidos?: int, convidados_extras?: int, observacoes?: string|null, telefone?: string|null} $dados
     */
    public function salvarParticipacao(Configuracao $configuracao, Aluno $aluno, array $dados): Participacao
    {
        $this->garantirFormando($configuracao, $aluno, (bool) $dados['participa']);

        return DB::transaction(function () use ($configuracao, $aluno, $dados): Participacao {
            $participacao = Participacao::query()->where('configuracao_id', $configuracao->id)->where('aluno_id', $aluno->id)->lockForUpdate()->first();
            if (array_key_exists('telefone', $dados)) {
                $this->alunos->definirTelefonePrincipal($aluno, $dados['telefone']);
            }
            $antes = $participacao?->toArray();
            if (array_key_exists('convidados', $dados)) {
                // Número único de convidados (D16).
                $dados['convidados_incluidos'] = 0;
                $dados['convidados_extras'] = (int) $dados['convidados'];
            }
            $valores = [
                'participa' => $dados['participa'],
                'convidados_incluidos' => $dados['convidados_incluidos'] ?? $participacao->convidados_incluidos ?? 0,
                'convidados_extras' => $dados['convidados_extras'] ?? $participacao->convidados_extras ?? 0,
                'observacoes' => array_key_exists('observacoes', $dados) ? $dados['observacoes'] : $participacao?->observacoes,
            ];
            if ($participacao === null) {
                $participacao = Participacao::create(['configuracao_id' => $configuracao->id, 'aluno_id' => $aluno->id, ...$valores]);
            } else {
                $participacao->update($valores);
            }
            $this->auditar('participacao', $antes === null ? 'criada' : 'atualizada', $participacao->id, $antes, $participacao->toArray(), ['aluno_id' => $aluno->id]);

            return $participacao;
        });
    }

    /**
     * Marca/desmarca a turma formanda inteira numa transação (D11). Marcar não atinge transferidos;
     * desmarcar atinge todos. Alunos já no estado pedido não geram nova auditoria.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function participacaoEmLote(Configuracao $configuracao, int $turmaId, bool $participa): Collection
    {
        if (!$configuracao->ehTurmaFormanda($turmaId)) {
            throw ValidationException::withMessages(['turma_id' => "A turma não é formanda em {$configuracao->ano_letivo}."]);
        }

        DB::transaction(function () use ($configuracao, $turmaId, $participa): void {
            $alunos = Aluno::query()->where('turma_id', $turmaId)
                ->when($participa, fn ($q) => $q->where('situacao', '!=', SituacaoAluno::Transferido->value))
                ->get();
            $atuais = Participacao::query()->where('configuracao_id', $configuracao->id)
                ->whereIn('aluno_id', $alunos->pluck('id'))->pluck('participa', 'aluno_id');
            foreach ($alunos as $aluno) {
                $atual = (bool) ($atuais[$aluno->id] ?? false);
                if ($atual !== $participa) {
                    $this->salvarParticipacao($configuracao, $aluno, ['participa' => $participa]);
                }
            }
        });

        return $this->listar($configuracao, $turmaId);
    }

    /**
     * Aluno fora das turmas formandas não participa nem paga (D10). Transferido (saiu da escola) não entra nem paga,
     * mas pode ser retirado ($entrando = false). Remanejado participa normalmente na turma de destino.
     */
    public function garantirFormando(Configuracao $configuracao, Aluno $aluno, bool $entrando = true): void
    {
        if (!$configuracao->ehTurmaFormanda($aluno->turma_id)) {
            throw ValidationException::withMessages(['aluno_id' => "O aluno não está em uma turma formanda de {$configuracao->ano_letivo}."]);
        }
        if ($entrando && $aluno->situacao === SituacaoAluno::Transferido->value) {
            throw ValidationException::withMessages(['aluno_id' => 'Aluno transferido não pode participar nem pagar a formatura.']);
        }
    }

    /** @return array<string, mixed> */
    public function linha(Aluno $aluno, ?Participacao $participacao, Configuracao $configuracao): array
    {
        $devido = $participacao?->valorDevidoCentavos($configuracao) ?? 0;
        $pago = (int) ($participacao?->getAttribute('pago_centavos') ?? ($participacao?->pagamentos()->sum('valor_centavos') ?? 0));

        return [
            'aluno_id' => $aluno->id,
            'numero' => $aluno->numero,
            'nome' => $aluno->nome,
            'cgm' => $aluno->cgm,
            'turma_id' => $aluno->turma_id,
            'turma' => $aluno->turma?->nome,
            'situacao_aluno' => $aluno->situacao,
            'telefone' => $aluno->contatos->first()?->telefone,
            'participa' => $participacao->participa ?? false,
            'convidados' => $participacao?->totalConvidados() ?? 0,
            'convidados_incluidos' => $participacao->convidados_incluidos ?? 0,
            'convidados_extras' => $participacao->convidados_extras ?? 0,
            'observacoes' => $participacao?->observacoes,
            'valor_devido_centavos' => $devido,
            'total_pago_centavos' => $pago,
            'saldo_devedor_centavos' => max(0, $devido - $pago),
            'situacao' => SituacaoFinanceira::de($devido, $pago)->value,
        ];
    }
}
