<?php

declare(strict_types=1);

namespace Modules\Portfolio\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Support\EscolaContext;
use Modules\Portfolio\Models\Imagem;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\Concerns\RegistraMutacao;
use Modules\Portfolio\Support\Avaliacao;

/** PDF do portfólio do aluno (design D5): miniaturas JPEG ≤ 480 px e no máximo 60 imagens. */
final class RelatorioService
{
    use RegistraMutacao;

    public const LIMITE_IMAGENS = 60;

    public const MINIATURA_PX = 480;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly EscolaContext $escola,
    ) {}

    /**
     * Quantas imagens do trabalho entram e quantas são omitidas. Acima do limite total, até 2 por trabalho.
     *
     * @return array{0: int, 1: int}
     */
    public function cotaPorTrabalho(int $doTrabalho, int $totalDoRelatorio): array
    {
        $mostradas = $totalDoRelatorio > self::LIMITE_IMAGENS ? min(2, $doTrabalho) : $doTrabalho;

        return [$mostradas, $doTrabalho - $mostradas];
    }

    /**
     * @param Collection<int, Trabalho> $trabalhos
     * @param array<string, mixed> $desempenho
     * @return array<string, mixed>
     */
    public function dados(Aluno $aluno, Collection $trabalhos, array $desempenho, int $ano, ?int $trimestre, User $user): array
    {
        $totalImagens = $trabalhos->sum(fn (Trabalho $t): int => $t->imagens->count());
        $recente = $trabalhos->sortByDesc(fn (Trabalho $t): string => $t->data->toDateString() . sprintf('%010d', $t->id))->first();

        return [
            'escola' => $this->escola->hasEscola() ? $this->escola->get()->nome : '',
            'aluno' => $aluno->nome,
            // Turma do período (a do trabalho mais recente); a atual do aluno só quando não há trabalho.
            'turma' => $recente !== null ? $recente->turma?->nome : $aluno->turma?->nome,
            'periodo' => $trimestre !== null ? "{$trimestre}º trimestre de {$ano}" : "Ano letivo {$ano}",
            'desempenho' => $desempenho,
            'trabalhos' => $trabalhos->map(function (Trabalho $t) use ($totalImagens): array {
                [$mostradas, $omitidas] = $this->cotaPorTrabalho($t->imagens->count(), $totalImagens);

                return [
                    'titulo' => $t->titulo,
                    'materia' => $t->materia?->nome,
                    'data' => $t->data->format('d/m/Y'),
                    'avaliacao' => number_format(Avaliacao::numero($t->avaliacao_decimos), 1, ',', ''),
                    'descricao' => $t->descricao,
                    'observacoes' => $t->observacoes,
                    'imagens' => $t->imagens->take($mostradas)->map(fn (Imagem $i): ?string => $this->miniatura($i))->filter()->values()->all(),
                    'omitidas' => $omitidas,
                ];
            })->values()->all(),
            'gerado_em' => now()->format('d/m/Y H:i'),
            'gerado_por' => $user->name,
        ];
    }

    /** @param array<string, mixed> $dados */
    public function pdf(array $dados, Aluno $aluno): string
    {
        $this->auditar('relatorio', 'gerado', $aluno->id, null, ['periodo' => $dados['periodo']]);

        return Pdf::loadView('portfolio::relatorio', $dados)
            ->setOption('isFontSubsettingEnabled', true) // só os glifos usados: PDF de KB, não de MB
            ->setPaper('a4', 'portrait')
            ->output();
    }

    public function nomeArquivo(Aluno $aluno, int $ano, ?int $trimestre): string
    {
        return 'Portfolio_' . Str::slug($aluno->nome) . "_{$ano}" . ($trimestre !== null ? "_T{$trimestre}" : '') . '.pdf';
    }

    private function miniatura(Imagem $imagem): ?string
    {
        $disco = Storage::disk(TrabalhoService::DISCO);
        if (!$disco->exists($imagem->path)) {
            return null;
        }
        try {
            return 'data:image/jpeg;base64,' . base64_encode(ImagemService::emJpeg((string) $disco->get($imagem->path), self::MINIATURA_PX, 80));
        } catch (DomainException) {
            return null;
        }
    }
}
