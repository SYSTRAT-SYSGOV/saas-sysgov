<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Unidades do Organograma usadas pelo módulo (D3): a secretaria do usuário (pela lotação) e a validação de
 * secretaria/setor do bem.
 */
final class LotacaoService
{
    /** Tipos de unidade aceitos como "secretaria" do bem. */
    public const TIPOS_SECRETARIA = ['secretaria', 'autarquia', 'fundacao', 'gabinete'];

    /** Secretaria da lotação vigente do usuário (a primária, se houver), subindo pela árvore; null sem lotação. */
    public function secretariaDoUsuario(User $user): ?OrgUnit
    {
        $hoje = now()->toDateString();
        $lotacao = OrgUnitUser::query()
            ->where('user_id', $user->id)
            ->where(fn ($q) => $q->whereNull('valid_from')->orWhereDate('valid_from', '<=', $hoje))
            ->where(fn ($q) => $q->whereNull('valid_to')->orWhereDate('valid_to', '>=', $hoje))
            ->orderByDesc('is_primary')->orderBy('id')
            ->with('orgUnit')
            ->first();
        $unidade = $lotacao?->orgUnit;

        return $unidade instanceof OrgUnit ? $this->secretariaDe($unidade) : null;
    }

    /** A própria unidade, se for secretaria, ou o ancestral de tipo secretaria mais próximo. */
    public function secretariaDe(OrgUnit $unidade): ?OrgUnit
    {
        $partes = explode('.', $unidade->path);
        $prefixos = [];
        foreach (array_keys($partes) as $i) {
            $prefixos[] = implode('.', array_slice($partes, 0, $i + 1));
        }

        return OrgUnit::query()->whereIn('path', $prefixos)->whereIn('type', self::TIPOS_SECRETARIA)
            ->orderByDesc('level')->first();
    }

    public function secretariaValida(int $id): ?OrgUnit
    {
        return OrgUnit::query()->whereKey($id)->where('is_active', true)->whereIn('type', self::TIPOS_SECRETARIA)->first();
    }

    /** O setor existe, está ativo e fica abaixo da secretaria. */
    public function setorDaSecretaria(int $setorId, OrgUnit $secretaria): ?OrgUnit
    {
        return OrgUnit::query()->whereKey($setorId)->where('is_active', true)
            ->where('path', 'like', $secretaria->path . '.%')->first();
    }

    /** Casa um nome ou sigla vindos da planilha com as unidades ativas (sem acento, minúsculo, espaços únicos). */
    public function casarPorNome(string $texto, ?OrgUnit $dentroDe = null, bool $soSecretarias = true): ?OrgUnit
    {
        $alvo = self::normalizar($texto);
        if ($alvo === '') {
            return null;
        }
        $consulta = OrgUnit::query()->where('is_active', true)
            ->when($soSecretarias, fn ($q) => $q->whereIn('type', self::TIPOS_SECRETARIA))
            ->when($dentroDe !== null, fn ($q) => $q->where('path', 'like', $dentroDe->path . '.%'));

        foreach ($consulta->get(['id', 'name', 'acronym', 'path', 'type', 'level']) as $unidade) {
            if (self::normalizar($unidade->name) === $alvo || ($unidade->acronym !== null && self::normalizar($unidade->acronym) === $alvo)) {
                return $unidade;
            }
        }

        return null;
    }

    public static function normalizar(string $texto): string
    {
        return (string) preg_replace('/\s+/', ' ', trim(Str::lower(Str::ascii($texto))));
    }
}
