<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Ciclo de Avaliação Periódica de Desempenho.
 *
 * Status: planejamento → em_avaliacao → recursivo → deliberacao → homologado → encerrado
 */
final class CicloAvaliacao extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_ciclos';

    protected $fillable = [
        'tenant_id',
        'ano_referencia',
        'ano_competencia',
        'nome',
        'data_inicio_avaliacao',
        'data_fim_avaliacao',
        'data_inicio',
        'data_fim',
        'data_limite_preenchimento',
        'data_limite_recurso',
        'status',
        'cadencia_automatica',
        'etapa_cadencia',
        'modo_f1',
        'modo_f2',
        'tipo_assinatura_ata',
        'metadata',
        'regras_config',
        // RN-04: NFC mínima de elegibilidade — dinâmica por ciclo
        'nota_corte_nfc',
        // RN-08: percentual de quinquênio — cadastral, segregado do desempenho
        'quinquenio_percentual',
        // RF-06: redistribui peso do fator H para cargos sem atendimento ao público
        'redistribuir_fator_h',
    ];

    protected $casts = [
        'tenant_id'                 => 'integer',
        'ano_referencia'            => 'integer',
        'ano_competencia'           => 'integer',
        'data_inicio_avaliacao'     => 'date',
        'data_fim_avaliacao'        => 'date',
        'data_inicio'               => 'date',
        'data_fim'                  => 'date',
        'data_limite_preenchimento' => 'date',
        'data_limite_recurso'       => 'date',
        'cadencia_automatica'       => 'boolean',
        'etapa_cadencia'            => 'integer',
        'metadata'                  => 'array',
        'regras_config'             => 'array',
        // RN-04 — string para preservar precisão decimal (nunca float)
        'nota_corte_nfc'            => 'string',
        'quinquenio_percentual'     => 'string',
        'redistribuir_fator_h'      => 'boolean',
    ];

    // ── Status permitidos ─────────────────────────────────────────────
    public const STATUS_PLANEJAMENTO = 'planejamento';
    public const STATUS_PLANEJADO    = 'planejado';
    public const STATUS_ABERTO       = 'aberto';
    public const STATUS_EM_AVALIACAO = 'em_avaliacao';
    public const STATUS_RECURSIVO    = 'recursivo';
    public const STATUS_EM_RECURSO   = 'em_recurso';
    public const STATUS_DELIBERACAO  = 'deliberacao';
    public const STATUS_HOMOLOGADO   = 'homologado';
    public const STATUS_ENCERRADO    = 'encerrado';

    public const MODOS_F = ['manual', 'api'];
    public const TIPOS_ASSINATURA = ['sha256', 'icp_brasil'];

    // ── Boot para sincronização de campos legados e novos ─────────────
    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (CicloAvaliacao $ciclo): void {
            if ($ciclo->ano_competencia && ! $ciclo->ano_referencia) {
                $ciclo->ano_referencia = $ciclo->ano_competencia;
            } elseif ($ciclo->ano_referencia && ! $ciclo->ano_competencia) {
                $ciclo->ano_competencia = $ciclo->ano_referencia;
            }

            if ($ciclo->data_inicio && ! $ciclo->data_inicio_avaliacao) {
                $ciclo->data_inicio_avaliacao = $ciclo->data_inicio;
            } elseif ($ciclo->data_inicio_avaliacao && ! $ciclo->data_inicio) {
                $ciclo->data_inicio = $ciclo->data_inicio_avaliacao;
            }

            if ($ciclo->data_fim && ! $ciclo->data_fim_avaliacao) {
                $ciclo->data_fim_avaliacao = $ciclo->data_fim;
            } elseif ($ciclo->data_fim_avaliacao && ! $ciclo->data_fim) {
                $ciclo->data_fim = $ciclo->data_fim_avaliacao;
            }

            if (! $ciclo->data_limite_recurso && ($ciclo->data_fim ?? $ciclo->data_fim_avaliacao)) {
                $ciclo->data_limite_recurso = $ciclo->data_fim ?? $ciclo->data_fim_avaliacao;
            }
        });
    }

    // ── Relacionamentos ───────────────────────────────────────────────

    public function avaliacoes(): HasMany
    {
        return $this->hasMany(Avaliacao::class, 'ciclo_id');
    }

    public function diarioBordo(): HasMany
    {
        return $this->hasMany(DiarioBordo::class, 'ciclo_id');
    }

    public function comissao(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Comissao::class, 'ciclo_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeAtivo($query)
    {
        return $query->whereNotIn('status', [self::STATUS_ENCERRADO]);
    }

    public function scopeEmAvaliacao($query)
    {
        return $query->whereIn('status', [self::STATUS_EM_AVALIACAO, self::STATUS_ABERTO]);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    public function usaModoManualF1(): bool
    {
        return $this->modo_f1 === 'manual';
    }

    public function usaModoManualF2(): bool
    {
        return $this->modo_f2 === 'manual';
    }

    public function usaAssinaturaIcp(): bool
    {
        return $this->tipo_assinatura_ata === 'icp_brasil';
    }

    /**
     * Retorna a configuração de regras dinâmicas com valores default.
     *
     * nota_corte_nfc é 100% dinâmica — a Comissão configura antes de abrir o ciclo.
     * Default sugerido pelo sistema: 70.00 (PRD §RN-04).
     *
     * @return array<string, mixed>
     */
    public function getRegras(): array
    {
        $default = [
            'dias_preenchimento'               => 30,
            'dias_ciencia'                     => 10,
            'dias_recurso'                     => 10,
            'dias_relatoria'                   => 5,
            'intersticio_meses'                => 12,
            'limite_faltas_injustificadas'      => 5,
            'limite_dias_afastamento'           => 180,
            // RN-04: NFC mínima para progressão — usa coluna dedicada do ciclo
            'nota_corte_progressao'             => $this->nota_corte_nfc ?? '70.00',
            'percentual_amostragem_auditoria'   => 10,
            'trava_graus_evidencia'             => [1, 2, 5],
            'excluir_estagiarios'               => true,
            'excluir_comissionados'             => true,
            // RN-08
            'quinquenio_percentual'             => $this->quinquenio_percentual ?? '5.00',
            // RF-06
            'redistribuir_fator_h'              => $this->redistribuir_fator_h ?? false,
        ];

        return array_merge($default, $this->regras_config ?? []);
    }

    public function temAvaliacoesPendentes(): bool
    {
        return $this->avaliacoes()
            ->whereNull('data_conclusao')
            ->exists();
    }

    public function temRecursosPendentes(): bool
    {
        return Recurso::query()
            ->whereHas('avaliacao', fn ($q) => $q->where('ciclo_id', $this->id))
            ->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
            ->exists();
    }

    public function isHomologavel(): bool
    {
        return ! $this->temAvaliacoesPendentes() && ! $this->temRecursosPendentes();
    }
}
