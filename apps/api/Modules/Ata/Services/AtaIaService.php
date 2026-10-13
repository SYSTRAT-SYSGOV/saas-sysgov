<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Modules\Ata\Exceptions\IaIndisponivelException;
use Modules\Ata\Models\Ata;
use Modules\Ata\Support\SanitizaHtml;

/**
 * Assistente IA da ata (D3): envia o áudio gravado da reunião ao Gemini e devolve o texto em HTML sanitizado.
 *
 * Exceção ao Outbox (ver design): a chamada é síncrona porque o usuário espera o texto na tela; fica isolada
 * aqui (nunca no controller) e não altera dados — o texto só entra na ata quando o usuário salva.
 * Os áudios não são guardados. A chave vem só do .env (config ata.ia.chave).
 */
final class AtaIaService
{
    public const MODOS = [
        1 => 'Transcrição fiel (literal)',
        2 => 'Texto formal (ata padrão)',
        3 => 'Resumo em tópicos',
        4 => 'Apenas decisões e tarefas',
        5 => 'Resumo executivo (curto)',
    ];

    private const FORMATO = 'IMPORTANTE: Retorne a resposta APENAS em HTML válido, usando só as tags %s. Não inclua <html>, <body> nem blocos ```html: apenas o conteúdo que será inserido direto no editor de texto.';

    private const BASE = 'https://generativelanguage.googleapis.com';

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function disponivel(): bool
    {
        return trim((string) config('ata.ia.chave')) !== '';
    }

    /** @param list<UploadedFile> $audios */
    public function gerar(Ata $ata, array $audios, int $modo): string
    {
        if (!$this->disponivel()) {
            throw new IaIndisponivelException('O Assistente IA não está configurado (GEMINI_API_KEY).');
        }
        if (!isset(self::MODOS[$modo])) {
            throw new DomainException('Modo do Assistente IA inválido.');
        }

        try {
            $partes = array_map(fn (UploadedFile $a): array => ['fileData' => $this->enviarAudio($a)], $audios);
            $partes[] = ['text' => $this->prompt($modo)];
            $resposta = Http::timeout((int) config('ata.ia.timeout', 180))
                ->withHeaders(['x-goog-api-key' => (string) config('ata.ia.chave')])
                ->post(self::BASE . '/v1beta/models/' . config('ata.ia.modelo') . ':generateContent', [
                    'contents' => [['parts' => $partes]],
                    'generationConfig' => ['temperature' => 0.2],
                ]);
        } catch (ConnectionException) {
            throw new DomainException('Não foi possível falar com o Assistente IA. Tente novamente.');
        }

        $texto = $resposta->successful() ? $resposta->json('candidates.0.content.parts.0.text') : null;
        if (!is_string($texto) || trim($texto) === '') {
            throw new DomainException('O Assistente IA não devolveu um texto válido (HTTP ' . $resposta->status() . ').');
        }
        $texto = (string) preg_replace(['/^\s*```html\s*/i', '/```\s*$/'], '', $texto);
        $html = SanitizaHtml::limpar($texto);
        $this->audit->record('ata', 'ata.ia_gerada', "ata:{$ata->id}", null, ['modo' => $modo, 'blocos_audio' => count($audios)]);

        return $html;
    }

    /** @return array{mimeType: string, fileUri: string} */
    private function enviarAudio(UploadedFile $audio): array
    {
        $mime = $audio->getMimeType() ?: 'audio/webm';
        $mime = str_starts_with($mime, 'video/') ? str_replace('video/', 'audio/', $mime) : $mime;
        $resposta = Http::timeout(120)
            ->withHeaders(['x-goog-api-key' => (string) config('ata.ia.chave'), 'X-Goog-Upload-Protocol' => 'multipart'])
            ->attach('metadata', (string) json_encode(['file' => ['mimeType' => $mime]]), null, ['Content-Type' => 'application/json; charset=UTF-8'])
            ->attach('file', (string) file_get_contents($audio->getRealPath()), 'audio.webm', ['Content-Type' => $mime])
            ->post(self::BASE . '/upload/v1beta/files');
        $uri = $resposta->successful() ? $resposta->json('file.uri') : null;
        if (!is_string($uri)) {
            throw new DomainException('Falha ao enviar o áudio ao Assistente IA (HTTP ' . $resposta->status() . ').');
        }

        return ['mimeType' => (string) ($resposta->json('file.mimeType') ?: $mime), 'fileUri' => $uri];
    }

    private function prompt(int $modo): string
    {
        return match ($modo) {
            1 => 'Você é um transcritor profissional. Transcreva o áudio (ou áudios) desta reunião da forma mais fiel possível ao que foi dito. Não resuma nem altere o sentido das falas. Formate a transcrição em parágrafos. ' . sprintf(self::FORMATO, '<p> e <strong>'),
            3 => 'Você é um secretário executivo profissional. Ouça o áudio (ou áudios) desta reunião, ignore conversas paralelas e crie um resumo estruturado em tópicos, destacando os pontos principais de cada assunto de forma clara e objetiva. ' . sprintf(self::FORMATO, '<ul>, <li>, <p> e <strong>'),
            4 => 'Você é um secretário executivo profissional. Ouça o áudio (ou áudios) desta reunião e extraia APENAS as decisões tomadas e as tarefas delegadas, com responsáveis e prazos quando houver. Ignore discussões gerais. ' . sprintf(self::FORMATO, '<ul>, <li> e <strong>'),
            5 => 'Você é um secretário executivo profissional. Ouça o áudio (ou áudios) desta reunião e crie um resumo executivo muito conciso, em um ou dois parágrafos curtos, para quem não participou entender o panorama geral. ' . sprintf(self::FORMATO, '<p> e <strong>'),
            default => 'Você é um secretário executivo profissional redigindo o corpo de uma ata oficial. Ouça o áudio (ou áudios) desta reunião. Ignore conversas paralelas, brincadeiras e interrupções. Resuma os tópicos discutidos, as decisões tomadas e eventuais pautas futuras ou tarefas delegadas, em texto corrido, com tom formal, profissional e claro. NÃO crie cabeçalho, título, data, local, assinaturas nem frases de encerramento: o sistema já adiciona isso. Forneça APENAS o relato do que foi discutido e decidido. ' . sprintf(self::FORMATO, '<p>, <ul>, <li> e <strong>'),
        };
    }
}
