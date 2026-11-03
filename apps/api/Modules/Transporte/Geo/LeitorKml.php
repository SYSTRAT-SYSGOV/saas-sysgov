<?php

declare(strict_types=1);

namespace Modules\Transporte\Geo;

use DOMDocument;
use DOMNode;
use DOMXPath;
use DomainException;
use ZipArchive;

/**
 * Lê as linhas de um KML ou KMZ. Aceita `LineString` (também dentro de `MultiGeometry`) e `gx:Track`; pontos e polígonos são
 * contados e ignorados. O XML é lido sem rede e sem entidades: `DOCTYPE` é recusado.
 */
final class LeitorKml
{
    public const MAX_BYTES = 5 * 1024 * 1024;
    public const MAX_BYTES_DESCOMPACTADO = 20 * 1024 * 1024;
    public const MAX_PONTOS = 300000;
    public const MAX_LINHAS = 100;

    /**
     * @return array{linhas: list<array{nome: string, pontos: list<array{0: float, 1: float}>}>, ignorados: array{pontos: int, poligonos: int, pares_invalidos: int, linhas_curtas: int}}
     */
    public function ler(string $caminho): array
    {
        $tamanho = @filesize($caminho);
        if ($tamanho === false || $tamanho === 0) {
            throw new DomainException('O arquivo está vazio.');
        }
        if ($tamanho > self::MAX_BYTES) {
            throw new DomainException('O arquivo passa de 5 MB.');
        }

        return $this->interpretar($this->xml($caminho));
    }

    private function xml(string $caminho): string
    {
        $abertura = (string) @file_get_contents($caminho, false, null, 0, 4);
        if (!str_starts_with($abertura, 'PK')) {
            return (string) file_get_contents($caminho);
        }

        $zip = new ZipArchive();
        if ($zip->open($caminho, ZipArchive::RDONLY) !== true) {
            throw new DomainException('O arquivo KMZ não pôde ser aberto.');
        }
        try {
            $escolhido = null;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if ($stat === false) {
                    continue;
                }
                $nome = strtolower($stat['name']);
                // Só arquivos da raiz: o KMZ do Google Earth guarda o desenho em doc.kml.
                if (!str_contains($nome, '/') && str_ends_with($nome, '.kml') && ($escolhido === null || $nome === 'doc.kml')) {
                    $escolhido = $stat;
                }
            }
            if ($escolhido === null) {
                throw new DomainException('O KMZ não tem nenhum arquivo .kml.');
            }
            if ($escolhido['size'] > self::MAX_BYTES_DESCOMPACTADO) {
                throw new DomainException('O KML dentro do KMZ passa de 20 MB.');
            }
            $conteudo = $zip->getFromIndex((int) $escolhido['index'], self::MAX_BYTES_DESCOMPACTADO + 1);
        } finally {
            $zip->close();
        }
        if ($conteudo === false || strlen($conteudo) > self::MAX_BYTES_DESCOMPACTADO) {
            throw new DomainException('O KML dentro do KMZ não pôde ser lido ou passa de 20 MB.');
        }

