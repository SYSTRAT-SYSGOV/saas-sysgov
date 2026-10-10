<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Http\Middleware\ResolveCampanha;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;

/** Demandas da campanha de trabalho: responsável que acessa a campanha, histórico e origem no eleitor (D7). */
final class DemandaService
{
    use RegistraMutacao;

    private const ROTULO_STATUS = ['pendente' => 'Pendente', 'em_andamento' => 'Em andamento', 'concluida' => 'Concluída'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
        private readonly CampanhaContext $campanha,
        private readonly MunicipioService $municipios,
    ) {}

    /**
     * Usuários que podem ser responsáveis: membros da campanha e quem acessa todas (gestão).
     *
     * @return Collection<int, array{id: int, name: string}>
     */
    public function responsaveis(): Collection
    {
        $campanha = $this->campanha->get();

        return User::query()->ofTenant($this->tenant->id())->orderBy('name')->get()
            ->filter(fn (User $u): bool => ResolveCampanha::podeAcessar($u, $campanha, $this->tenant->id()))
            ->map(fn (User $u): array => ['id' => (int) $u->id, 'name' => (string) $u->name])->values();
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function salvar(?Demanda $demanda, array $dados, ?User $autor): Demanda
    {
        if (isset($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if (!empty($dados['responsavel_id'])) {
            $this->conferirResponsavel((int) $dados['responsavel_id']);
        }
        $comentario = trim((string) ($dados['comentario'] ?? ''));
        unset($dados['comentario']);

        return DB::transaction(function () use ($demanda, $dados, $comentario, $autor): Demanda {
            $antes = $demanda?->toArray();
            $demanda ??= new Demanda();
            $historico = $demanda->historico ?? [];
            if ($antes === null) {
                $historico[] = $this->evento($autor, 'Demanda registrada.');
            } elseif (isset($dados['status']) && $dados['status'] !== $demanda->status) {
                $historico[] = $this->evento($autor, 'Situação: ' . self::ROTULO_STATUS[$dados['status']] . '.');
            }
            if ($comentario !== '') {
                $historico[] = $this->evento($autor, $comentario);
            }
            $demanda->fill([...$dados, 'historico' => $historico])->save();
            $this->auditar('demanda', $antes === null ? 'criada' : 'atualizada', $demanda->id, $antes, $demanda->toArray());

            return $demanda;
        });
    }

    /**
     * "Transformar em demanda": nasce pendente no município do eleitor, com ele como solicitante e o texto do pedido.
     *
     * @param array<string, mixed> $dados categoria, prioridade, responsavel_id, prazo
     */
    public function doEleitor(Eleitor $eleitor, array $dados, ?User $autor): Demanda
    {
        if ($eleitor->anonimizado_em !== null || $eleitor->demanda === null || trim($eleitor->demanda) === '') {
            throw new DomainException('Este eleitor não tem pedido escrito para transformar em demanda.');
        }

        return $this->salvar(null, [
            'categoria' => $dados['categoria'] ?? 'outra',
            'prioridade' => $dados['prioridade'] ?? 'media',
            'responsavel_id' => $dados['responsavel_id'] ?? null,
            'prazo' => $dados['prazo'] ?? null,
            'codigo_ibge' => $eleitor->codigo_ibge,
            'solicitante' => (string) $eleitor->nome,
            'eleitor_id' => $eleitor->id,
            'descricao' => $eleitor->demanda,
            'status' => 'pendente',
        ], $autor);
    }

    public function excluir(Demanda $demanda): void
    {
        DB::transaction(function () use ($demanda): void {
            $antes = $demanda->toArray();
            $demanda->delete();
            $this->auditar('demanda', 'excluida', $demanda->id, $antes, null);
        });
    }

    /** Responsável (de demanda ou de compromisso da agenda) precisa acessar a campanha. */
    public function conferirResponsavel(int $userId): void
    {
        $user = User::query()->ofTenant($this->tenant->id())->whereKey($userId)->first();
        if ($user === null || !ResolveCampanha::podeAcessar($user, $this->campanha->get(), $this->tenant->id())) {
            throw new DomainException('O responsável precisa ser membro da campanha ou da coordenação geral.');
        }
    }

    /** @return array{em: string, por: string|null, texto: string} */
    private function evento(?User $autor, string $texto): array
    {
        return ['em' => now()->toIso8601String(), 'por' => $autor?->name, 'texto' => $texto];
    }
}
