<?php

declare(strict_types=1);

namespace Modules\Formatura\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Services\Concerns\RegistraMutacao;

final class PagamentoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly FormandoService $formandos,
    ) {}

    /**
     * @param array{numero_parcela: int, data_pagamento: string, valor_centavos: int, forma_pagamento: string, chave_pix?: string|null, observacao?: string|null} $dados
     */
    public function registrar(Configuracao $configuracao, Aluno $aluno, array $dados, User $user): Pagamento
    {
        $this->formandos->garantirFormando($configuracao, $aluno);
        if ($dados['numero_parcela'] > $configuracao->max_parcelas) {
            throw ValidationException::withMessages(['numero_parcela' => "A formatura de {$configuracao->ano_letivo} aceita no máximo {$configuracao->max_parcelas} parcela(s)."]);
        }
        if (!in_array($dados['forma_pagamento'], $configuracao->formas_pagamento, true)) {
            throw ValidationException::withMessages(['forma_pagamento' => 'Forma de pagamento não aceita na configuração da formatura.']);
        }

        $participacao = Participacao::query()->where('configuracao_id', $configuracao->id)->where('aluno_id', $aluno->id)->first();
        if ($participacao === null || !$participacao->participa) {
            throw new DomainException('O aluno não está participando da formatura deste ano.');
        }

        return DB::transaction(function () use ($participacao, $dados, $user): Pagamento {
            $pagamento = Pagamento::create([...$dados, 'participacao_id' => $participacao->id, 'registrado_por' => $user->id]);
            $this->auditar('pagamento', 'registrado', $pagamento->id, null, $pagamento->toArray(), [
                'aluno_id' => $participacao->aluno_id, 'valor_centavos' => $pagamento->valor_centavos,
            ]);

            return $pagamento;
        });
    }

    /**
     * Pagamentos ativos do ano, só de alunos das turmas formandas, do mais recente ao mais antigo (D12).
     * `participa` indica se o pagamento conta no recebido (quem deixou de participar não conta).
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function doAno(Configuracao $configuracao, ?string $inicio, ?string $fim): Collection
    {
        return Pagamento::query()
            ->with('participacao.aluno.turma:id,nome')
            ->whereHas('participacao', fn ($q) => $q->where('configuracao_id', $configuracao->id)
                ->whereHas('aluno', fn ($a) => $a->whereIn('turma_id', $configuracao->turmasFormandas())))
            ->when($inicio !== null, fn ($q) => $q->where('data_pagamento', '>=', $inicio))
            ->when($fim !== null, fn ($q) => $q->where('data_pagamento', '<=', $fim))
            ->orderByDesc('data_pagamento')->orderByDesc('id')
            ->get()
            ->map(fn (Pagamento $p): array => $this->linhaDoAno($p));
    }

    /** @return array<string, mixed> */
    private function linhaDoAno(Pagamento $p): array
    {
        return [
            'id' => $p->id,
            'participacao_id' => $p->participacao_id,
            'aluno_id' => $p->participacao?->aluno_id,
            'participa' => (bool) $p->participacao?->participa,
            'aluno_nome' => $p->participacao?->aluno?->nome,
            'turma' => $p->participacao?->aluno?->turma?->nome,
            'numero_parcela' => $p->numero_parcela,
            'data_pagamento' => $p->data_pagamento->toDateString(),
            'valor_centavos' => $p->valor_centavos,
            'forma_pagamento' => $p->forma_pagamento,
            'chave_pix' => $p->chave_pix,
            'observacao' => $p->observacao,
        ];
    }

    /** Estorno: exclusão lógica auditada. */
    public function estornar(Pagamento $pagamento): void
    {
        DB::transaction(function () use ($pagamento): void {
            $antes = $pagamento->toArray();
            $pagamento->delete();
            $this->auditar('pagamento', 'estornado', $pagamento->id, $antes, null, ['valor_centavos' => $pagamento->valor_centavos]);
        });
    }
}
