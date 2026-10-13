<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\MunicipioCampanha;
use Modules\Campanha\Models\PrefeitoRelacao;
use Modules\Campanha\Models\Referencia\RefMandatario;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Models\Vereador;
use Modules\Campanha\Services\Concerns\RegistraMutacao;
use Modules\Campanha\Support\CampanhaContext;

/**
 * Municípios da UF da campanha (D5): a base pública (IBGE/TSE) junto com o que a campanha registrou.
 * Município sem linha na campanha = sem atuação, meta 0, sem coordenador.
 */
final class MunicipioService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly CampanhaContext $campanha,
    ) {}

    /**
     * Uma linha por município da UF, com os dados da campanha, o coordenador e o prefeito.
     *
     * @param array{situacao?: string|null, regiao?: string|null, coordenador_id?: int|null, busca?: string|null} $filtros
     * @return Collection<int, array<string, mixed>>
     */
    public function linhas(array $filtros = []): Collection
    {
        $campanha = $this->campanha->get();
        $dados = MunicipioCampanha::query()->get()->keyBy('codigo_ibge');
        $coordenadores = Coordenador::query()->pluck('nome', 'id');
        $relacoes = PrefeitoRelacao::query()->get()->keyBy('codigo_ibge');
        $executivo = $this->executivo($campanha->uf);
        $cabos = CaboEleitoral::query()->selectRaw('codigo_ibge, count(*) as total')->groupBy('codigo_ibge')->pluck('total', 'codigo_ibge');
        $vereadoresAliados = Vereador::query()->where('aliado', true)->selectRaw('codigo_ibge, count(*) as total')->groupBy('codigo_ibge')->pluck('total', 'codigo_ibge');
        $busca = isset($filtros['busca']) && $filtros['busca'] !== '' ? RefMunicipio::normalizar((string) $filtros['busca']) : null;

        /** @var Collection<int, array<string, mixed>> $linhas */
        $linhas = RefMunicipio::query()->where('uf', $campanha->uf)->orderBy('nome')->get()
            ->map(function (RefMunicipio $m) use ($dados, $coordenadores, $relacoes, $executivo, $cabos, $vereadoresAliados): array {
                $d = $dados->get($m->codigo_ibge);
                $relacao = $relacoes->get($m->codigo_ibge);
                $coordenadorId = $d?->getAttribute('coordenador_id');

                return [
                    'codigo_ibge' => $m->codigo_ibge,
                    'nome' => $m->nome,
                    'regiao_intermediaria' => $m->regiao_intermediaria,
                    'regiao_imediata' => $m->getAttribute('regiao_imediata'),
                    'populacao' => $m->populacao,
                    'eleitores' => $m->eleitores,
                    'situacao' => $d?->getAttribute('situacao') ?? 'sem_atuacao',
                    'meta_votos' => (int) ($d?->getAttribute('meta_votos') ?? 0),
                    'votos_anterior' => (int) ($d?->getAttribute('votos_anterior') ?? 0),
                    'coordenador' => $coordenadorId !== null ? ['id' => (int) $coordenadorId, 'nome' => $coordenadores->get($coordenadorId)] : null,
                    'prefeito' => [
                        ...($executivo[$m->codigo_ibge] ?? ['nome' => null, 'partido' => null, 'vice' => null]),
                        'relacao' => $relacao?->getAttribute('relacao') ?? 'sem_informacao',
                        'influencia' => $relacao?->getAttribute('influencia'),
                    ],
                    'cabos' => (int) ($cabos[$m->codigo_ibge] ?? 0),
                    'vereadores_aliados' => (int) ($vereadoresAliados[$m->codigo_ibge] ?? 0),
                    '_busca' => $m->nome_normalizado,
                ];
            })
            ->filter(fn (array $l): bool => (empty($filtros['situacao']) || $l['situacao'] === $filtros['situacao'])
                && (empty($filtros['regiao']) || $l['regiao_intermediaria'] === $filtros['regiao'])
                && (empty($filtros['coordenador_id']) || ($l['coordenador']['id'] ?? null) === (int) $filtros['coordenador_id'])
                && ($busca === null || str_contains((string) $l['_busca'], $busca)))
            ->map(function (array $l): array {
                unset($l['_busca']);

                return $l;
            })
            ->values();

        return $linhas;
    }

    /** @return array<string, mixed> */
    public function ficha(int $codigoIbge): array
    {
        $municipio = $this->municipioDaUf($codigoIbge);
        $linha = $this->linhas()->firstWhere('codigo_ibge', $codigoIbge);
        $d = MunicipioCampanha::query()->where('codigo_ibge', $codigoIbge)->first();
        $relacao = PrefeitoRelacao::query()->where('codigo_ibge', $codigoIbge)->first();

        return [
            ...$linha,
            'publico' => $municipio->makeHidden([])->toArray(),
            'potencial' => $d?->getAttribute('potencial'),
            'historico' => $d?->getAttribute('historico'),
            'observacoes' => $d?->getAttribute('observacoes'),
            'prefeito' => [...$linha['prefeito'], 'contato' => $relacao?->only(['id', 'telefone', 'whatsapp', 'email', 'observacoes'])],
            'vereadores' => Vereador::query()->where('codigo_ibge', $codigoIbge)->orderByDesc('aliado')->orderBy('nome')->get(),
            'vereadores_eleitos' => RefMandatario::query()->where('codigo_ibge', $codigoIbge)->where('cargo', 'vereador')->orderBy('nome_urna')->get(['id', 'nome', 'nome_urna', 'partido', 'numero', 'ano_eleicao']),
            'cabos_eleitorais' => CaboEleitoral::query()->where('codigo_ibge', $codigoIbge)->orderBy('nome')->get(['id', 'nome', 'bairro', 'votos_estimados', 'coordenador_id', 'whatsapp']),
        ];
    }

    /**
     * Grava os dados do município na campanha (cria a linha na primeira alteração).
     *
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function atualizar(int $codigoIbge, array $dados): array
    {
        $this->municipioDaUf($codigoIbge);
        if (array_key_exists('coordenador_id', $dados) && $dados['coordenador_id'] !== null
            && !Coordenador::query()->whereKey((int) $dados['coordenador_id'])->exists()) {
            throw new DomainException('Coordenador não encontrado nesta campanha.');
        }

        DB::transaction(function () use ($codigoIbge, $dados): void {
            $registro = MunicipioCampanha::query()->firstOrNew(['codigo_ibge' => $codigoIbge]);
            $antes = $registro->exists ? $registro->toArray() : null;
            $registro->fill($dados)->save();
            $this->auditar('municipio', 'atualizado', $registro->id, $antes, $registro->toArray(), ['codigo_ibge' => $codigoIbge]);
        });

        return $this->ficha($codigoIbge);
    }

    public function municipioDaUf(int $codigoIbge): RefMunicipio
    {
        $municipio = RefMunicipio::query()->find($codigoIbge);
        if ($municipio === null || $municipio->uf !== $this->campanha->get()->uf) {
            throw new DomainException('Município não pertence à UF da campanha.');
        }

        return $municipio;
    }

    /**
     * Prefeito e vice eleitos (base pública) por município da UF, da eleição mais recente importada.
     *
     * @return array<int, array{nome: string|null, partido: string|null, vice: string|null}>
     */
    public function executivo(string $uf): array
    {
        $ano = RefMandatario::query()->where('uf', $uf)->max('ano_eleicao');
        $porMunicipio = [];
        RefMandatario::query()->where('uf', $uf)->where('ano_eleicao', $ano)->whereIn('cargo', ['prefeito', 'vice_prefeito'])->get()
            ->each(function (RefMandatario $m) use (&$porMunicipio): void {
                $atual = $porMunicipio[$m->codigo_ibge] ?? ['nome' => null, 'partido' => null, 'vice' => null];
                if ($m->cargo === 'prefeito') {
                    $atual['nome'] = $m->nome_urna ?: $m->nome;
                    $atual['partido'] = $m->partido;
                } else {
                    $atual['vice'] = $m->nome_urna ?: $m->nome;
                }
                $porMunicipio[$m->codigo_ibge] = $atual;
            });

        return $porMunicipio;
    }

    /** @return list<string> */
    public static function situacoes(): array
    {
        return Campanha::SITUACOES;
    }
}
