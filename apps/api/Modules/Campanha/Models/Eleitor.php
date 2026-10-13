<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Eleitor captado pelo formulário público (D3). Nome, WhatsApp, nascimento, demanda, IP e navegador ficam
 * criptografados no banco; o WhatsApp tem também um HMAC (só dígitos) para deduplicar por campanha.
 * Nunca passar toArray() deste model para auditoria ou eventos: ele traz os dados pessoais.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property int|null $link_id
 * @property int|null $coordenador_id
 * @property int|null $cabo_id
 * @property string|null $nome
 * @property int $codigo_ibge
 * @property string|null $bairro
 * @property int|null $zona
 * @property int|null $secao
 * @property string|null $whatsapp
 * @property string|null $whatsapp_hash
 * @property string|null $data_nascimento
 * @property string|null $demanda
 * @property float|null $latitude
 * @property float|null $longitude
 * @property int|null $precisao_m
 * @property int $consentimento_versao
 * @property Carbon $consentido_em
 * @property string|null $ip
 * @property string|null $user_agent
 * @property Carbon|null $anonimizado_em
 * @property Carbon $created_at
 */
final class Eleitor extends Model
{
    use CampanhaAware;
    use TenantAware;

    /** Campos pessoais apagados na anonimização (D5). */
    public const CAMPOS_PESSOAIS = ['nome', 'whatsapp', 'whatsapp_hash', 'data_nascimento', 'demanda', 'ip', 'user_agent'];

    protected $table = 'campanha_eleitores';

    protected $fillable = [
        'tenant_id', 'campanha_id', 'link_id', 'coordenador_id', 'cabo_id', 'nome', 'codigo_ibge', 'bairro', 'zona', 'secao',
        'whatsapp', 'whatsapp_hash', 'data_nascimento', 'demanda', 'latitude', 'longitude', 'precisao_m',
        'consentimento_versao', 'consentido_em', 'ip', 'user_agent', 'anonimizado_em',
    ];

    protected $hidden = ['whatsapp_hash'];

    protected $casts = [
        'tenant_id' => 'integer',
        'campanha_id' => 'integer',
        'link_id' => 'integer',
        'coordenador_id' => 'integer',
        'cabo_id' => 'integer',
        'codigo_ibge' => 'integer',
        'zona' => 'integer',
        'secao' => 'integer',
        'nome' => 'encrypted',
        'whatsapp' => 'encrypted',
        'data_nascimento' => 'encrypted',
        'demanda' => 'encrypted',
        'ip' => 'encrypted',
        'user_agent' => 'encrypted',
        'latitude' => 'float',
        'longitude' => 'float',
        'precisao_m' => 'integer',
        'consentimento_versao' => 'integer',
        'consentido_em' => 'datetime',
        'anonimizado_em' => 'datetime',
    ];

    /** WhatsApp só com dígitos (null se vazio). */
    public static function normalizarWhatsapp(?string $whatsapp): ?string
    {
        $digitos = preg_replace('/\D/', '', (string) $whatsapp) ?? '';

        return $digitos === '' ? null : $digitos;
    }

    /** HMAC do WhatsApp normalizado com a chave da aplicação (D3). */
    public static function hashWhatsapp(?string $whatsapp): ?string
    {
        $digitos = self::normalizarWhatsapp($whatsapp);

        return $digitos === null ? null : hash_hmac('sha256', $digitos, (string) config('app.key'));
    }

    /** @return BelongsTo<LinkCaptacao, $this> */
    public function link(): BelongsTo
    {
        return $this->belongsTo(LinkCaptacao::class, 'link_id');
    }

    /** @return BelongsTo<Coordenador, $this> */
    public function coordenador(): BelongsTo
    {
        return $this->belongsTo(Coordenador::class, 'coordenador_id');
    }

    /** @return BelongsTo<CaboEleitoral, $this> */
    public function cabo(): BelongsTo
    {
        return $this->belongsTo(CaboEleitoral::class, 'cabo_id');
    }
}
