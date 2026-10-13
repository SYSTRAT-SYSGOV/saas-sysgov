<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;

final class LocalFiscalizavelService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
    ) {}

    /**
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando o proprietário não existe no Cadastro Único do tenant atual
     */
    public function criarLocal(array $dados): LocalFiscalizavel
    {
        $proprietario = Pessoa::find($dados['proprietario_pessoa_id']);

        if (! $proprietario) {
            throw new \DomainException('Proprietário não encontrado no Cadastro Único.');
        }

        $local = DB::transaction(fn (): LocalFiscalizavel => LocalFiscalizavel::create($dados));

        $this->audit->record('vistoria', 'local.criado', "LocalFiscalizavel #{$local->id}", null, $local->toArray());
        $this->outbox->publish('vistoria.local.criado', ['local_id' => $local->id, 'tipo' => $local->tipo]);

        return $local;
    }

    /**
     * Vistorias (ordens de serviço) já concluídas para o local, da mais recente para a mais antiga.
     *
     * @return Collection<int, OrdemServico>
     */
    public function obterHistorico(LocalFiscalizavel $local): Collection
    {
        return OrdemServico::query()
            ->where('local_id', $local->id)
            ->where('status', OrdemServico::STATUS_CONCLUIDA)
            ->orderByDesc('data_prevista')
            ->get();
    }

    /**
     * Quantidade de autos de infração lavrados contra o local ou seu responsável
     * (proprietário) nos últimos `$meses` — usado para destacar "local reincidente" na
     * tela de execução da vistoria (seção 10.3).
     */
    public function contarAutuacoesRecentes(LocalFiscalizavel $local, int $meses = 12): int
    {
        $desde = now()->subMonths($meses);

        return Documento::where('tipo', Documento::TIPO_AUTO_INFRACAO)
            ->where('created_at', '>=', $desde)
            ->where(function ($query) use ($local): void {
                $query->where('autuado_pessoa_id', $local->proprietario_pessoa_id)
                    ->orWhereHas('execucao.ordemServico', fn ($q) => $q->where('local_id', $local->id));
            })
            ->count();
    }

    /**
     * @param array<string, mixed> $filtros
     *
     * @return LengthAwarePaginator<int, LocalFiscalizavel>
     */
    public function listar(array $filtros): LengthAwarePaginator
    {
        $query = LocalFiscalizavel::query()->with('proprietario')->latest();

        if ($tipo = $filtros['tipo'] ?? null) {
            $query->where('tipo', $tipo);
        }

        if ($busca = $filtros['busca'] ?? null) {
            $query->where('nome', 'like', "%{$busca}%");
        }

        return $query->paginate((int) ($filtros['per_page'] ?? 15));
    }

    /**
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando o proprietário informado não existe no Cadastro Único do tenant atual
     */
    public function atualizarLocal(LocalFiscalizavel $local, array $dados): LocalFiscalizavel
    {
        if (array_key_exists('proprietario_pessoa_id', $dados) && ! Pessoa::find($dados['proprietario_pessoa_id'])) {
            throw new \DomainException('Proprietário não encontrado no Cadastro Único.');
        }

        $antes = $local->toArray();

        DB::transaction(function () use ($local, $dados): void {
            $local->update($dados);
        });

        $this->audit->record('vistoria', 'local.atualizado', "LocalFiscalizavel #{$local->id}", $antes, $local->fresh()->toArray());

        return $local->fresh('proprietario');
    }

    public function excluirLocal(LocalFiscalizavel $local): void
    {
        $antes = $local->toArray();

        DB::transaction(function () use ($local): void {
            $local->delete();
        });

        $this->audit->record('vistoria', 'local.excluido', "LocalFiscalizavel #{$local->id}", $antes, null);
    }
}
