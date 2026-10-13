<?php

declare(strict_types=1);

namespace App\Support\AtributosDinamicos;

use DateTimeImmutable;
use InvalidArgumentException;

final class ValidadorAtributo
{
    /**
     * Valida e normaliza o valor conforme o tipo de atributo.
     * Lança InvalidArgumentException se inválido.
     * Retorna o valor normalizado para serialização JSON.
     */
    public static function validar(TipoAtributo|string $tipo, mixed $valor): mixed
    {
        $tipoEnum = is_string($tipo) ? TipoAtributo::tryFrom($tipo) : $tipo;

        if ($tipoEnum === null) {
            throw new InvalidArgumentException("Tipo de atributo inválido: '{$tipo}'. Tipos válidos: " . implode(', ', TipoAtributo::values()));
        }

        return match ($tipoEnum) {
            TipoAtributo::NUMERICO => self::validarNumerico($valor),
            TipoAtributo::TEXTO => self::validarTexto($valor),
            TipoAtributo::LISTA => self::validarLista($valor),
            TipoAtributo::LISTA_MULTIPLA => self::validarListaMultipla($valor),
            TipoAtributo::DATA => self::validarData($valor),
            TipoAtributo::DECIMAL => self::validarDecimal($valor),
            TipoAtributo::TEXTO_LONGO => self::validarTextoLongo($valor),
        };
    }

    /**
     * Retorna se o valor é válido para o tipo de atributo.
     */
    public static function ehValido(TipoAtributo|string $tipo, mixed $valor): bool
    {
        try {
            self::validar($tipo, $valor);
            return true;
        } catch (InvalidArgumentException) {
            return false;
        }
    }

    private static function validarNumerico(mixed $valor): int
    {
        if (is_int($valor)) {
            return $valor;
        }

        if (is_string($valor) && preg_match('/^-?\d+$/', trim($valor)) === 1) {
            return (int) trim($valor);
        }

        throw new InvalidArgumentException("O valor do atributo numérico deve ser um número inteiro válido.");
    }

    private static function validarTexto(mixed $valor): string
    {
        if (!is_string($valor)) {
            throw new InvalidArgumentException("O valor do atributo texto deve ser uma string.");
        }

        $str = trim($valor);
        if (mb_strlen($str) > 255) {
            throw new InvalidArgumentException("O atributo texto excede o tamanho máximo de 255 caracteres.");
        }

        return $str;
    }

    private static function validarTextoLongo(mixed $valor): string
    {
        if (!is_string($valor)) {
            throw new InvalidArgumentException("O valor do atributo texto longo deve ser uma string.");
        }

        $str = trim($valor);
        if (mb_strlen($str) > 65535) {
            throw new InvalidArgumentException("O atributo texto longo excede o tamanho máximo de 65.535 caracteres.");
        }

        return $str;
    }

    private static function validarLista(mixed $valor): string
    {
        if (!is_string($valor) || trim($valor) === '') {
            throw new InvalidArgumentException("O atributo lista deve ser um valor textual escalar não vazio.");
        }

        return trim($valor);
    }

    /**
     * @return list<string>
     */
    private static function validarListaMultipla(mixed $valor): array
    {
        if (!is_array($valor) || empty($valor)) {
            throw new InvalidArgumentException("O atributo lista múltipla deve ser um conjunto não vazio de valores.");
        }

        $itens = [];
        foreach ($valor as $item) {
            if (!is_string($item) || trim($item) === '') {
                throw new InvalidArgumentException("Cada elemento da lista múltipla deve ser uma string não vazia.");
            }
            $limpo = trim($item);
            if (in_array($limpo, $itens, true)) {
                throw new InvalidArgumentException("O atributo lista múltipla não pode conter valores duplicados: '{$limpo}'.");
            }
            $itens[] = $limpo;
        }

        return $itens;
    }

    private static function validarData(mixed $valor): string
    {
        if (!is_string($valor) || preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($valor)) !== 1) {
            throw new InvalidArgumentException("O atributo data deve estar no formato ISO AAAA-MM-DD.");
        }

        $dataStr = trim($valor);
        $d = DateTimeImmutable::createFromFormat('Y-m-d', $dataStr);

        if ($d === false || $d->format('Y-m-d') !== $dataStr) {
            throw new InvalidArgumentException("Data inválida ou inexistente no calendário: '{$dataStr}'.");
        }

        return $dataStr;
    }

    private static function validarDecimal(mixed $valor): string
    {
        if (is_float($valor)) {
            throw new InvalidArgumentException("Valores decimais não devem ser fornecidos como float de ponto flutuante. Use string decimal (ex: '1520.75').");
        }

        $str = is_int($valor) ? (string) $valor : (is_string($valor) ? trim($valor) : null);

        if ($str === null || preg_match('/^-?\d+(\.\d{1,6})?$/', $str) !== 1) {
            throw new InvalidArgumentException("O atributo decimal deve ser uma string numérica válida com até 6 casas decimais (ex: '123.45').");
        }

        return $str;
    }
}
