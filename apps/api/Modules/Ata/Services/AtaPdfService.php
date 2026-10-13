<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Modules\Ata\Enums\StatusAta;
use Modules\Ata\Exceptions\AtaBloqueadaException;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaParticipante;
use Modules\Ata\Support\SanitizaHtml;

/**
 * PDF da ata no servidor (D4): preview com a marca de rascunho (não guarda nada) e finalização, que gera o PDF
 * oficial, guarda arquivo + SHA-256 e torna a ata imutável. Timbrado da secretaria como fundo, QR Code e código
 * de validação no rodapé.
 */
final class AtaPdfService
{
    public function __construct(
        private readonly SecretariaAtaService $secretarias,
        private readonly ArquivoAtaService $arquivos,
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenant,
    ) {}

    public function preview(Ata $ata): string
    {
        return $this->renderizar($ata, true);
    }

    public function finalizar(Ata $ata, User $user): Ata
    {
        if ($ata->status !== StatusAta::Rascunho) {
            throw new AtaBloqueadaException($ata->status === StatusAta::Finalizada
                ? 'A ata já está finalizada.'
                : 'Salve o rascunho antes de finalizar: o texto precisa estar travado.');
        }
        $pendentes = $ata->participantes()->whereNull('assinado_em')->pluck('nome')->all();
        if ($pendentes !== []) {
            throw new DomainException('Faltam assinaturas: ' . implode(', ', $pendentes) . '.');
        }

        return DB::transaction(function () use ($ata, $user): Ata {
            $ata->forceFill(['status' => StatusAta::Finalizada, 'finalizada_por' => $user->id, 'finalizada_em' => now()]);
            $pdf = $this->renderizar($ata, false);
            $caminho = $this->arquivos->guardarConteudo($pdf, 'pdf', 'pdf');
            $ata->forceFill(['pdf_path' => $caminho, 'pdf_sha256' => hash('sha256', $pdf)])->save();
            $this->audit->record('ata', 'ata.finalizada', "ata:{$ata->id}", ['status' => StatusAta::Rascunho->value], [
                'status' => StatusAta::Finalizada->value, 'pdf_sha256' => $ata->pdf_sha256, 'codigo' => $ata->codigo_validacao,
            ]);

            return $ata;
        });
    }

    public function urlValidacao(Ata $ata): string
    {
        $slug = (string) $this->tenant->get()->getAttribute('slug');

        return config('ata.url_portal') . "/validar-ata/{$slug}/{$ata->codigo_validacao}";
    }

    private function renderizar(Ata $ata, bool $rascunho): string
    {
        $ata->loadMissing(['secretaria', 'tipo', 'participantes']);
        $config = $this->secretarias->config($ata->org_unit_id);
        $html = View::make('ata::pdf.ata', [
            'ata' => $ata,
            'numero' => $ata->numeroFormatado(),
            'orgao' => (string) $this->tenant->get()->getAttribute('name'),
            'secretaria' => (string) $ata->secretaria->name,
            'sigla' => $this->secretarias->sigla($ata->secretaria),
            'conteudo' => SanitizaHtml::limpar($ata->conteudo_html),
            'timbrado' => $config !== null ? $this->arquivos->dataUri($config->timbrado_path, (string) $config->timbrado_mime) : null,
            'participantes' => $ata->participantes->map(fn (AtaParticipante $p): array => [
                'nome' => $p->nome,
                'cargo' => $p->cargo,
                'assinatura' => $this->arquivos->dataUri($p->assinatura_path, 'image/png'),
            ])->all(),
            'rascunho' => $rascunho,
            'codigo' => $ata->codigo_validacao,
            'qr' => (new QRCode(new QROptions(['outputInterface' => QRGdImagePNG::class, 'outputBase64' => true, 'scale' => 4])))->render($this->urlValidacao($ata)),
            'url_validacao' => $this->urlValidacao($ata),
            'emitido_em' => now()->format('d/m/Y H:i'),
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4')
            ->setOption(['isFontSubsettingEnabled' => true, 'defaultFont' => 'DejaVu Serif', 'isRemoteEnabled' => false]);

        // "Página X de Y" pelo canvas: o CSS counter(pages) não funciona no dompdf.
        $dompdf = $pdf->getDomPDF();
        $dompdf->render();
        $canvas = $dompdf->getCanvas();
        $fonte = $dompdf->getFontMetrics()->getFont('DejaVu Sans');
        $canvas->page_text($canvas->get_width() - 110, $canvas->get_height() - 40, 'Página {PAGE_NUM} de {PAGE_COUNT}', $fonte, 7.5, [0.42, 0.45, 0.5]);

        return (string) $dompdf->output();
    }
}
