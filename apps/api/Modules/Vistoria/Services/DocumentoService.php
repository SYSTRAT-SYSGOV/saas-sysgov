<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Vistoria\Models\Assinatura;
use Modules\Vistoria\Models\Contador;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;

final class DocumentoService
{
    public function __construct(
        private AuditLogger $audit,
    ) {}

    /**
     * Emite um documento de fiscalização (auto de infração, notificação, termo de embargo
     * ou apreensão) a partir de uma execução de vistoria, com numeração sequencial atômica
     * por tipo/exercício (`DB::transaction()` + `lockForUpdate()` em `vistoria_contadores`)
     * e PDF gerado e armazenado ao final.
     *
     * Quando há prazo de regularização, agenda automaticamente a reinspeção (tarefa 6.4 —
     * o acompanhamento de reincidência e os jobs recorrentes são da seção 10).
     *
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando o tipo de documento é inválido
     */
    public function emitirDocumento(ExecucaoVistoria $execucao, string $tipo, array $dados): Documento
    {
        if (! in_array($tipo, Documento::TIPOS_VALIDOS, true)) {
            throw new \DomainException("Tipo de documento inválido: {$tipo}.");
        }

        $ordem = $execucao->ordemServico()->with('local.proprietario', 'fiscal')->firstOrFail();
        $local = $ordem->local;
        $proprietario = $local?->proprietario;
        $exercicio = (int) now()->year;
        $prazoDias = isset($dados['prazo_dias']) ? (int) $dados['prazo_dias'] : null;
        $prazoLimite = $prazoDias ? now()->addDays($prazoDias)->toDateString() : null;

        $documento = DB::transaction(function () use ($execucao, $tipo, $dados, $proprietario, $exercicio, $prazoDias, $prazoLimite, $ordem, $local): Documento {
            $contador = Contador::where('tipo_slug', $tipo)->where('exercicio', $exercicio)->lockForUpdate()->first();

            if (! $contador) {
                $contador = Contador::create(['tipo_slug' => $tipo, 'exercicio' => $exercicio, 'ultimo_numero' => 0]);
            }

            $contador->increment('ultimo_numero');
            $numeroSequencial = $contador->ultimo_numero;
            $numero = sprintf('%s/%d/%d', $tipo, $numeroSequencial, $exercicio);

            $documento = Documento::create([
                'execucao_id' => $execucao->id,
                'autuado_pessoa_id' => $proprietario?->id,
                'tipo' => $tipo,
                'numero' => $numero,
                'numero_sequencial' => $numeroSequencial,
                'exercicio' => $exercicio,
                'irregularidade' => $dados['irregularidade'] ?? null,
                'enquadramento_legal' => $dados['enquadramento_legal'] ?? null,
                'prazo_dias' => $prazoDias,
                'prazo_limite' => $prazoLimite,
                'dados_autuado' => $proprietario ? [
                    'nome' => $proprietario->nome,
                    'cpf' => $proprietario->cpf,
                    'nome_local' => $local->nome,
                    'endereco' => $local->endereco,
                ] : null,
            ]);

            if ($prazoLimite !== null) {
                OrdemServico::create([
                    'local_id' => $ordem->local_id,
                    'org_unit_id' => $ordem->org_unit_id,
                    'fiscal_id' => $ordem->fiscal_id,
                    'tipo_acao' => OrdemServico::TIPO_ACAO_REINSPECAO,
                    'criticidade' => $ordem->criticidade,
                    'data_prevista' => $prazoLimite,
                    'roteiro_deslocamento' => "Reinspeção de regularização — documento {$documento->numero}.",
                ]);
            }

            return $documento;
        });

        $documento->update(['caminho_pdf' => $this->gerarEArmazenarPdf($documento, $local, $proprietario?->nome, null)]);

        $this->audit->record('vistoria', 'documento.emitido', "Documento #{$documento->id} ({$documento->numero})", null, $documento->toArray());

        return $documento;
    }

    /**
     * Regera o PDF do documento embutindo a assinatura (ou recusa) mais recente —
     * chamado pelo `AssinaturaService` depois de registrar a coleta.
     */
    public function regenerarPdf(Documento $documento): void
    {
        $documento->loadMissing('execucao.ordemServico.local.proprietario');
        $local = $documento->execucao->ordemServico->local;
        $assinatura = $documento->assinaturas()->latest()->first();

        $documento->update([
            'caminho_pdf' => $this->gerarEArmazenarPdf($documento, $local, $local->proprietario?->nome, $assinatura),
        ]);
    }

