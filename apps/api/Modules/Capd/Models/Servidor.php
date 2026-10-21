<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Servidor no módulo CAPD.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $user_id
 * @property int|null $pessoa_id pessoa do Cadastro de Pessoas (fonte dos dados civis)
 * @property string $matricula
 * @property string|null $cpf
 * @property string $nome_completo
 * @property string|null $nome_social
 * @property \Illuminate\Support\Carbon|null $data_nascimento
 * @property string|null $regime_juridico
 * @property \Illuminate\Support\Carbon|null $data_exercicio
 * @property string|null $cargo_efetivo
 * @property string|null $orgao_lotacao
 * @property string|null $lotacao_fisica
 * @property int|null $plano_carreira_id
 * @property bool $atende_publico
 * @property PlanoCarreira|null $planoCarreira
 * @property OrgUnit|null $orgUnit
 */
final class Servidor extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_servidores';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'pessoa_id',
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
        'atende_publico',
        'funcao_gratificada',
        'nivel_padrao',
        'plano_carreira_id',
        'orgao_lotacao',
        'lotacao_fisica',
        'org_unit_id',
        'chefia_imediata_id',
        'situacao_funcional',
        'estagio_probatorio',
        'estagio_fase_atual',
        'estagio_data_fim',
        'estagio_status',
        'origem_sistema',
        'metadata',
    ];

    /** @var list<string> */
    protected $hidden = ['pessoa'];

    protected $casts = [
        'tenant_id'             => 'integer',
        'user_id'               => 'integer',
        'pessoa_id'             => 'integer',
        'plano_carreira_id'     => 'integer',
        'org_unit_id'           => 'integer',
        'chefia_imediata_id'    => 'integer',
        'carga_horaria_semanal' => 'integer',
        'data_nascimento'       => 'date',
        'data_admissao'         => 'date',
        'data_posse'            => 'date',
        'data_exercicio'        => 'date',
        'estagio_data_fim'      => 'date',
        'estagio_probatorio'    => 'boolean',
        'atende_publico'        => 'boolean',
        'estagio_fase_atual'    => 'integer',
        'metadata'              => 'array',
    ];

    protected static function booted(): void
    {
        static::updating(function (self $servidor): void {
            if (! $servidor->isDirty('org_unit_id')) {
                return;
            }

            $hoje = now()->toDateString();

            ServidorUnitHistory::query()
                ->where('servidor_id', $servidor->id)
                ->aberto()
                ->update(['valido_ate' => $hoje]);

            if ($servidor->org_unit_id !== null) {
                ServidorUnitHistory::query()->create([
                    'tenant_id'   => $servidor->tenant_id,
                    'servidor_id' => $servidor->id,
                    'org_unit_id' => $servidor->org_unit_id,
                    'valido_de'   => $hoje,
                    'valido_ate'  => null,
                ]);
            }
        });

        static::created(function (self $servidor): void {
            if ($servidor->org_unit_id !== null) {
                ServidorUnitHistory::query()->create([
                    'tenant_id'   => $servidor->tenant_id,
                    'servidor_id' => $servidor->id,
                    'org_unit_id' => $servidor->org_unit_id,
                    'valido_de'   => $servidor->data_exercicio?->toDateString() ?? now()->toDateString(),
                    'valido_ate'  => null,
                ]);
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /**
     * CPF só com dígitos. Fonte: a pessoa do cadastro central quando ela já está carregada (pessoa pendente não tem CPF);
     * senão, a cópia local. Não carrega a relação sozinho, para não gerar uma consulta por servidor em listas.
     */
    public function cpfDigitos(): string
    {
        if ($this->relationLoaded('pessoa') && $this->pessoa !== null) {
            if ($this->pessoa->documento_pendente) {
                return '';
            }

            try {
                return Documento::somenteDigitos((string) $this->pessoa->documento);
            } catch (\Throwable) {
                // Documento ilegível (chave trocada ou dado corrompido): cai na cópia local.
            }
        }

        return Documento::somenteDigitos((string) $this->cpf);
    }

    /** CPF com pontuação (000.000.000-00), ou vazio. */
    public function cpfFormatado(): string
    {
        $d = $this->cpfDigitos();

        return strlen($d) === 11 ? vsprintf('%s.%s.%s-%s', [substr($d, 0, 3), substr($d, 3, 3), substr($d, 6, 3), substr($d, 9, 2)]) : '';
    }

    /** Data de nascimento: a da pessoa quando ela já está carregada e tem a data; senão, a cópia local. */
    public function nascimentoDaPessoa(): ?\Illuminate\Support\Carbon
    {
        if ($this->relationLoaded('pessoa') && $this->pessoa?->data_nascimento !== null) {
            return $this->pessoa->data_nascimento;
        }

        return $this->data_nascimento;
    }

    /** Nome social: o da pessoa quando ela já está carregada; senão, a cópia local. */
    public function nomeSocialDaPessoa(): ?string
    {
        if ($this->relationLoaded('pessoa') && $this->pessoa !== null) {
            return $this->pessoa->nome_social;
        }

        return $this->nome_social;
    }

    /**
     * Servidores com esse CPF (11 dígitos): pelo documento da pessoa do cadastro central ou, enquanto a cópia local
     * existir, pelo CPF gravado no servidor (com ou sem pontuação). Com outro tamanho, não casa com ninguém.
     *
     * @param \Illuminate\Database\Eloquent\Builder<Servidor> $query
     * @return \Illuminate\Database\Eloquent\Builder<Servidor>
     */
    public function scopeComCpf($query, string $cpf)
    {
        $digitos = Documento::somenteDigitos($cpf);

        return $query->where(function ($q) use ($digitos): void {
            if (strlen($digitos) !== 11) {
                $q->whereRaw('1 = 0');

                return;
            }

            $formatado = substr($digitos, 0, 3) . '.' . substr($digitos, 3, 3) . '.' . substr($digitos, 6, 3) . '-' . substr($digitos, 9, 2);
            $q->whereHas('pessoa', fn ($p) => $p->where('documento_hash', Documento::hash($digitos)))
                ->orWhereIn('cpf', [$digitos, $formatado]);
        });
    }

    /**
     * No JSON, o `cpf` vem da pessoa quando ela está carregada, para o contrato com o frontend não depender da coluna
     * (a etapa B a remove). A relação em si nunca sai na resposta: ela traz dado civil que o cliente não pede.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $dados = parent::toArray();
        if ($this->relationLoaded('pessoa')) {
            $dados['cpf'] = $this->cpfFormatado();
        }

        return $dados;
    }

    /** @return BelongsTo<PlanoCarreira, $this> */
    public function planoCarreira(): BelongsTo
    {
        return $this->belongsTo(PlanoCarreira::class, 'plano_carreira_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    /** @return HasMany<ServidorUnitHistory, $this> */
    public function unitHistory(): HasMany
    {
        return $this->hasMany(ServidorUnitHistory::class, 'servidor_id');
    }

    /** @return HasMany<PendenciaHierarquia, $this> */
    public function pendenciasHierarquia(): HasMany
    {
        return $this->hasMany(PendenciaHierarquia::class, 'servidor_id');
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
        return $this->hasMany(Avaliacao::class, 'servidor_id', 'user_id');
    }

    /** @return HasMany<DiarioBordo, $this> */
    public function incidentes(): HasMany
    {
        return $this->hasMany(DiarioBordo::class, 'servidor_id', 'user_id');
    }

    /**
     * Retorna se o servidor está apto para avaliação no ciclo atual.
     */
    public function isAptoParaAvaliacao(): bool
    {
        return in_array($this->situacao_funcional, ['ativo', 'em_exercicio'], true);
    }
}
