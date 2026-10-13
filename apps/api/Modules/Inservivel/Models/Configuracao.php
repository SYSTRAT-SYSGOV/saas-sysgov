<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Configurações do módulo por prefeitura (D10): doador e legislação dos termos e documentos exigidos das entidades.
 *
 * @property string|null $doador_nome
 * @property string|null $doador_cnpj
 * @property string|null $doador_cidade
 * @property string|null $doador_uf
 * @property string|null $foro
 * @property string|null $responsavel_nome
 * @property string|null $responsavel_cargo
 * @property list<string>|null $legislacao
 * @property list<array{chave: string, nome: string, obrigatorio: bool}>|null $documentos_exigidos
 */
final class Configuracao extends Model
{
    use TenantAware;

    protected $table = 'inservivel_configuracoes';

    protected $fillable = [
        'tenant_id', 'doador_nome', 'doador_cnpj', 'doador_cidade', 'doador_uf', 'foro',
        'responsavel_nome', 'responsavel_cargo', 'legislacao', 'documentos_exigidos',
    ];

    protected $casts = ['tenant_id' => 'integer', 'legislacao' => 'array', 'documentos_exigidos' => 'array'];
}