    private function gerarEArmazenarPdf(Documento $documento, LocalFiscalizavel $local, ?string $nomeAutuado, ?Assinatura $assinatura): string
    {
        $html = $this->construirHtml($documento, $local, $nomeAutuado, $assinatura);
        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait')->output();

        $caminho = "vistoria/documentos/{$documento->tenant_id}/" . str_replace('/', '-', $documento->numero) . '.pdf';
        Storage::disk('public')->put($caminho, $pdf);

        return $caminho;
    }

    private function construirHtml(Documento $documento, LocalFiscalizavel $local, ?string $nomeAutuado, ?Assinatura $assinatura): string
    {
        $titulo = match ($documento->tipo) {
            Documento::TIPO_AUTO_INFRACAO => 'Auto de Infração',
            Documento::TIPO_NOTIFICACAO => 'Notificação',
            Documento::TIPO_TERMO_EMBARGO => 'Termo de Embargo',
            Documento::TIPO_TERMO_APREENSAO => 'Termo de Apreensão',
            default => 'Documento de Fiscalização',
        };

        $irregularidade = e($documento->irregularidade ?? '—');
        $enquadramento = e($documento->enquadramento_legal ?? '—');
        $prazo = $documento->prazo_limite?->format('d/m/Y') ?? '—';
        $autuado = e($nomeAutuado ?? 'Não identificado no Cadastro Único');
        $localNome = e($local->nome);
        $emissao = now()->format('d/m/Y H:i');
        $secaoAssinatura = $this->construirSecaoAssinatura($assinatura);

        return <<<HTML
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><style>
                body { font-family: sans-serif; font-size: 12px; }
                h1 { font-size: 16px; text-align: center; }
                .numero { text-align: center; font-weight: bold; margin-bottom: 20px; }
                .campo { margin-bottom: 10px; }
                .label { font-weight: bold; }
                .assinatura { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
                .assinatura img { max-width: 250px; max-height: 100px; }
            </style></head>
            <body>
                <h1>{$titulo}</h1>
                <p class="numero">Nº {$documento->numero}</p>
                <div class="campo"><span class="label">Local fiscalizado:</span> {$localNome}</div>
                <div class="campo"><span class="label">Autuado:</span> {$autuado}</div>
                <div class="campo"><span class="label">Irregularidade constatada:</span> {$irregularidade}</div>
                <div class="campo"><span class="label">Enquadramento legal:</span> {$enquadramento}</div>
                <div class="campo"><span class="label">Prazo para defesa/regularização:</span> {$prazo}</div>
                <div class="campo"><span class="label">Emitido em:</span> {$emissao}</div>
                {$secaoAssinatura}
            </body>
            </html>
            HTML;
    }

    private function construirSecaoAssinatura(?Assinatura $assinatura): string
    {
        if ($assinatura === null) {
            return '<div class="assinatura"><span class="label">Assinatura:</span> pendente.</div>';
        }

        $papel = match ($assinatura->papel) {
            Assinatura::PAPEL_AUTUADO => 'autuado',
            Assinatura::PAPEL_RESPONSAVEL => 'responsável pelo estabelecimento',
            Assinatura::PAPEL_TESTEMUNHA => 'testemunha',
            default => $assinatura->papel,
        };
        $dataHora = e($assinatura->assinado_em?->format('d/m/Y H:i') ?? '—');

        if ($assinatura->status === Assinatura::STATUS_RECUSADA) {
            $motivo = e($assinatura->motivo_recusa ?? '—');
            $testemunha = $assinatura->testemunha_pessoa_id !== null ? e($assinatura->testemunha->nome) : '—';

            return <<<HTML
                <div class="assinatura">
                    <span class="label">Assinatura recusada</span> pelo {$papel} em {$dataHora}.<br>
                    <span class="label">Motivo:</span> {$motivo}<br>
                    <span class="label">Testemunha:</span> {$testemunha}
                </div>
                HTML;
        }

        $imagemSrc = $this->imagemEmbutida($assinatura->imagem_path);
        $imagemHtml = $imagemSrc !== null ? "<br><img src=\"{$imagemSrc}\" alt=\"Assinatura\">" : '';

        return <<<HTML
            <div class="assinatura">
                <span class="label">Assinado</span> pelo {$papel} em {$dataHora}.{$imagemHtml}
            </div>
            HTML;
    }

    private function imagemEmbutida(?string $caminho): ?string
    {
        if ($caminho === null || ! Storage::disk('public')->exists($caminho)) {
            return null;
        }

        return 'data:image/png;base64,' . base64_encode((string) Storage::disk('public')->get($caminho));
    }
}
