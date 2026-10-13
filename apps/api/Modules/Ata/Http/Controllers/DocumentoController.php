<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Modules\Ata\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Ata\Models\Ata;
use Modules\Ata\Services\ArquivoAtaService;
use Modules\Ata\Services\AtaPdfService;
use Modules\Ata\Support\FormataAta;
use Modules\Ata\Services\AtaIaService;
use Symfony\Component\HttpFoundation\Response;

/** Preview do PDF (marca de rascunho, nada guardado), finalização com PDF oficial e download do PDF guardado. */
final class DocumentoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AtaPdfService $pdf,
        private readonly ArquivoAtaService $arquivos,
        private readonly AtaIaService $ia,
        private readonly AuditLogger $audit,
    ) {}

    public function preview(Ata $ata): Response
    {
        $this->authorize('view', $ata);
        if ($ata->pdf_path !== null) {
            return $this->pdfGuardado($ata, false);
        }

        return response($this->pdf->preview($ata), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="preview-ata.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function finalizar(Request $request, Ata $ata): Response
    {
        $this->authorize('finalize', $ata);

        return $this->executar(fn () => response()->json(FormataAta::detalhe($this->pdf->finalizar($ata, $request->user()), $this->ia->disponivel())));
    }

    public function pdf(Request $request, Ata $ata): Response
    {
        $this->authorize('view', $ata);
        abort_if($ata->pdf_path === null, 404, 'A ata ainda não foi finalizada.');

        return $this->pdfGuardado($ata, $request->boolean('baixar'));
    }

    private function pdfGuardado(Ata $ata, bool $baixar): Response
    {
        $this->audit->record('ata', 'ata.pdf_baixado', "ata:{$ata->id}", null, ['sigilosa' => $ata->sigilosa]);
        $nome = 'ata-' . str_replace('/', '-', $ata->numeroFormatado()) . '-' . Str::limit($ata->titulo, 60, '');

        return $this->arquivos->resposta((string) $ata->pdf_path, 'application/pdf', $nome, $baixar) ?? abort(404);
    }
}
