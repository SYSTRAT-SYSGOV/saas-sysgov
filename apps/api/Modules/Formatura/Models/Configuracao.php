<?php

declare(strict_types=1);

namespace Modules\Formatura\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Formatura\Enums\TipoCalculo;

/**
 * Configuração da formatura de um ano letivo (uma por tenant e ano). Valores em centavos.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $ano_letivo
 * @property string $titulo
 * @property string $tipo_calculo
 * @property int $valor_base_centavos
 * @property int $valor_pessoa_extra_centavos
 * @property int $convidados_incluidos_padrao
 * @property int $max_parcelas
 * @property list<string>|null $chaves_pix
 * @property list<string> $formas_pagamento
 * @property list<int>|null $turmas_ids
 */
final class Configuracao extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'formatura_configuracoes';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'ano_letivo', 'titulo', 'tipo_calculo', 'valor_base_centavos', 'valor_pessoa_extra_centavos',
        'convidados_incluidos_padrao', 'max_parcelas', 'chaves_pix', 'formas_pagamento', 'turmas_ids',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'ano_letivo' => 'integer', 'valor_base_centavos' => 'integer',
        'valor_pessoa_extra_centavos' => 'integer', 'convidados_incluidos_padrao' => 'integer', 'max_parcelas' => 'integer',
        'chaves_pix' => 'array', 'formas_pagamento' => 'array', 'turmas_ids' => 'array',
    ];

    public function tipoCalculo(): TipoCalculo
    {
        return TipoCalculo::from($this->tipo_calculo);
    }

    /** @return list<int> */
    public function turmasFormandas(): array
    {
        return array_map('intval', $this->turmas_ids ?? []);
    }

    public function ehTurmaFormanda(?int $turmaId): bool
    {
        return $turmaId !== null && in_array($turmaId, $this->turmasFormandas(), true);
    }

    /** @return HasMany<Participacao, $this> */
    public function participacoes(): HasMany
    {
        return $this->hasMany(Participacao::class, 'configuracao_id');
    }
}
