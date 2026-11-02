<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Importação por CSV de veículos, motoristas ou paradas.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $tipo veiculos | motoristas | paradas | censo
 * @property int|null $leiaute_id
 * @property string $arquivo_nome
 * @property string|null $arquivo_caminho
 * @property string $status previa | na_fila | processando | concluida | falha | cancelada
 * @property int $total
 * @property int $validas
 * @property int $criadas
 * @property int $ignoradas
 * @property int $com_erro
 * @property array<string, mixed>|null $relatorio divergencias, avisos, truncado e, no Censo, resumo, opcoes e leiaute
 * @property string|null $mensagem
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $concluida_em
 */
final class Importacao extends Model
{
    use TenantAware;

    protected $table = 'transporte_importacoes';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'tipo', 'leiaute_id', 'arquivo_nome', 'arquivo_caminho', 'status', 'total', 'validas', 'criadas', 'ignoradas', 'com_erro',
        'relatorio', 'mensagem', 'criado_por', 'concluida_em',
    ];

    /** @var list<string> */
    protected $hidden = ['arquivo_caminho'];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'leiaute_id' => 'integer', 'total' => 'integer', 'validas' => 'integer', 'criadas' => 'integer', 'ignoradas' => 'integer',
        'com_erro' => 'integer', 'relatorio' => 'array', 'criado_por' => 'integer', 'concluida_em' => 'datetime',
    ];
}
