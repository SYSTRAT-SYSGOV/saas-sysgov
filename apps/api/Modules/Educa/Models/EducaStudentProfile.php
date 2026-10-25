<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Perfil Cadastral e Informações Complementares do Estudante (Extensão de Pessoas).
 */
final class EducaStudentProfile extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_student_profiles';

    protected $fillable = [
        'tenant_id',
        'pessoa_id',
        'codigo_nis',
        'cartao_sus',
        'bolsa_familia',
        'necessidades_especiais',
        'laudo_medico_aee',
        'transporte_escolar_publico',
        'certidao_nascimento_termo',
        'certidao_nascimento_livro',
        'certidao_nascimento_folha',
        'certidao_cartorio',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'bolsa_familia' => 'boolean',
        'necessidades_especiais' => 'boolean',
        'transporte_escolar_publico' => 'boolean',
    ];

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }
}
