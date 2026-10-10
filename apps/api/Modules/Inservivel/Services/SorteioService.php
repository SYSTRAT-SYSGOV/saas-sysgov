<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Sorteio;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Throwable;

/**
 * Sorteio equitativo e auditável (spec: Sorteio equitativo e auditável; D8, D15).
 *
 * Concorrem só as inscritas aptas: Habilitadas e sem documento obrigatório vencido (as demais ficam no retrato com
 * o motivo). Regras: uma única apta vence (`unica_inscrita`); senão, ficam as aptas com menos lotes ganhos e, se
 * for uma, ela vence (`menos_lotes`); havendo empate, `mt_srand(crc32(semente)); mt_rand(0, n-1)` sobre as
 * empatadas na ordem das inscrições (`sorteio_semente`). Tudo numa transação: se o PDF do relatório falhar, o
 * sorteio é desfeito.
 */
final class SorteioService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ValidadeDocumentoService $validade,
        private readonly TermoService $termos,
        private readonly ArquivoService $arquivos,
    ) {}

    /** Índice sorteado entre n empatadas — o cálculo que um auditor repete com a semente gravada. */
    public static function indiceSorteado(string $semente, int $n): int
    {
        mt_srand(crc32($semente));
        $indice = mt_rand(0, $n - 1);
        mt_srand();

        return $indice;
    }

    public function sortear(Lote $lote, User $responsavel): Sorteio
    {
        $caminho = null;
        try {
            return DB::transaction(function () use ($lote, $responsavel, &$caminho): Sorteio {
                $atual = Lote::query()->lockForUpdate()->findOrFail($lote->id);
                if ($atual->status !== StatusLote::Publicado || Sorteio::query()->where('lote_id', $atual->id)->exists()) {
                    throw new DomainException('O lote precisa estar Publicado e ainda não sorteado.');
                }
                $interesses = Interesse::query()->where('lote_id', $atual->id)->orderBy('id')->get();
                if ($interesses->isEmpty()) {
                    throw new DomainException('Nenhuma entidade se inscreveu neste lote.');
                }
                $hoje = now();
                $entidades = Entidade::query()->whereIn('id', $interesses->pluck('entidade_id'))->lockForUpdate()->get()->keyBy('id');
                $bloqueios = $this->validade->bloqueiosPorEntidade($entidades->keys()->map(fn ($id): int => (int) $id)->all(), $hoje);

                $participantes = [];
                $aptas = [];
                foreach ($interesses as $interesse) {
                    /** @var Entidade $e */
                    $e = $entidades[$interesse->entidade_id];
                    $motivo = match (true) {
                        $e->status !== StatusEntidade::Habilitada => 'nao_habilitada',
                        isset($bloqueios[$e->id]) => 'documento_vencido',
                        default => null,
                    };
                    $participantes[] = [
                        'entidade_id' => $e->id, 'razao_social' => $e->razao_social, 'cnpj' => $e->cnpj, 'lotes_ganhos' => $e->lotes_ganhos,
                        'apta' => $motivo === null, 'motivo_exclusao' => $motivo,
                        'documentos_vencidos' => array_column($bloqueios[$e->id] ?? [], 'nome'),
                    ];
                    if ($motivo === null) {
                        $aptas[] = $e;
                    }
                }
                if ($aptas === []) {
                    throw new DomainException('Nenhuma inscrita está apta: todas estão sem habilitação ou com documento obrigatório vencido.');
                }

                [$vencedora, $regra, $semente, $empatadas] = $this->escolher($aptas);
                $hash = hash('sha256', implode('|', [$atual->id, (string) $semente, implode(',', $empatadas), $vencedora->id]));
                $sorteio = Sorteio::query()->create([
                    'lote_id' => $atual->id, 'entidade_vencedora_id' => $vencedora->id, 'data_sorteio' => $hoje, 'regra' => $regra,
                    'semente' => $semente, 'participantes' => $participantes, 'empatadas' => $empatadas === [] ? null : $empatadas,
                    'hash' => $hash, 'realizado_por' => $responsavel->id,
                ]);
                $vencedora->increment('lotes_ganhos');
                $atual->update(['status' => StatusLote::Sorteado]);

                $pdf = $this->termos->relatorioSorteio($atual->refresh(), $sorteio->refresh());
                $caminho = $this->arquivos->guardarConteudo($pdf, "lotes/{$atual->id}", 'pdf');
                $atual->documentos()->create([
                    'nome' => 'Relatório oficial do sorteio', 'caminho' => $caminho, 'mime' => 'application/pdf',
                    'gerado_pelo_sistema' => true, 'criado_por' => $responsavel->id,
                ]);

                $this->auditar('lote', 'sorteado', $atual->id, null, [
                    'sorteio_id' => $sorteio->id, 'vencedora_id' => $vencedora->id, 'regra' => $regra, 'semente' => $semente, 'hash' => $hash,
                ]);
                $this->publicar('LoteSorteado', ['id' => $atual->id, 'numero' => $atual->numero, 'vencedora_id' => $vencedora->id]);

                return $sorteio;
            });
        } catch (Throwable $e) {
            $this->arquivos->apagar($caminho);

            throw $e;
        }
    }

    /**
     * @param list<Entidade> $aptas na ordem das inscrições
     * @return array{0: Entidade, 1: string, 2: string|null, 3: list<int>}
     */
    private function escolher(array $aptas): array
    {
        if (count($aptas) === 1) {
            return [$aptas[0], 'unica_inscrita', null, []];
        }
        $menor = min(array_map(fn (Entidade $e): int => $e->lotes_ganhos, $aptas));
        $empatadas = array_values(array_filter($aptas, fn (Entidade $e): bool => $e->lotes_ganhos === $menor));
        if (count($empatadas) === 1) {
            return [$empatadas[0], 'menos_lotes', null, []];
        }
        $semente = bin2hex(random_bytes(16));
        $indice = self::indiceSorteado($semente, count($empatadas));

        return [$empatadas[$indice], 'sorteio_semente', $semente, array_map(fn (Entidade $e): int => $e->id, $empatadas)];
    }
}
