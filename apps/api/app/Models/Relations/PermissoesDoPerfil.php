<?php

declare(strict_types=1);

namespace App\Models\Relations;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Permissões de um perfil. Os seeders de RBAC rodam a cada subida do container e chamam `sync()` com a lista que
 * têm no código; sem cuidado, isso apagaria o que o administrador do tenant marcou à mão na tela de Perfis.
 *
 * `sync()` aqui preserva as permissões dos módulos em {@see self::MODULOS_DO_ADMINISTRADOR}, que nenhum seeder
 * define: elas são atribuídas só pelo administrador. As telas de administração usam {@see self::syncExato()},
 * que grava exatamente o que foi enviado, inclusive removendo.
 *
 * @extends BelongsToMany<Permission, \App\Models\Role>
 */
final class PermissoesDoPerfil extends BelongsToMany
{
    /** Módulos cujas permissões o administrador atribui aos perfis que quiser (nenhum seeder as define). */
    public const MODULOS_DO_ADMINISTRADOR = ['pessoas'];

    /**
     * @param mixed $ids
     * @param bool $detaching
     * @return array{attached: array<int, int|string>, detached: array<int, int|string>, updated: array<int, int|string>}
     */
    public function sync($ids, $detaching = true)
    {
        $registros = $this->formatRecordsList($this->parseIds($ids));

        if ($detaching) {
            $atribuidas = $this->newPivotQuery()->pluck($this->relatedPivotKey)->all();
            $preservar = $atribuidas === [] ? [] : Permission::query()
                ->whereIn('id', $atribuidas)
                ->whereIn('module', self::MODULOS_DO_ADMINISTRADOR)
                ->pluck('id')
                ->all();

            foreach ($preservar as $id) {
                $registros[$id] ??= [];
            }
        }

        return parent::sync($registros, $detaching);
    }

    /**
     * Grava exatamente a lista enviada (edição humana): remove até as permissões preservadas pelo `sync()`.
     *
     * @param mixed $ids
     * @return array{attached: array<int, int|string>, detached: array<int, int|string>, updated: array<int, int|string>}
     */
    public function syncExato($ids)
    {
        return parent::sync($ids, true);
    }
}
