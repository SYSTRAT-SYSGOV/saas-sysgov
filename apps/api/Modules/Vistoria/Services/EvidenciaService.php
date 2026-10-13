<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\Pergunta;

final class EvidenciaService
{
    public function __construct(
        private AuditLogger $audit,
    ) {}

    /**
     * Processa a foto de uma pergunta tipo `foto` do checklist no momento da
     * sincronização: preserva o arquivo original sem marca d'água no storage e grava
     * uma segunda versão com marca d'água (data/hora do servidor + coordenadas)
     * aplicada no momento do processamento, nunca no dispositivo. Idempotente por
     * `execucao_id` + `pergunta_id` — reenvio da mesma execução reprocessa a mesma
     * evidência em vez de duplicar.
     *
     * @throws \DomainException quando o payload informado não é uma imagem válida
     */
    public function registrarFotoChecklist(
        ExecucaoVistoria $execucao,
        Pergunta $pergunta,
        string $imagemBase64,
        ?float $latitude,
        ?float $longitude,
        ?string $capturadoEmDispositivo,
    ): Evidencia {
        $bytes = (string) base64_decode(preg_replace('#^data:image/\w+;base64,#', '', $imagemBase64) ?? '', true);

        if ($bytes === '' || @getimagesizefromstring($bytes) === false) {
            throw new \DomainException('A foto enviada não é uma imagem válida.');
        }

        $processado = $this->aplicarMarcaDagua($bytes, $latitude, $longitude);

        $pasta = "vistoria/evidencias/{$execucao->tenant_id}/{$execucao->id}";
        $caminhoOriginal = "{$pasta}/{$pergunta->id}-original.jpg";
        $caminhoProcessado = "{$pasta}/{$pergunta->id}-processado.jpg";

        $evidencia = DB::transaction(function () use ($execucao, $pergunta, $bytes, $processado, $caminhoOriginal, $caminhoProcessado, $latitude, $longitude, $capturadoEmDispositivo): Evidencia {
            Storage::disk('public')->put($caminhoOriginal, $bytes);
            Storage::disk('public')->put($caminhoProcessado, $processado);

            return Evidencia::updateOrCreate(
                ['execucao_id' => $execucao->id, 'pergunta_id' => $pergunta->id],
                [
                    'tipo' => Evidencia::TIPO_FOTO,
                    'caminho_original' => $caminhoOriginal,
                    'caminho_processado' => $caminhoProcessado,
                    'mime_type' => 'image/jpeg',
                    'tamanho_bytes' => strlen($bytes),
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'capturado_em_dispositivo' => $capturadoEmDispositivo,
                ],
            );
        });

        $this->audit->record('vistoria', 'evidencia.foto_registrada', "Evidencia #{$evidencia->id} (Execução #{$execucao->id})", null, $evidencia->toArray());

        return $evidencia;
    }

    /**
     * Anexa um documento complementar (nota fiscal/licença/laudo) apresentado pelo
     * fiscalizado durante a vistoria. Diferente da foto do checklist, é sempre uma
     * ação online (upload direto via multipart) — não entra na fila offline da
     * seção 4, mesmo padrão adotado para a emissão de documentos na seção 6.
     *
     * @throws \DomainException quando a categoria informada é inválida
     */
    public function anexarDocumentoComplementar(
        ExecucaoVistoria $execucao,
        UploadedFile $arquivo,
        string $categoria,
        ?string $descricao,
    ): Evidencia {
        if (! in_array($categoria, Evidencia::CATEGORIAS_VALIDAS, true)) {
            throw new \DomainException("Categoria de documento complementar inválida: {$categoria}.");
        }

        $caminho = $arquivo->store("vistoria/evidencias/{$execucao->tenant_id}/{$execucao->id}", 'public');

        $evidencia = DB::transaction(fn (): Evidencia => Evidencia::create([
            'execucao_id' => $execucao->id,
            'tipo' => Evidencia::TIPO_DOCUMENTO_COMPLEMENTAR,
            'categoria' => $categoria,
            'descricao' => $descricao,
            'caminho_original' => $caminho,
            'mime_type' => $arquivo->getMimeType(),
            'tamanho_bytes' => $arquivo->getSize(),
        ]));

        $this->audit->record('vistoria', 'evidencia.documento_complementar_anexado', "Evidencia #{$evidencia->id} (Execução #{$execucao->id})", null, $evidencia->toArray());

        return $evidencia;
    }

    /**
     * Aplica marca d'água (data/hora do servidor + coordenadas) sobre a imagem,
     * devolvendo os bytes já renderizados — a imagem original (`$bytes`) nunca é
     * alterada, só o retorno desta função é persistido como versão processada.
     */
    private function aplicarMarcaDagua(string $bytes, ?float $latitude, ?float $longitude): string
    {
        $imagem = @imagecreatefromstring($bytes);
        if ($imagem === false) {
            throw new \DomainException('Não foi possível processar a foto enviada.');
        }

        $linhas = [now()->format('d/m/Y H:i:s') . ' (horário do servidor)'];
        if ($latitude !== null && $longitude !== null) {
            $linhas[] = sprintf('Lat %.6f, Long %.6f', $latitude, $longitude);
        }

        $largura = imagesx($imagem);
        $altura = imagesy($imagem);
        $alturaFaixa = 18 * count($linhas) + 12;

        imagealphablending($imagem, true);
        $faixa = imagecolorallocatealpha($imagem, 0, 0, 0, 55);
        imagefilledrectangle($imagem, 0, $altura - $alturaFaixa, $largura, $altura, $faixa);

        $branco = imagecolorallocate($imagem, 255, 255, 255);
        foreach ($linhas as $indice => $linha) {
            imagestring($imagem, 4, 8, $altura - $alturaFaixa + 6 + ($indice * 18), $linha, $branco);
        }

        ob_start();
        imagejpeg($imagem, null, 90);
        $processado = (string) ob_get_clean();
        imagedestroy($imagem);

        return $processado;
    }
}
