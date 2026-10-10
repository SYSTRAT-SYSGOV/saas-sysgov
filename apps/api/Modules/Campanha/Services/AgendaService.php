<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Models\Evento;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Models\Reuniao;
use Modules\Campanha\Models\Visita;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;

/** Eventos, reuniões e visitas da campanha de trabalho (D6), a agenda unificada e a visita que vira demanda. */
final class AgendaService
{
    use RegistraMutacao;

    /** @var array<string, class-string<Evento|Reuniao|Visita>> */
    public const TIPOS = ['evento' => Evento::class, 'reuniao' => Reuniao::class, 'visita' => Visita::class];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly CampanhaContext $campanha,
        private readonly MunicipioService $municipios,
        private readonly DemandaService $demandas,
    ) {}

    /**
     * @template T of Evento|Reuniao|Visita
     *
     * @param class-string<T> $classe
     * @param T|null $registro
     * @param array<string, mixed> $dados
     * @return T
     */
    public function salvar(string $classe, ?Model $registro, array $dados): Model
    {
        if (isset($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if (!empty($dados['responsavel_id'])) {
            $this->demandas->conferirResponsavel((int) $dados['responsavel_id']);
        }
        $recurso = (string) array_search($classe, self::TIPOS, true);

        return DB::transaction(function () use ($classe, $registro, $dados, $recurso): Model {
            $antes = $registro?->toArray();
            $registro ??= new $classe();
            $registro->fill($dados)->save();
            $this->auditar($recurso, $antes === null ? 'criado' : 'atualizado', (int) $registro->getKey(), $antes, $registro->toArray());

            return $registro;
        });
    }

    public function excluir(Model $registro): void
    {
        $recurso = (string) array_search($registro::class, self::TIPOS, true);
        DB::transaction(function () use ($registro, $recurso): void {
            $antes = $registro->toArray();
            $registro->delete();
            $this->auditar($recurso, 'excluido', (int) $registro->getKey(), $antes, null);
        });
    }

    /** O encaminhamento da visita vira uma demanda pendente no município, com a liderança como solicitante. */
    public function demandaDaVisita(Visita $visita, ?User $autor): Demanda
    {
        if ($visita->demanda_id !== null) {
            throw new DomainException('Esta visita já virou demanda.');
        }
        $texto = trim((string) $visita->encaminhamento);
        if ($texto === '') {
            throw new DomainException('A visita não tem encaminhamento para transformar em demanda.');
        }

        return DB::transaction(function () use ($visita, $texto, $autor): Demanda {
            $demanda = $this->demandas->salvar(null, [
                'codigo_ibge' => $visita->codigo_ibge, 'solicitante' => $visita->lideranca, 'categoria' => 'outra',
                'prioridade' => 'media', 'status' => 'pendente', 'descricao' => $texto,
            ], $autor);
            $visita->forceFill(['demanda_id' => $demanda->id])->save();
            $this->auditar('visita', 'virou_demanda', $visita->id, null, ['demanda_id' => $demanda->id]);

            return $demanda;
        });
    }

    /**
     * Agenda unificada (eventos, reuniões e visitas) em ordem de data.
     *
     * @param array<string, mixed> $filtros de, ate, codigo_ibge, tipo
     * @return Collection<int, array<string, mixed>>
     */
    public function agenda(array $filtros): Collection
    {
        $nomes = RefMunicipio::query()->where('uf', $this->campanha->get()->uf)->pluck('nome', 'codigo_ibge');
        $itens = collect();
        foreach (self::TIPOS as $tipo => $classe) {
            if (!empty($filtros['tipo']) && $filtros['tipo'] !== $tipo) {
                continue;
            }
            $campoData = $tipo === 'visita' ? 'data' : 'inicio';
            $q = $classe::query();
            if (!empty($filtros['codigo_ibge'])) {
                $q->where('codigo_ibge', (int) $filtros['codigo_ibge']);
            }
            if (!empty($filtros['de'])) {
                $q->where($campoData, '>=', Carbon::parse((string) $filtros['de'])->startOfDay());
            }
            if (!empty($filtros['ate'])) {
                $q->where($campoData, '<=', Carbon::parse((string) $filtros['ate'])->endOfDay());
            }
            foreach ($q->get() as $r) {
                /** @var Evento|Reuniao|Visita $r */
                $itens->push([
                    'tipo' => $tipo,
                    'id' => $r->id,
                    'titulo' => match (true) { $r instanceof Evento => $r->nome, $r instanceof Reuniao => $r->titulo, default => $r->lideranca },
                    'inicio' => ($r instanceof Visita ? $r->data->copy()->startOfDay() : $r->inicio)->toIso8601String(),
                    'dia_inteiro' => $r instanceof Visita,
                    'codigo_ibge' => $r->codigo_ibge,
                    'municipio' => $nomes[$r->codigo_ibge] ?? (string) $r->codigo_ibge,
                    'alerta' => $r instanceof Reuniao && $r->pendencia_vencida,
                    'registro' => $r->toArray(),
                ]);
            }
        }

        return $itens->sortBy('inicio')->values();
    }

    /**
     * Próximos compromissos (a partir de agora) para o painel.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function proximos(int $limite = 8): Collection
    {
        return $this->agenda(['de' => today()->toDateString()])
            ->filter(fn (array $i): bool => $i['dia_inteiro'] || Carbon::parse($i['inicio'])->gte(now()))
            ->take($limite)->map(fn (array $i): array => array_diff_key($i, ['registro' => true]))->values();
    }
}
