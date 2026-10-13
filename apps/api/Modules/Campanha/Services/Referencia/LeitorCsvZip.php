<?php

declare(strict_types=1);

namespace Modules\Campanha\Services\Referencia;

use DomainException;
use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use ZipArchive;

/**
 * Baixa um ZIP de dados abertos (streaming para arquivo temporário) e lê um CSV de dentro dele linha a
 * linha — padrão do TSE: separador ';', aspas, Latin-1. Cada linha sai como array associativo pelo cabeçalho.
 */
final class LeitorCsvZip
{
    /** Baixa o arquivo; devolve o caminho local, ou null se a fonte respondeu 404. */
    public function baixar(string $url): ?string
    {
        $destino = storage_path('app/tmp');
        if (!is_dir($destino)) {
            mkdir($destino, 0775, true);
        }
        $arquivo = $destino . '/campanha-' . bin2hex(random_bytes(6)) . '.zip';
        // Em fluxo e gravado em blocos: com sink/retry o corpo inteiro (dezenas de MB) ficava na memória.
        for ($tentativa = 1; ; $tentativa++) {
            try {
                $resposta = Http::timeout(900)->withOptions(['stream' => true])->get($url);
                break;
            } catch (ConnectionException $e) {
                if ($tentativa >= 3) {
                    throw new DomainException("Falha de conexão ao baixar {$url}: {$e->getMessage()}");
                }
                sleep(2);
            }
        }
        if ($resposta->status() === 404) {
            return null;
        }
        if (!$resposta->successful()) {
            throw new DomainException("Falha ao baixar {$url} (HTTP {$resposta->status()}).");
        }
        $corpo = $resposta->toPsrResponse()->getBody();
        $saida = fopen($arquivo, 'wb');
        if ($saida === false) {
            throw new DomainException('Não foi possível gravar o arquivo temporário.');
        }
        while (!$corpo->eof()) {
            fwrite($saida, $corpo->read(1048576));
        }
        fclose($saida);

        return $arquivo;
    }

    /** @return Generator<int, array<string, string>> */
    public function linhas(string $zip, string $entrada): Generator
    {
        $arquivo = new ZipArchive();
        if ($arquivo->open($zip) !== true) {
            throw new DomainException('Arquivo ZIP inválido.');
        }
        try {
            $stream = $arquivo->getStream($entrada);
            if ($stream === false) {
                throw new DomainException("O arquivo {$entrada} não está no ZIP.");
            }
            $cabecalho = null;
            while (($campos = fgetcsv($stream, 0, ';', '"', '')) !== false) {
                $campos = array_map(fn ($v): string => mb_convert_encoding((string) $v, 'UTF-8', 'ISO-8859-1'), $campos);
                if ($cabecalho === null) {
                    $cabecalho = $campos;
                    continue;
                }
                if (count($campos) === count($cabecalho)) {
                    yield array_combine($cabecalho, $campos);
                }
            }
            fclose($stream);
        } finally {
            $arquivo->close();
        }
    }
}
