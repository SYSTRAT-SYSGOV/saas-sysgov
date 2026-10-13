<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Campanha de um candidato (D2): eleição, cargo, UF de atuação, meta global e configuração do mapa.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property int $ano
 * @property string $cargo
 * @property string $uf
 * @property int $meta_votos_global
 * @property string $status ativa | encerrada
 * @property array<string, string>|null $cores_situacao
 * @property array{faixas: list<array{limite: int, cor: string}>, cor_acima: string}|null $faixas_meta
 * @property string|null $lgpd_termo
 * @property int $lgpd_termo_versao
 * @property string|null $lgpd_encarregado_nome
 * @property string|null $lgpd_encarregado_contato
 * @property int $lgpd_retencao_dias
 * @property \Illuminate\Support\Carbon|null $encerrada_em
 * @property-read Candidato|null $candidato
 */
final class Campanha extends Model
{
    use SoftDeletes;
    use TenantAware;

    public const SITUACOES = ['sem_atuacao', 'em_andamento', 'consolidado', 'prioritario', 'risco'];

    /** Cores padrão das situações — as mesmas do sistema de referência. */
    public const CORES_PADRAO = [
        'sem_atuacao' => '#94a3b8',
        'em_andamento' => '#3b82f6',
        'consolidado' => '#10b981',
        'prioritario' => '#f59e0b',
        'risco' => '#ef4444',
    ];

    /** Faixas padrão de meta de votos (até 100, até 250, até 350, acima de 350). */
    public const FAIXAS_PADRAO = [
        'faixas' => [
            ['limite' => 100, 'cor' => '#3b82f6'],
            ['limite' => 250, 'cor' => '#10b981'],
            ['limite' => 350, 'cor' => '#eab308'],
        ],
        'cor_acima' => '#ef4444',
    ];

    protected $table = 'campanha_campanhas';

    protected $fillable = [
        'tenant_id', 'nome', 'ano', 'cargo', 'uf', 'meta_votos_global', 'status', 'encerrada_em', 'cores_situacao', 'faixas_meta',
        'lgpd_termo', 'lgpd_termo_versao', 'lgpd_encarregado_nome', 'lgpd_encarregado_contato', 'lgpd_retencao_dias',
    ];

    protected $attributes = ['status' => 'ativa', 'meta_votos_global' => 0, 'lgpd_termo_versao' => 1, 'lgpd_retencao_dias' => 90];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'meta_votos_global' => 'integer',
        'cores_situacao' => 'array',
        'faixas_meta' => 'array',
        'lgpd_termo_versao' => 'integer',
        'lgpd_retencao_dias' => 'integer',
        'encerrada_em' => 'datetime',
    ];

    public function encerrada(): bool
    {
        return $this->status === 'encerrada';
    }

    /** @return array<string, string> */
    public function cores(): array
    {
        return [...self::CORES_PADRAO, ...($this->cores_situacao ?? [])];
    }

    /** @return array{faixas: list<array{limite: int, cor: string}>, cor_acima: string} */
    public function faixas(): array
    {
        return $this->faixas_meta ?? self::FAIXAS_PADRAO;
    }

    /**
     * Termo de privacidade vigente: o definido pela campanha ou o padrão (finalidade, base legal, retenção e direitos).
     */
    public function termoLgpd(): string
    {
        if ($this->lgpd_termo !== null && trim($this->lgpd_termo) !== '') {
            return $this->lgpd_termo;
        }
        /** @var Candidato|null $candidato */
        $candidato = $this->candidato;
        $quem = $candidato !== null ? $candidato->nome_urna : $this->nome;
        $encarregado = $this->lgpd_encarregado_nome
            ? "ao encarregado, {$this->lgpd_encarregado_nome}" . ($this->lgpd_encarregado_contato ? " ({$this->lgpd_encarregado_contato})" : '')
            : 'à coordenação da campanha';

        return "Ao enviar este cadastro, você autoriza a campanha de {$quem} a tratar os seus dados (nome, cidade, bairro, "
            . 'zona e seção, WhatsApp, data de nascimento, a demanda informada e a localização aproximada do aparelho, se '
            . 'permitida) e a sua manifestação de apoio político, exclusivamente para organizar a campanha e falar com você '
            . 'durante ela (LGPD, art. 11, I — consentimento específico e destacado). Os dados não são vendidos nem '
            . "repassados a terceiros. Encerrada a campanha, eles são anonimizados em até {$this->lgpd_retencao_dias} dias. "
            . "Você pode pedir acesso, correção ou exclusão a qualquer momento {$encarregado}.";
    }

    /** Data a partir da qual os eleitores da campanha encerrada são anonimizados (D5). */
    public function anonimizacaoPrevista(): ?\Illuminate\Support\Carbon
    {
        return $this->encerrada_em?->copy()->addDays($this->lgpd_retencao_dias);
    }

    /** @return HasOne<Candidato, $this> */
    public function candidato(): HasOne
    {
        return $this->hasOne(Candidato::class, 'campanha_id')->withoutGlobalScope('campanha');
    }

    /** @return HasMany<Membro, $this> */
    public function membros(): HasMany
    {
        return $this->hasMany(Membro::class, 'campanha_id');
    }
}
