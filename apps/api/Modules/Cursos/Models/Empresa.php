<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Empresa da biblioteca do órgão (D10), ligada aos participantes que ela envia aos cursos. Alimenta
 * {EMPRESA} (nome fantasia, ou a razão social) e {CNPJ} no texto do certificado.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $pessoa_id pessoa jurídica do Cadastro de Pessoas
 * @property string $razao_social
 * @property string|null $nome_fantasia
 * @property string|null $cnpj somente dígitos
 * @property string|null $email
 * @property string|null $telefone
 * @property string|null $responsavel
 * @property string|null $observacoes
 * @property bool $ativa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Empresa extends Model
{
    use TenantAware;

    protected $table = 'cursos_empresas';

    protected $fillable = ['tenant_id', 'pessoa_id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'responsavel', 'observacoes', 'ativa'];

    protected $attributes = ['ativa' => true];

    protected $casts = [
        'tenant_id' => 'integer',
        'ativa' => 'boolean',
    ];

    /** Nome impresso em {EMPRESA}: o fantasia, como no sistema de referência; sem ele, a razão social. */
    public function nomeImpresso(): string
    {
        return $this->nome_fantasia !== null && trim($this->nome_fantasia) !== '' ? $this->nome_fantasia : $this->razao_social;
    }

    /** CNPJ com máscara (00.000.000/0000-00), ou vazio. */
    public function cnpjFormatado(): string
    {
        $d = (string) $this->cnpj;

        return strlen($d) === 14 ? vsprintf('%s.%s.%s/%s-%s', [substr($d, 0, 2), substr($d, 2, 3), substr($d, 5, 3), substr($d, 8, 4), substr($d, 12, 2)]) : $d;
    }
}
