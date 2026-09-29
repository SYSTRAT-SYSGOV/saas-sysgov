<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Models\OperadorLicenca;
use Modules\Cemiterios\Models\OperadorPenalidade;
use Modules\Cemiterios\Support\RegraNegocioException;

/**
 * Cadastro, credenciamento, sanções administrativas e disponibilidade de
 * coveiros e pedreiros (evolução do cadastro raso original — RF-cadastro-operadores).
 */
final readonly class OperadorCemiterioService
{
    private const DISCO = 's3';

    public function __construct(private AuditLogger $audit) {}

    /** @param array<string, mixed> $dados */
    public function cadastrar(array $dados): OperadorCemiterio
    {
        $alvaraNumero = $dados['alvara_numero'] ?? null;
        $alvaraValidade = $dados['alvara_validade'] ?? null;

        $operador = OperadorCemiterio::create($dados);

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.created',
            resource: "OperadorCemiterio:{$operador->id}",
            before: null,
            after: ['nome' => $operador->nome, 'tipo' => $operador->tipo]
        );

        if ($alvaraNumero && $alvaraValidade) {
            $this->credenciar($operador, ['numero' => $alvaraNumero, 'validade' => $alvaraValidade]);
        }

        return $operador->refresh();
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(OperadorCemiterio $operador, array $dados): OperadorCemiterio
    {
        $before = $operador->toArray();
        $operador->update($dados);

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.updated',
            resource: "OperadorCemiterio:{$operador->id}",
            before: $before,
            after: $operador->fresh()->toArray()
        );

        return $operador;
    }

    /**
     * Registra um novo credenciamento (alvará), com upload opcional do documento
     * (hash SHA-256 para verificação de integridade), e sincroniza os campos
     * "vigente" (`alvara_numero`/`alvara_validade`) do operador.
     *
     * @param array{numero: string, validade: string} $dados
     */
    public function credenciar(OperadorCemiterio $operador, array $dados, mixed $arquivo = null): OperadorLicenca
    {
        $path = null;
        $hash = null;

        if ($arquivo !== null) {
            $conteudo = file_get_contents($arquivo->getRealPath());
            $hash = hash('sha256', $conteudo);
            $path = "tenant/{$operador->tenant_id}/operadores/{$operador->id}/licencas/" . Str::uuid() . '.' . $arquivo->getClientOriginalExtension();
            Storage::disk(self::DISCO)->put($path, $conteudo);
        }

        $licenca = $operador->licencas()->create([
            'tenant_id' => $operador->tenant_id,
            'numero' => $dados['numero'],
            'validade' => $dados['validade'],
            'arquivo' => $path,
            'hash' => $hash,
        ]);

        $this->sincronizarCredencialVigente($operador);

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.credenciado',
            resource: "OperadorCemiterio:{$operador->id}",
            before: null,
            after: ['numero' => $licenca->numero, 'validade' => $licenca->validade->toDateString()]
        );

        return $licenca;
    }

    /**
     * Registra uma sanção administrativa e, para descredenciamento, atualiza a
     * situação do operador para "inativo".
     *
     * @param array{tipo: string, inicio: string, fim?: string|null, motivo: string} $dados
     */
    public function sancionar(OperadorCemiterio $operador, array $dados, mixed $arquivo = null): OperadorPenalidade
    {
        $path = null;
        if ($arquivo !== null) {
            $conteudo = file_get_contents($arquivo->getRealPath());
            $path = "tenant/{$operador->tenant_id}/operadores/{$operador->id}/penalidades/" . Str::uuid() . '.' . $arquivo->getClientOriginalExtension();
            Storage::disk(self::DISCO)->put($path, $conteudo);
        }

        $penalidade = $operador->penalidades()->create([
            'tenant_id' => $operador->tenant_id,
            'tipo' => $dados['tipo'],
            'inicio' => $dados['inicio'],
            'fim' => $dados['fim'] ?? null,
            'motivo' => $dados['motivo'],
            'arquivo' => $path,
        ]);

        if ($dados['tipo'] === 'descredenciamento') {
            $operador->update(['situacao' => 'inativo']);
        }

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.sancionado',
            resource: "OperadorCemiterio:{$operador->id}",
            before: null,
            after: ['tipo' => $penalidade->tipo, 'motivo' => $penalidade->motivo]
        );

        return $penalidade;
    }

    /** Credenciamento de maior validade ainda não vencida (ou, na ausência, o mais recente). */
    public function credenciamentoVigente(OperadorCemiterio $operador): ?OperadorLicenca
    {
        return $operador->licencas()
            ->orderByDesc('validade')
            ->first();
    }

    /** @return 'valido'|'a_vencer'|'vencido'|'sem_credenciamento'|'dispensado' */
    public function statusCredenciamento(OperadorCemiterio $operador, int $diasAlerta = 30): string
    {
        if ($operador->tipo !== 'pedreiro') {
            return 'dispensado';
        }

        $vigente = $this->credenciamentoVigente($operador);
        if (!$vigente) {
            return 'sem_credenciamento';
        }

        if ($vigente->validade->isPast()) {
            return 'vencido';
        }

        if ($vigente->validade->diffInDays(today(), absolute: true) <= $diasAlerta) {
            return 'a_vencer';
        }

        return 'valido';
    }

    /** @return 'valido'|'a_vencer'|'vencido'|'nao_informado' */
    public function statusSaudeOcupacional(OperadorCemiterio $operador, int $diasAlerta = 30): string
    {
        if (!$operador->aso_validade) {
            return 'nao_informado';
        }

        if ($operador->aso_validade->isPast()) {
            return 'vencido';
        }

        if ($operador->aso_validade->diffInDays(today(), absolute: true) <= $diasAlerta) {
            return 'a_vencer';
        }

        return 'valido';
    }

    /**
     * Impede a vinculação de um operador com sanção vigente a uma nova execução.
     * Suspensão pode ser liberada com override explícito e justificativa; o
     * descredenciamento nunca pode ser contornado.
     */
    public function validarDisponibilidade(OperadorCemiterio $operador, bool $overrideSuspensao = false, ?string $justificativaOverride = null): void
    {
        $descredenciado = $operador->penalidades()->where('tipo', 'descredenciamento')->exists();
        if ($descredenciado) {
            throw new RegraNegocioException(
                'operador.descredenciado',
                "{$operador->nome} está descredenciado e não pode ser vinculado a novas execuções."
            );
        }

        $suspensaoVigente = $operador->penalidades()
            ->where('tipo', 'suspensao')
            ->whereDate('inicio', '<=', today())
            ->where(fn ($q) => $q->whereNull('fim')->orWhereDate('fim', '>=', today()))
            ->latest('inicio')
            ->first();

        if (!$suspensaoVigente) {
            return;
        }

        if (!$overrideSuspensao) {
            throw new RegraNegocioException(
                'operador.suspenso',
                "{$operador->nome} está suspenso até " . ($suspensaoVigente->fim?->toDateString() ?? 'data indefinida') . '.',
                ['suspensao_id' => $suspensaoVigente->id, 'fim' => $suspensaoVigente->fim?->toDateString()]
            );
        }

        if (!$justificativaOverride) {
            throw new RegraNegocioException(
                'operador.override_sem_justificativa',
                'É obrigatório informar a justificativa para vincular um operador suspenso.'
            );
        }

        $this->audit->record(
            module: 'cemiterios',
            action: 'operador.suspensao.override',
            resource: "OperadorCemiterio:{$operador->id}",
            before: null,
            after: ['suspensao_id' => $suspensaoVigente->id, 'justificativa' => $justificativaOverride]
        );
    }

    private function sincronizarCredencialVigente(OperadorCemiterio $operador): void
    {
        $vigente = $this->credenciamentoVigente($operador);
        if (!$vigente) {
            return;
        }

        $operador->forceFill([
            'alvara_numero' => $vigente->numero,
            'alvara_validade' => $vigente->validade,
        ])->save();
    }
}
