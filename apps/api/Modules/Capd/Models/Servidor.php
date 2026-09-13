<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Servidor extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_servidores';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'matricula',
        'cpf',
        'pis_pasep',
        'nome_completo',
        'nome_social',
        'email',
        'telefone',
        'data_nascimento',
        'regime_juridico',
        'regime_previdenciario',
        'data_admissao',
        'data_posse',
        'data_exercicio',
        'carga_horaria_semanal',
        'cargo_efetivo',
        'funcao_gratificada',
        'nivel_padrao',
        'plano_carreira_id',
        'orgao_lotacao',
        'lotacao_fisica',
        'chefia_imediata_id',
        'situacao_funcional',
        'estagio_probatorio',
        'estagio_fase_atual',
        'estagio_data_fim',
        'estagio_status',
        'origem_sistema',
        'metadata',
    ];

    protected $casts = [
        'tenant_id'             => 'integer',
        'user_id'               => 'integer',
        'plano_carreira_id'     => 'integer',
        'chefia_imediata_id'    => 'integer',
        'carga_horaria_semanal' => 'integer',
        'data_nascimento'       => 'date',
        'data_admissao'         => 'date',
        'data_posse'            => 'date',
        'data_exercicio'        => 'date',
        'estagio_data_fim'      => 'date',
        'estagio_probatorio'    => 'boolean',
        'estagio_fase_atual'    => 'integer',
        'metadata'              => 'array',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<PlanoCarreira, $this> */
    public function planoCarreira(): BelongsTo
    {
        return $this->belongsTo(PlanoCarreira::class, 'plano_carreira_id');
    }

    /** @return BelongsTo<Servidor, $this> */
    public function chefiaImediata(): BelongsTo
    {
        return $this->belongsTo(self::class, 'chefia_imediata_id');
    }

    /** @return HasMany<Servidor, $this> */
    public function subordinados(): HasMany
    {
        return $this->hasMany(self::class, 'chefia_imediata_id');
    }

    /** @return HasMany<ServidorAfastamento, $this> */
    public function afastamentos(): HasMany
    {
        return $this->hasMany(ServidorAfastamento::class, 'servidor_id');
    }

    /** @return HasMany<Avaliacao, $this> */
    public function avaliacoes(): HasMany
    {
        return $this->hasMany(Avaliacao::class, 'servidor_id');
    }

    /** @return HasMany<DiarioBordo, $this> */
    public function incidentes(): HasMany
    {
        return $this->hasMany(DiarioBordo::class, 'servidor_id');
    }

    /**
     * Retorna se o servidor está apto para avaliação no ciclo atual.
     */
    public function isAptoParaAvaliacao(): bool
    {
        return in_array($this->situacao_funcional, ['ativo', 'em_exercicio'], true);
    }
}