        return $conteudo;
    }

    /**
     * @return array{linhas: list<array{nome: string, pontos: list<array{0: float, 1: float}>}>, ignorados: array{pontos: int, poligonos: int, pares_invalidos: int, linhas_curtas: int}}
     */
    private function interpretar(string $xml): array
    {
        if (preg_match('/<!DOCTYPE/i', $xml) === 1) {
            throw new DomainException('O arquivo declara um DOCTYPE, que não é aceito por segurança.');
        }
        $anterior = libxml_use_internal_errors(true);
        try {
            $doc = new DOMDocument();
            if (!$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) {
                throw new DomainException('O arquivo não é um XML válido. Exporte de novo como KML ou KMZ.');
            }
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($anterior);
        }
        $raiz = $doc->documentElement;
        if ($raiz === null || strtolower($raiz->localName) !== 'kml') {
            throw new DomainException('O arquivo não é um KML (falta o elemento <kml>).');
        }

        $xpath = new DOMXPath($doc);
        $ignorados = ['pontos' => 0, 'poligonos' => 0, 'pares_invalidos' => 0, 'linhas_curtas' => 0];
        $linhas = [];
        $total = 0;
        $contagem = $xpath->query("//*[local-name()='Placemark']");
        foreach ($contagem === false ? [] : $contagem as $placemark) {
            $nome = $this->nome($xpath, $placemark);
            $ignorados['pontos'] += (int) $xpath->evaluate("count(.//*[local-name()='Point'])", $placemark);
            $ignorados['poligonos'] += (int) $xpath->evaluate("count(.//*[local-name()='Polygon'])", $placemark);

            $brutas = [];
            foreach ($this->consulta($xpath, ".//*[local-name()='LineString']/*[local-name()='coordinates']", $placemark) as $no) {
                $brutas[] = $this->lerCoordenadas($no->textContent, $ignorados);
            }
            foreach ($this->consulta($xpath, ".//*[local-name()='Track']", $placemark) as $trilha) {
                $brutas[] = $this->lerTrilha($xpath, $trilha, $ignorados);
            }
            $partes = count($brutas);
            foreach ($brutas as $i => $pontos) {
                $pontos = $this->semRepetidos($pontos);
                if (count($pontos) < 2) {
                    $ignorados['linhas_curtas']++;

                    continue;
                }
                $total += count($pontos);
                if ($total > self::MAX_PONTOS) {
                    throw new DomainException('O arquivo tem mais de ' . number_format(self::MAX_PONTOS, 0, ',', '.') . ' pontos de traçado.');
                }
                if (count($linhas) >= self::MAX_LINHAS) {
                    throw new DomainException('O arquivo tem mais de ' . self::MAX_LINHAS . ' linhas. Separe-o por rota.');
                }
                $linhas[] = ['nome' => $partes > 1 ? "{$nome} (parte " . ($i + 1) . ')' : $nome, 'pontos' => $pontos];
            }
        }
        if ($linhas === []) {
            throw new DomainException('O arquivo não tem nenhuma linha de traçado com ao menos dois pontos válidos.');
        }

        return ['linhas' => $linhas, 'ignorados' => $ignorados];
    }

    /** @return list<DOMNode> */
    private function consulta(DOMXPath $xpath, string $expressao, DOMNode $contexto): array
    {
        $r = $xpath->query($expressao, $contexto);

        return $r === false ? [] : iterator_to_array($r, false);
    }

    private function nome(DOMXPath $xpath, DOMNode $placemark): string
    {
        $achado = $this->consulta($xpath, "*[local-name()='name']", $placemark)[0] ?? null;
        $nome = $achado !== null ? trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $achado->textContent)) : '';

        return $nome === '' ? 'Sem nome' : mb_substr($nome, 0, 120);
    }

    /**
     * Formato do KML: `longitude,latitude[,altitude]` separados por espaço ou quebra de linha.
     *
     * @param array<string, int> $ignorados
     * @return list<array{0: float, 1: float}>
     */
    private function lerCoordenadas(string $texto, array &$ignorados): array
    {
        $pontos = [];
        foreach (preg_split('/\s+/', trim($texto), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $par) {
            $p = explode(',', $par);
            $this->acrescentar($pontos, $p[1] ?? null, $p[0], $ignorados);
        }

        return $pontos;
    }

    /**
     * `gx:Track`: cada `gx:coord` é `longitude latitude [altitude]`.
     *
     * @param array<string, int> $ignorados
     * @return list<array{0: float, 1: float}>
     */
    private function lerTrilha(DOMXPath $xpath, DOMNode $trilha, array &$ignorados): array
    {
        $pontos = [];
        foreach ($this->consulta($xpath, "*[local-name()='coord']", $trilha) as $coord) {
            $p = preg_split('/\s+/', trim($coord->textContent), -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $this->acrescentar($pontos, $p[1] ?? null, $p[0] ?? null, $ignorados);
        }

        return $pontos;
    }

    /**
     * @param list<array{0: float, 1: float}> $pontos
     * @param array<string, int> $ignorados
     */
    private function acrescentar(array &$pontos, ?string $lat, ?string $lng, array &$ignorados): void
    {
        if ($lat === null || $lng === null || !is_numeric($lat) || !is_numeric($lng)) {
            $ignorados['pares_invalidos']++;

            return;
        }
        $la = (float) $lat;
        $lo = (float) $lng;
        if (!is_finite($la) || !is_finite($lo) || abs($la) > 90 || abs($lo) > 180 || ($la === 0.0 && $lo === 0.0)) {
            $ignorados['pares_invalidos']++;

            return;
        }
        $pontos[] = [$la, $lo];
    }

    /**
     * @param list<array{0: float, 1: float}> $pontos
     * @return list<array{0: float, 1: float}>
     */
    private function semRepetidos(array $pontos): array
    {
        $saida = [];
        foreach ($pontos as $p) {
            if ($saida === [] || $saida[count($saida) - 1] !== $p) {
                $saida[] = $p;
            }
        }

        return $saida;
    }
}
