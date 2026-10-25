<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaAnnouncement;
use Modules\Educa\Models\EducaAnnouncementAudience;
use Modules\Educa\Models\EducaAnnouncementRead;

/**
 * Gestão de Avisos e Comunicados Oficiais Escolares com Segmentação.
 */
final class AnnouncementService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     escola_id?: string|null,
     *     turma_id?: string|null,
     *     urgencia?: string|null,
     *     status?: string|null,
     *     ativo?: bool|null,
     *     busca?: string|null
     * } $filtros
     * @return Collection<int, EducaAnnouncement>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaAnnouncement::query()
            ->with(['audiences', 'school.orgUnit']);

        if (! empty($filtros['escola_id'])) {
            $escolaId = $filtros['escola_id'];
            $query->where(function ($q) use ($escolaId): void {
                $q->where('school_id', $escolaId)
                    ->orWhereHas('audiences', function ($aq) use ($escolaId): void {
                        $aq->where('tipo_alvo', EducaAnnouncementAudience::ALVO_ESCOLA)
                            ->where('target_id', $escolaId);
                    })
                    ->orWhereHas('audiences', function ($aq): void {
                        $aq->where('tipo_alvo', EducaAnnouncementAudience::ALVO_REDE);
                    });
            });
        }

        if (! empty($filtros['turma_id'])) {
            $turmaId = $filtros['turma_id'];
            $query->whereHas('audiences', function ($aq) use ($turmaId): void {
                $aq->where('tipo_alvo', EducaAnnouncementAudience::ALVO_TURMA)
                    ->where('target_id', $turmaId);
            });
        }

        if (! empty($filtros['urgencia'])) {
            $query->where('urgencia', $filtros['urgencia']);
        }

        if (! empty($filtros['status'])) {
            $query->where('status', $filtros['status']);
        }

        if (isset($filtros['ativo']) && $filtros['ativo'] === true) {
            $hoje = Carbon::now()->toDateString();
            $query->where('status', EducaAnnouncement::STATUS_PUBLICADO)
                ->where(function ($q) use ($hoje): void {
                    $q->whereNull('data_expiracao')
                        ->orWhere('data_expiracao', '>=', $hoje);
                });
        }

        if (! empty($filtros['busca'])) {
            $busca = (string) $filtros['busca'];
            $query->where(function ($q) use ($busca): void {
                $q->where('titulo', 'like', "%{$busca}%")
                    ->orWhere('conteudo', 'like', "%{$busca}%");
            });
        }

        return $query->orderByDesc('data_publicacao')->get();
    }

    public function obter(string $avisoId): EducaAnnouncement
    {
        return EducaAnnouncement::query()
            ->with(['audiences', 'reads.pessoa', 'school.orgUnit', 'author'])
            ->findOrFail($avisoId);
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     titulo: string,
     *     conteudo: string,
     *     urgencia: string,
     *     school_id?: string|null,
     *     autor_user_id?: int|null,
     *     data_publicacao?: string|null,
     *     data_expiracao?: string|null,
     *     status?: string|null,
     *     publicos_alvo: array<int, array{tipo_alvo: string, target_id?: string|null}>
     * } $dados
     */
    public function criar(array $dados): EducaAnnouncement
    {
        if (empty($dados['publicos_alvo'])) {
            throw new LogicException('O comunicado exige ao menos um público-alvo de destino.');
        }

        return DB::transaction(function () use ($dados): EducaAnnouncement {
            $publicosAlvo = $dados['publicos_alvo'];
            unset($dados['publicos_alvo']);

            $dados['data_publicacao'] = $dados['data_publicacao'] ?? Carbon::now()->toDateString();
            $dados['status'] = $dados['status'] ?? EducaAnnouncement::STATUS_PUBLICADO;

            $aviso = EducaAnnouncement::create($dados);

            foreach ($publicosAlvo as $alvo) {
                EducaAnnouncementAudience::create([
                    'tenant_id' => $dados['tenant_id'],
                    'announcement_id' => $aviso->id,
                    'tipo_alvo' => $alvo['tipo_alvo'],
                    'target_id' => $alvo['target_id'] ?? null,
                ]);
            }

            $aviso->load(['audiences', 'school']);

            $this->audit->record('educa', 'announcement.created', "EducaAnnouncement #{$aviso->id}", null, $aviso->toArray());

            return $aviso;
        });
    }

    /**
     * @param array{
     *     titulo?: string|null,
     *     conteudo?: string|null,
     *     urgencia?: string|null,
     *     data_expiracao?: string|null,
     *     status?: string|null
     * } $dados
     */
    public function atualizar(string $avisoId, array $dados): EducaAnnouncement
    {
        $aviso = $this->obter($avisoId);
        $antes = $aviso->toArray();

        return DB::transaction(function () use ($aviso, $dados, $antes): EducaAnnouncement {
            $aviso->update(array_filter($dados, fn ($val) => $val !== null));
            $aviso->load(['audiences', 'school']);

            $this->audit->record('educa', 'announcement.updated', "EducaAnnouncement #{$aviso->id}", $antes, $aviso->toArray());

            return $aviso;
        });
    }

    public function arquivar(string $avisoId): void
    {
        $aviso = $this->obter($avisoId);

        DB::transaction(function () use ($aviso): void {
            $aviso->update(['status' => EducaAnnouncement::STATUS_ARQUIVADO]);
            $this->audit->record('educa', 'announcement.archived', "EducaAnnouncement #{$aviso->id}", null, ['status' => 'arquivado']);
        });
    }

    public function registrarLeitura(string $avisoId, ?int $pessoaId = null, ?int $userId = null, ?string $ip = null): void
    {
        $aviso = $this->obter($avisoId);

        $jaLeu = EducaAnnouncementRead::query()
            ->where('announcement_id', $aviso->id)
            ->when($pessoaId, fn ($q) => $q->where('pessoa_id', $pessoaId))
            ->when(! $pessoaId && $userId, fn ($q) => $q->where('user_id', $userId))
            ->exists();

        if ($jaLeu) {
            return;
        }

        DB::transaction(function () use ($aviso, $pessoaId, $userId, $ip): void {
            EducaAnnouncementRead::create([
                'tenant_id' => $aviso->tenant_id,
                'announcement_id' => $aviso->id,
                'pessoa_id' => $pessoaId,
                'user_id' => $userId,
                'ip_address' => $ip,
                'read_at' => Carbon::now(),
            ]);

            $aviso->increment('total_leituras');
        });
    }
}
