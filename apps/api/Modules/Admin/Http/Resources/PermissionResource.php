<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Admin\Models\Module;

final class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'module' => $this->module ?? 'admin',
            // false = módulo desligado no catálogo (ex.: fora da versão 1): as telas do Admin escondem a permissão.
            'module_enabled' => !in_array($this->module ?? 'admin', Module::aliasesDesligados(), true),
        ];
    }
}