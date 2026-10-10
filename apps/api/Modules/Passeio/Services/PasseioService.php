<?php

declare(strict_types=1);

namespace Modules\Passeio\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Passeio\Models\Assento;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Services\Concerns\RegistraMutacao;

final class PasseioService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array<string, mixed> $dados */
    public function criar(array $dados): Passeio
    {
        return DB::transaction(function () use ($dados): Passeio {
            $passeio = Passeio::create($dados);
            $this->auditar('passeio', 'criado', $passeio->id, null, $passeio->toArray());

            return $passeio->refresh();
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Passeio $passeio, array $dados): Passeio
    {
        return DB::transaction(function () use ($passeio, $dados): Passeio {
            $antes = $passeio->toArray();
            $passeio->update($dados);
            $this->auditar('passeio', 'atualizado', $passeio->id, $antes, $passeio->toArray(), ['status' => $passeio->status]);

            return $passeio;
        });
    }

    public function excluir(Passeio $passeio): void
    {
        DB::transaction(function () use ($passeio): void {
            $antes = $passeio->toArray();
            $passeio->delete();
            $this->auditar('passeio', 'excluido', $passeio->id, $antes, null);
        });
    }

    /**
     * Indicadores de um passeio ou, sem passeio, de todos (valores em centavos).
     *
     * @return array<string, int|float>
     */
    public function indicadores(?Passeio $passeio = null): array
    {
        $escopo = fn ($q) => $passeio !== null ? $q->where('passeio_id', $passeio->id) : $q;
        $inscricoes = $escopo(Inscricao::query()->with('passeio:id,valor_centavos'))->get();
        $vao = $inscricoes->where('vai', true);
        $valor = fn (Inscricao $i): int => (int) ($i->passeio->valor_centavos ?? 0);
        $veiculos = $escopo(Veiculo::query())->get(['id', 'capacidade']);

        return [
            'total_passeios' => $passeio !== null ? 1 : Passeio::count(),
            'alunos_inscritos' => $inscricoes->count(),
            'alunos_que_vao' => $vao->count(),
            'autorizacoes_entregues' => $vao->where('autorizacao_entregue', true)->count(),
            'autorizacoes_percentual' => $vao->count() > 0 ? round($vao->where('autorizacao_entregue', true)->count() * 100 / $vao->count(), 2) : 0.0,
            'arrecadado_centavos' => (int) $vao->where('pago', true)->sum($valor),
            'pendente_centavos' => (int) $vao->where('pago', false)->sum($valor),
            'total_veiculos' => $veiculos->count(),
            'capacidade_total' => (int) $veiculos->sum('capacidade'),
            'assentos_ocupados' => Assento::query()->whereIn('veiculo_id', $veiculos->pluck('id'))->count(),
        ];
    }
}
