<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Categoria;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;

/**
 * Parâmetros do módulo e situações por papel (D2; spec: Parâmetros e situações por papel).
 *
 * Os padrões (situações de sistema, categorias e estados do PHP) são criados na primeira chamada do módulo pelo
 * tenant, de forma idempotente. As regras consultam o id da situação pelo papel, com cache por requisição.
 */
final class ParametrosService
{
    use RegistraMutacao;

    /** Tipos de parâmetro aceitos nas rotas: tipo => model. */
    public const TIPOS = [
        'categorias' => Categoria::class,
        'situacoes' => Situacao::class,
        'estados-conservacao' => EstadoConservacao::class,
    ];

    private const CATEGORIAS_PADRAO = ['Mobiliário', 'Equipamento de Informática', 'Veículos', 'Eletrodomésticos', 'Outros'];

    private const ESTADOS_PADRAO = ['Bom', 'Regular', 'Ruim', 'Sucata'];

    /** @var array<int, array<string, int>> tenant => papel => id */
    private array $idsPorPapel = [];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenant,
    ) {}

    /** Cria o que faltar dos padrões do tenant ativo (idempotente). */
    public function garantirPadroes(): void
    {
        $existentes = Situacao::query()->whereNotNull('papel')->pluck('papel')->map(fn (PapelSituacao $p): string => $p->value)->all();
        $faltam = array_filter(PapelSituacao::cases(), fn (PapelSituacao $p): bool => !in_array($p->value, $existentes, true));
        if ($faltam === [] && Categoria::query()->exists()) {
            return;
        }

        DB::transaction(function () use ($faltam): void {
            foreach ($faltam as $papel) {
                // Se a prefeitura já usa o nome padrão numa situação livre, ela vira a situação de sistema.
                $livre = Situacao::query()->whereNull('papel')->where('nome', $papel->nomePadrao())->first();
                if ($livre !== null) {
                    $livre->update(['papel' => $papel, 'ativo' => true]);
                } else {
                    Situacao::query()->create(['nome' => $papel->nomePadrao(), 'papel' => $papel, 'ativo' => true]);
                }
            }
            if (!Categoria::query()->exists()) {
                foreach (self::CATEGORIAS_PADRAO as $nome) {
                    Categoria::query()->create(['nome' => $nome]);
                }
            }
            if (!EstadoConservacao::query()->exists()) {
                foreach (self::ESTADOS_PADRAO as $nome) {
                    EstadoConservacao::query()->create(['nome' => $nome]);
                }
            }
        });
        unset($this->idsPorPapel[$this->tenant->id()]);
    }

    public function idDoPapel(PapelSituacao $papel): int
    {
        $tenantId = $this->tenant->id();
        if (!isset($this->idsPorPapel[$tenantId][$papel->value])) {
            $ids = Situacao::query()->whereNotNull('papel')->pluck('id', 'papel')->all();
            if (count($ids) < count(PapelSituacao::cases())) {
                $this->garantirPadroes();
                $ids = Situacao::query()->whereNotNull('papel')->pluck('id', 'papel')->all();
            }
            $this->idsPorPapel[$tenantId] = array_map('intval', $ids);
        }

        return $this->idsPorPapel[$tenantId][$papel->value];
    }

    public function papelDe(int $situacaoId): ?PapelSituacao
    {
        foreach (PapelSituacao::cases() as $papel) {
            if ($this->idDoPapel($papel) === $situacaoId) {
                return $papel;
            }
        }

        return null;
    }

    /** @return class-string<Model> */
    public function modelo(string $tipo): string
    {
        return self::TIPOS[$tipo] ?? throw new DomainException('Tipo de parâmetro desconhecido.');
    }

    /** @param array{nome: string, ativo?: bool} $dados */
    public function salvar(string $tipo, ?Model $item, array $dados): Model
    {
        $classe = $this->modelo($tipo);
        $nome = trim($dados['nome']);
        $repetido = $classe::query()->where('nome', $nome)->when($item !== null, fn ($q) => $q->whereKeyNot($item->getKey()))->exists();
        if ($repetido) {
            throw new DomainException("Já existe \"{$nome}\" nesta lista.");
        }
        $ativo = (bool) ($dados['ativo'] ?? true);
        if ($item instanceof Situacao && $item->deSistema() && !$ativo) {
            throw new DomainException('Situação de sistema não pode ser desativada.');
        }

        return DB::transaction(function () use ($classe, $item, $nome, $ativo, $tipo): Model {
            $antes = $item?->toArray();
            $item ??= new $classe();
            $item->fill(['nome' => $nome, 'ativo' => $ativo])->save();
            $this->auditar("parametro.{$tipo}", $antes === null ? 'criado' : 'atualizado', (int) $item->getKey(), $antes, $item->toArray());

            return $item;
        });
    }

    public function excluir(string $tipo, Model $item): void
    {
        if ($item instanceof Situacao && $item->deSistema()) {
            throw new DomainException('Situação de sistema não pode ser excluída. Ela pode ser renomeada.');
        }
        $coluna = match ($tipo) {
            'categorias' => 'categoria_id',
            'situacoes' => 'situacao_id',
            default => 'estado_conservacao_id',
        };
        if (Bem::query()->where($coluna, $item->getKey())->exists()) {
            throw new DomainException('Exclusão bloqueada: o item está em uso por um ou mais bens.');
        }

        DB::transaction(function () use ($tipo, $item): void {
            $antes = $item->toArray();
            $item->delete();
            $this->auditar("parametro.{$tipo}", 'excluido', (int) $item->getKey(), $antes, null);
        });
    }

    /** Troca a situação ou o estado A pelo B em todos os bens do tenant; devolve quantos mudaram. */
    public function substituirEmMassa(string $campo, int $atualId, int $novoId): int
    {
        $classe = $campo === 'situacao' ? Situacao::class : EstadoConservacao::class;
        $coluna = $campo === 'situacao' ? 'situacao_id' : 'estado_conservacao_id';
        $atual = $classe::query()->findOrFail($atualId);
        $novo = $classe::query()->findOrFail($novoId);
        if ($atualId === $novoId) {
            throw new DomainException('Escolha valores diferentes para substituir.');
        }
        if ($campo === 'situacao') {
            /** @var Situacao $novo */
            if ($novo->papel?->soPorFluxo() === true || $atual->papel?->soPorFluxo() === true) {
                throw new DomainException('As situações "em lote" e "em transferência" só mudam pelos fluxos de lote e de transferência.');
            }
        }

        return DB::transaction(function () use ($coluna, $atual, $novo, $campo): int {
            $total = Bem::query()->where($coluna, $atual->getKey())->update([$coluna => $novo->getKey()]);
            $this->audit->record('inservivel', 'parametro.substituicao_em_massa', "parametro.{$campo}:{$atual->getKey()}",
                ['valor' => $atual->getAttribute('nome')], ['valor' => $novo->getAttribute('nome'), 'bens_alterados' => $total]);

            return $total;
        });
    }
}
