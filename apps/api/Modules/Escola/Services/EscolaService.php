<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Models\User;
use App\Services\ModuleAccessService;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Escola\Models\Escola;
use Modules\Escola\Services\Concerns\RegistraMutacao;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Escolas do órgão (D1/D2): cadastro, logo e a lista de escolas que cada usuário acessa em cada
 * módulo de educação (para o seletor do painel).
 */
final class EscolaService
{
    use RegistraMutacao;

    /** Módulos cujas rotas exigem escola de trabalho. */
    public const MODULOS = ['escola', 'pedagogico', 'formatura', 'passeio', 'portfolio'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
        private readonly ModuleAccessService $access,
    ) {}

    /** @return Collection<int, Escola> */
    public function listar(): Collection
    {
        return Escola::query()->with('orgUnit:id,name,code')->orderByDesc('ativa')->orderBy('nome')->get();
    }

    /**
     * @param array{nome: string, inep?: string|null, org_unit_id: int} $dados
     */
    public function criar(array $dados): Escola
    {
        $dados = $this->normalizar($dados);

        return DB::transaction(function () use ($dados): Escola {
            $escola = Escola::create($dados);
            $this->auditar('escola', 'criada', $escola->id, null, $escola->toArray());

            return $escola;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Escola $escola, array $dados): Escola
    {
        $dados = $this->normalizar($dados, $escola);

        return DB::transaction(function () use ($escola, $dados): Escola {
            $antes = $escola->toArray();
            $escola->update($dados);
            $this->auditar('escola', 'atualizada', $escola->id, $antes, $escola->toArray());

            return $escola;
        });
    }

    public function definirLogo(Escola $escola, UploadedFile $arquivo): Escola
    {
        return DB::transaction(function () use ($escola, $arquivo): Escola {
            $anterior = $escola->logo_path;
            $caminho = $arquivo->storeAs(
                "escola/{$escola->tenant_id}/escolas/{$escola->id}",
                Str::uuid()->toString() . '.' . $arquivo->extension(),
                UnidadeService::DISCO,
            );
            $escola->update(['logo_path' => $caminho]);
            if ($anterior !== null && $anterior !== $caminho) {
                Storage::disk(UnidadeService::DISCO)->delete($anterior);
            }
            $this->auditar('escola', 'logo_definido', $escola->id, ['logo_path' => $anterior], ['logo_path' => $caminho]);

            return $escola;
        });
    }

    /**
     * Escolas que o usuário acessa no módulo (D2): todas para o admin geral ou acesso irrestrito;
     * senão, as das unidades do seu escopo (com descendentes) e as ainda sem unidade.
     *
     * @return Collection<int, Escola>
     */
    public function minhas(User $user, string $modulo): Collection
    {
        if (!in_array($modulo, self::MODULOS, true) || !$this->access->hasModuleAccess($user, $modulo, $this->tenant->id())) {
            return new Collection();
        }

        $permitidas = $this->access->allowedOrgUnitIds($user, $modulo, $this->tenant->id());

        return Escola::query()
            ->when($permitidas !== null, fn ($q) => $q->where(fn ($q2) => $q2->whereNull('org_unit_id')->orWhereIn('org_unit_id', $permitidas)))
            ->orderByDesc('ativa')
            ->orderBy('nome')
            ->get(['id', 'nome', 'inep', 'ativa', 'org_unit_id', 'logo_path']);
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function normalizar(array $dados, ?Escola $atual = null): array
    {
        if (array_key_exists('nome', $dados)) {
            $dados['nome'] = trim((string) $dados['nome']);
        }
        if (array_key_exists('inep', $dados)) {
            $inep = trim((string) $dados['inep']);
            $dados['inep'] = $inep === '' ? null : $inep;
            if ($dados['inep'] !== null && Escola::query()->where('inep', $dados['inep'])->when($atual, fn ($q) => $q->whereKeyNot($atual->id))->exists()) {
                throw new DomainException('Já existe uma escola com este código INEP no órgão.');
            }
        }
        if (array_key_exists('org_unit_id', $dados)) {
            $unidade = OrgUnit::query()->where('tenant_id', $this->tenant->id())->find((int) $dados['org_unit_id']);
            if ($unidade === null) {
                throw new DomainException('Unidade do organograma não encontrada neste órgão.');
            }
            if (Escola::query()->where('org_unit_id', $unidade->id)->when($atual, fn ($q) => $q->whereKeyNot($atual->id))->exists()) {
                throw new DomainException('Esta unidade do organograma já está ligada a outra escola.');
            }
        }

        return $dados;
    }
}
