<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use DomainException;
use Illuminate\Http\UploadedFile;
use SplFileObject;

/**
 * Leitura de CSV das importações (design D9): separador ";" ou "," detectado na 1ª linha,
 * BOM removido, cabeçalhos normalizados (MAIÚSCULAS, sem acentos e sem espaços) e limite de linhas.
 */
final class LeitorCsv
{
    public const MAX_LINHAS = 5000;

    /** @var list<string> */
    private array $cabecalhos = [];

    private string $separador = ';';

    public function __construct(private readonly SplFileObject $arquivo) {}

    public static function de(UploadedFile $arquivo): self
    {
        $leitor = new self(new SplFileObject($arquivo->getRealPath(), 'r'));
        $leitor->lerCabecalho();

        return $leitor;
    }

    public static function deTexto(string $conteudo): self
    {
        $temporario = new SplFileObject('php://temp', 'w+');
        $temporario->fwrite($conteudo);
        $temporario->rewind();
        $leitor = new self($temporario);
        $leitor->lerCabecalho();

        return $leitor;
    }

    /** @return list<string> */
    public function cabecalhos(): array
    {
        return $this->cabecalhos;
    }

    public function temColuna(string $coluna): bool
    {
        return in_array(self::normalizarCabecalho($coluna), $this->cabecalhos, true);
    }

    /**
     * Linhas de dados indexadas pelo cabeçalho normalizado, com o número da linha no arquivo (a 1ª é o cabeçalho).
     *
     * @return \Generator<int, array<string, string>>
     */
    public function linhas(): \Generator
    {
        $numero = 1;
        while (!$this->arquivo->eof()) {
            $bruta = $this->arquivo->fgetcsv($this->separador, '"', '\\');
            $numero++;
            if ($bruta === false || $bruta === [null] || $this->vazia($bruta)) {
                continue;
            }
            if ($numero - 1 > self::MAX_LINHAS) {
                throw new DomainException('O arquivo excede o limite de ' . self::MAX_LINHAS . ' linhas.');
            }

            $linha = [];
            foreach ($this->cabecalhos as $i => $cabecalho) {
                $linha[$cabecalho] = trim((string) ($bruta[$i] ?? ''));
            }
            // Coluna sem cabeçalho (lista simples de nomes) fica acessível pela posição 0.
            $linha['__0'] = trim((string) ($bruta[0] ?? ''));

            yield $numero => $linha;
        }
    }

    public static function normalizarCabecalho(string $cabecalho): string
    {
        $semBom = preg_replace('/^\xEF\xBB\xBF/', '', $cabecalho) ?? $cabecalho;

        return (string) preg_replace('/[^A-Z0-9_]/', '', strtoupper(\Illuminate\Support\Str::ascii($semBom)));
    }

    private function lerCabecalho(): void
    {
        $primeira = (string) $this->arquivo->fgets();
        $primeira = preg_replace('/^\xEF\xBB\xBF/', '', $primeira) ?? $primeira;
        $this->separador = substr_count($primeira, ';') >= substr_count($primeira, ',') ? ';' : ',';
        $colunas = str_getcsv(rtrim($primeira, "\r\n"), $this->separador, '"', '\\');
        $this->cabecalhos = (array_map(fn (?string $c): string => self::normalizarCabecalho((string) $c), $colunas));
    }

    /** @param array<int, string|null> $linha */
    private function vazia(array $linha): bool
    {
        foreach ($linha as $valor) {
            if (trim((string) $valor) !== '') {
                return false;
            }
        }

        return true;
    }
}
