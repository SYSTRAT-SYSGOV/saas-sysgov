<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class OrgUnitTreeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'tenant_id' => $this->resource['tenant_id'],
            'parent_id' => $this->resource['parent_id'],
            'name' => $this->resource['name'],
            'code' => $this->resource['code'],
            'acronym' => $this->resource['acronym'] ?? null,
            'type' => $this->resource['type'],
            'level' => $this->resource['level'],
            'path' => $this->resource['path'],
            'order' => $this->resource['order'],
            'is_active' => $this->resource['is_active'],
            'inactivation_reason' => $this->resource['inactivation_reason'] ?? null,
            'metadata' => $this->resource['metadata'] ?? null,
            'users_count' => $this->resource['users_count'] ?? 0,
            'responsibles' => $this->resource['responsibles'] ?? [],
            'children' => self::collection($this->resource['children'] ?? []),
        ];
    }
}
