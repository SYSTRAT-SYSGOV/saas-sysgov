<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/**
 * Leitor genérico de arquivos DBF do sistema legado Clipper (dBase III/IV),
 * compartilhado pelos comandos de migração do módulo Cemitérios.
 */
final class ClipperDbfReader
{
    /**
     * Lê todos os registros não excluídos de um DBF, com os nomes de campo corrigidos
     * (corta no primeiro byte nulo — o legado deixa lixo de memória do DOS depois do
     * terminador, o que corrompia a leitura antes desta correção).
     *
     * @return list<array<string, string>>
     */
    public static function lerRegistros(string $caminhoDbf): array
    {
        $registros = [];
        if (!file_exists($caminhoDbf)) {
            return $registros;
        }

        $f = fopen($caminhoDbf, 'rb');
        if (!$f) {
            return $registros;
        }

        $header = fread($f, 32);
        if (strlen($header) < 32) {
            fclose($f);
            return $registros;
        }
        $numRegistros = unpack('V', substr($header, 4, 4))[1];
        $headerLen = unpack('v', substr($header, 8, 2))[1];
        $recordLen = unpack('v', substr($header, 10, 2))[1];

        $campos = [];
        $offset = 1; // byte 0 do registro é o flag de exclusão
        while (true) {
            $fd = fread($f, 32);
            if (strlen($fd) < 32 || ord($fd[0]) === 0x0D) {
                break;
            }
            $bruto = substr($fd, 0, 11);
            $posNul = strpos($bruto, "\x00");
            $nomeCampo = $posNul !== false ? substr($bruto, 0, $posNul) : $bruto;
            $tamanho = ord($fd[16]);
            $campos[] = ['nome' => $nomeCampo, 'tipo' => $fd[11], 'tamanho' => $tamanho, 'offset' => $offset];
            $offset += $tamanho;
        }

        fseek($f, $headerLen);
        for ($i = 0; $i < $numRegistros; $i++) {
            $registro = fread($f, $recordLen);
            if ($registro === false || strlen($registro) < $recordLen) {
                break;
            }
            if ($registro[0] === '*') {
                continue; // registro excluído no legado
            }

            $valores = [];
            foreach ($campos as $campo) {
                $valores[$campo['nome']] = trim(substr($registro, $campo['offset'], $campo['tamanho']), " \0");
            }
            $registros[] = $valores;
        }

        fclose($f);
        return $registros;
    }

    /**
     * Lê um DBF Clipper de código→nome (FUNCIONA.DBF/PEDREIRO.DBF: campos CODIGO/NOME/RG).
     * Registros com NOME ilegível (bytes corrompidos no arquivo de origem) são descartados
     * em vez de propagar lixo binário para o cadastro migrado.
     *
     * @return array<int, string>
     */
    public static function lerCodigoNome(string $caminhoDbf): array
    {
        $mapa = [];
        foreach (self::lerRegistros($caminhoDbf) as $valores) {
            $codigo = (int) ($valores['CODIGO'] ?? 0);
            $nomeBruto = (string) ($valores['NOME'] ?? '');
            $nome = trim((string) (@iconv('CP850', 'UTF-8//TRANSLIT', $nomeBruto) ?: $nomeBruto));

            // Nomes válidos são só letras/espaços/pontuação básica; descarta bytes corrompidos
            // (ex.: PEDREIRO.DBF do Central, códigos com registro danificado no arquivo original).
            if ($codigo > 0 && preg_match('/^[\p{L}\s.\']{2,}$/u', $nome) === 1) {
                $mapa[$codigo] = $nome;
            }
        }

        return $mapa;
    }
}
