<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Database\Eloquent\Model;
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
use Modules\Pessoas\Services\ResolucaoPessoaService;

/**
 * Coordenadores, cabos eleitorais, prefeitos e vereadores da campanha de trabalho (D8–D10) e a
 * configuração de cores e faixas (D11). Tudo com auditoria e evento de domínio.
 */
final class EquipeService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly CampanhaContext $campanha,
        private readonly MunicipioService $municipios,
        private readonly ResolucaoPessoaService $pessoas,
    ) {}

    /**
     * Grava (cria ou atualiza) um coordenador ou cabo eleitoral.
     *
     * @template T of Coordenador|CaboEleitoral
     *
     * @param class-string<T> $classe
     * @param T|null $registro
     * @param array<string, mixed> $dados
     * @return T
     */
    public function salvarPessoaDeEquipe(string $classe, ?Model $registro, array $dados): Model
    {
        $recurso = $classe === Coordenador::class ? 'coordenador' : 'cabo';
        if (isset($dados['codigo_ibge'])) {
            $this->municipios->municipioDaUf((int) $dados['codigo_ibge']);
        }
        if (!empty($dados['coordenador_id']) && !Coordenador::query()->whereKey((int) $dados['coordenador_id'])->exists()) {
            throw new DomainException('Coordenador não encontrado nesta campanha.');
        }
        $cpf = (string) ($dados['cpf'] ?? '');
        unset($dados['cpf']);

        return DB::transaction(function () use ($classe, $registro, $dados, $cpf, $recurso): Model {
            if ($cpf !== '') {
                $nome = (string) ($dados['nome'] ?? $registro?->getAttribute('nome') ?? '');
                $dados['pessoa_id'] = $this->pessoas->resolverPorCpf($cpf, ['nome' => $nome], 'campanha')->id;
            }
            $antes = $registro?->toArray();
            $registro ??= new $classe();
            $registro->fill($dados)->save();
            $this->auditar($recurso, $antes === null ? 'criado' : 'atualizado', (int) $registro->getKey(), $antes, $registro->toArray());

            return $registro;
        });
    }

    /** Coordenador com municípios ou cabos vinculados não sai: os vínculos são desfeitos antes. */
    public function excluirCoordenador(Coordenador $coordenador): void
    {
        $municipios = MunicipioCampanha::query()->where('coordenador_id', $coordenador->id)->pluck('codigo_ibge');
        if ($municipios->isNotEmpty()) {
            $nomes = RefMunicipio::query()->whereIn('codigo_ibge', $municipios)->orderBy('nome')->pluck('nome')->implode(', ');
            throw new DomainException("Este coordenador é responsável por: {$nomes}. Troque o coordenador desses municípios antes de excluir.");
        }
        $cabos = CaboEleitoral::query()->where('coordenador_id', $coordenador->id)->count();
        if ($cabos > 0) {
            throw new DomainException("Este coordenador tem {$cabos} cabo(s) eleitoral(is) vinculado(s). Troque o coordenador deles antes de excluir.");
        }
        $this->excluir($coordenador, 'coordenador');
    }

    public function excluir(Model $registro, string $recurso): void
    {
        DB::transaction(function () use ($registro, $recurso): void {
            $antes = $registro->toArray();
            $registro->delete();
            $this->auditar($recurso, 'excluido', (int) $registro->getKey(), $antes, null);
        });
    }

    /**
     * Relação da campanha com o prefeito do município (uma por município).
     *
     * @param array<string, mixed> $dados
     */
    public function salvarPrefeito(int $codigoIbge, array $dados): PrefeitoRelacao
    {
        $this->municipios->municipioDaUf($codigoIbge);

        return DB::transaction(function () use ($codigoIbge, $dados): PrefeitoRelacao {
            $registro = PrefeitoRelacao::query()->firstOrNew(['codigo_ibge' => $codigoIbge]);
            $antes = $registro->exists ? $registro->toArray() : null;
            $registro->fill($dados)->save();
            $this->auditar('prefeito', $antes === null ? 'criado' : 'atualizado', $registro->id, $antes, $registro->toArray(), ['codigo_ibge' => $codigoIbge]);

            return $registro;
        });
    }

    /**
     * Vereador: com `ref_mandatario_id`, nome/partido/número vêm do eleito (base pública) do mesmo município.
     *
     * @param array<string, mixed> $dados
     */
    public function salvarVereador(?Vereador $registro, array $dados): Vereador
    {
        $codigoIbge = (int) ($dados['codigo_ibge'] ?? $registro?->getAttribute('codigo_ibge'));
        $this->municipios->municipioDaUf($codigoIbge);
        if (!empty($dados['ref_mandatario_id'])) {
            $eleito = RefMandatario::query()->whereKey((int) $dados['ref_mandatario_id'])->where('cargo', 'vereador')->where('codigo_ibge', $codigoIbge)->first()
                ?? throw new DomainException('Vereador eleito não encontrado neste município.');
            $dados = [...$dados, 'nome' => $dados['nome'] ?? ($eleito->nome_urna ?: $eleito->nome), 'partido' => $dados['partido'] ?? $eleito->partido, 'numero' => $dados['numero'] ?? $eleito->numero];
        }
        if (($dados['nome'] ?? $registro?->getAttribute('nome')) === null) {
            throw new DomainException('Informe o nome do vereador ou escolha um eleito.');
        }

        return DB::transaction(function () use ($registro, $dados): Vereador {
            $antes = $registro?->toArray();
            $registro ??= new Vereador();
            $registro->fill($dados)->save();
            $this->auditar('vereador', $antes === null ? 'criado' : 'atualizado', $registro->id, $antes, $registro->toArray());

            return $registro;
        });
    }

    /**
     * Cores das situações e faixas de meta (até 9 limites crescentes + cor acima do último).
     *
     * @param array{cores_situacao?: array<string, string>, faixas_meta?: array{faixas: list<array{limite: int, cor: string}>, cor_acima: string}} $dados
     */
    public function configurar(array $dados): Campanha
    {
        $faixas = $dados['faixas_meta']['faixas'] ?? null;
        if ($faixas !== null) {
            $limites = array_map(fn (array $f): int => (int) $f['limite'], $faixas);
            for ($i = 1; $i < count($limites); $i++) {
                if ($limites[$i] <= $limites[$i - 1]) {
                    throw new DomainException('Os limites das faixas de meta devem ser crescentes.');
                }
            }
        }
        $campanha = $this->campanha->get();

        return DB::transaction(function () use ($campanha, $dados): Campanha {
            $antes = $campanha->only(['cores_situacao', 'faixas_meta']);
            $campanha->update([
                ...(isset($dados['cores_situacao']) ? ['cores_situacao' => [...$campanha->cores(), ...$dados['cores_situacao']]] : []),
                ...(isset($dados['faixas_meta']) ? ['faixas_meta' => $dados['faixas_meta']] : []),
            ]);
            $this->auditar('campanha', 'configurada', $campanha->id, $antes, $campanha->only(['cores_situacao', 'faixas_meta']));

            return $campanha;
        });
    }
}
