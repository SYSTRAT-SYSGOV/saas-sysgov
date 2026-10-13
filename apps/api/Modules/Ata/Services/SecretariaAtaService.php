<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Models\User;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Modules\Ata\Models\AtaSecretariaConfig;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Secretarias da ata = unidades do Organograma (D1). Define quais secretarias o usuário enxerga (pela lotação
 * vigente, subindo até a unidade de tipo secretaria) e guarda a configuração da ata por secretaria.
 */
final class SecretariaAtaService
{
    public const TIPOS_SECRETARIA = ['secretaria', 'autarquia', 'fundacao', 'gabinete'];

    public function __construct(
        private readonly ArquivoAtaService $arquivos,
        private readonly AuditLogger $audit,
    ) {}

    /** @return list<int> ids das secretarias da lotação vigente do usuário */
    public function secretariasDoUsuario(User $user): array
    {
        $hoje = now()->toDateString();
        $unidades = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->where(fn ($q) => $q->whereNull('valid_from')->orWhereDate('valid_from', '<=', $hoje))
            ->where(fn ($q) => $q->whereNull('valid_to')->orWhereDate('valid_to', '>=', $hoje))
            ->with('orgUnit')
            ->get()
            ->pluck('orgUnit')
            ->filter(fn ($u): bool => $u instanceof OrgUnit);

        $ids = [];
        foreach ($unidades as $unidade) {
            $secretaria = $this->secretariaDe($unidade);
            if ($secretaria !== null) {
                $ids[$secretaria->id] = $secretaria->id;
            }
        }

        return array_values($ids);
    }

    /** A própria unidade, se for secretaria, ou o ancestral de tipo secretaria mais próximo. */
    public function secretariaDe(OrgUnit $unidade): ?OrgUnit
    {
        $partes = explode('.', (string) $unidade->path);
        $prefixos = [];
        foreach (array_keys($partes) as $i) {
            $prefixos[] = implode('.', array_slice($partes, 0, $i + 1));
        }

        return OrgUnit::query()->whereIn('path', $prefixos)->whereIn('type', self::TIPOS_SECRETARIA)->orderByDesc('level')->first();
    }

    public function secretariaValida(int $id): ?OrgUnit
    {
        return OrgUnit::query()->whereKey($id)->where('is_active', true)->whereIn('type', self::TIPOS_SECRETARIA)->first();
    }

    /**
     * @param list<int>|null $somenteIds
     * @return list<array{id: int, nome: string, sigla: string|null, tem_timbrado: bool}>
     */
    public function listar(?array $somenteIds = null): array
    {
        $configs = AtaSecretariaConfig::query()->get()->keyBy('org_unit_id');

        return OrgUnit::query()->where('is_active', true)->whereIn('type', self::TIPOS_SECRETARIA)
            ->when($somenteIds !== null, fn ($q) => $q->whereIn('id', $somenteIds))
            ->orderBy('name')->get()
            ->map(function (OrgUnit $u) use ($configs): array {
                $config = $configs->get($u->id);

                return [
                    'id' => $u->id,
                    'nome' => (string) $u->name,
                    'sigla' => $config?->sigla ?: $u->acronym,
                    'tem_timbrado' => $config?->timbrado_path !== null,
                ];
            })->values()->all();
    }

    public function config(int $orgUnitId): ?AtaSecretariaConfig
    {
        return AtaSecretariaConfig::query()->where('org_unit_id', $orgUnitId)->first();
    }

    public function sigla(OrgUnit $secretaria): ?string
    {
        return $this->config($secretaria->id)?->sigla ?: $secretaria->acronym;
    }

    public function salvar(int $orgUnitId, ?string $sigla, ?UploadedFile $timbrado, bool $removerTimbrado): AtaSecretariaConfig
    {
        if ($this->secretariaValida($orgUnitId) === null) {
            throw new DomainException('Secretaria não encontrada no Organograma.');
        }

        return DB::transaction(function () use ($orgUnitId, $sigla, $timbrado, $removerTimbrado): AtaSecretariaConfig {
            $config = AtaSecretariaConfig::query()->firstOrNew(['org_unit_id' => $orgUnitId]);
            $antes = $config->exists ? $config->only(['sigla', 'timbrado_path']) : null;
            $config->sigla = $sigla !== null && trim($sigla) !== '' ? trim($sigla) : null;
            $antigo = $config->timbrado_path;
            if ($timbrado !== null) {
                $arquivo = $this->arquivos->guardarUpload($timbrado, 'timbrados');
                $config->timbrado_path = $arquivo['caminho'];
                $config->timbrado_mime = $arquivo['mime'];
            } elseif ($removerTimbrado) {
                $config->timbrado_path = null;
                $config->timbrado_mime = null;
            }
            $config->save();
            if ($antigo !== null && $antigo !== $config->timbrado_path) {
                DB::afterCommit(fn () => $this->arquivos->apagar($antigo));
            }
            $this->audit->record('ata', 'secretaria.configurada', "secretaria:{$orgUnitId}", $antes, $config->only(['sigla', 'timbrado_path']));

            return $config;
        });
    }
}
