<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo\Importacao;

/**
 * Coluna do arquivo do Educacenso (`posicao` conta a partir de 0, que é o tipo de registro). `travado` marca o campo sem
 * o qual não há como conciliar o aluno: não pode ser desativado nem ter o destino trocado.
 */
final readonly class CampoImportacao
{
    public const TIPOS = ['texto', 'numero', 'data', 'booleano', 'codigo'];

    /** @param array<int|string, string>|null $mapa valor do arquivo → rótulo (tipo `codigo`) */
    public function __construct(
        public string $chave,
        public string $registro,
        public int $posicao,
        public string $rotulo,
        public string $tipo,
        public string $destino,
        public bool $ativo = true,
        public bool $travado = false,
        public bool $sensivel = false,
        public bool $nativo = true,
        public ?array $mapa = null,
        public string $formato = 'd/m/Y',
        public string $valorVerdadeiro = '1',
    ) {}

    /** @return array{chave: string, registro: string, posicao: int, rotulo: string, tipo: string, destino: string, ativo: bool, travado: bool, sensivel: bool, nativo: bool, mapa: array<int|string, string>|null, formato: string, valor_verdadeiro: string} */
    public function paraArray(): array
    {
        return [
            'chave' => $this->chave, 'registro' => $this->registro, 'posicao' => $this->posicao, 'rotulo' => $this->rotulo,
            'tipo' => $this->tipo, 'destino' => $this->destino, 'ativo' => $this->ativo, 'travado' => $this->travado,
            'sensivel' => $this->sensivel, 'nativo' => $this->nativo, 'mapa' => $this->mapa, 'formato' => $this->formato,
            'valor_verdadeiro' => $this->valorVerdadeiro,
        ];
    }

    /** @param array<string, mixed> $mudancas posicao, rotulo, ativo, mapa, formato, valor_verdadeiro (e, no personalizado, o resto) */
    public function com(array $mudancas): self
    {
        return new self(
            chave: $this->chave,
            registro: (string) ($mudancas['registro'] ?? $this->registro),
            posicao: (int) ($mudancas['posicao'] ?? $this->posicao),
            rotulo: (string) ($mudancas['rotulo'] ?? $this->rotulo),
            tipo: (string) ($mudancas['tipo'] ?? $this->tipo),
            destino: (string) ($mudancas['destino'] ?? $this->destino),
            ativo: array_key_exists('ativo', $mudancas) ? (bool) $mudancas['ativo'] : $this->ativo,
            travado: $this->travado,
            sensivel: array_key_exists('sensivel', $mudancas) ? (bool) $mudancas['sensivel'] : $this->sensivel,
            nativo: $this->nativo,
            mapa: array_key_exists('mapa', $mudancas) ? self::mapa($mudancas['mapa']) : $this->mapa,
            formato: (string) ($mudancas['formato'] ?? $this->formato),
            valorVerdadeiro: (string) ($mudancas['valor_verdadeiro'] ?? $this->valorVerdadeiro),
        );
    }

    /** @return array<int|string, string>|null */
    private static function mapa(mixed $valor): ?array
    {
        if (!is_array($valor) || $valor === []) {
            return null;
        }
        $mapa = [];
        foreach ($valor as $codigo => $rotulo) {
            $mapa[(string) $codigo] = (string) $rotulo;
        }

        return $mapa;
    }
}
