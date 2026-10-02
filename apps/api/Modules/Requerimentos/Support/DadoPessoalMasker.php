<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Support;

final class DadoPessoalMasker
{
    /**
     * Mascara dados pessoais em um texto.
     * CPF, RG, telefones e endereços são substituídos por versões ocultadas.
     */
    public function mascarar(?string $texto): ?string
    {
        if ($texto === null) {
            return null;
        }

        // CPF: 000.000.000-00 → ***.000.000-**
        $texto = preg_replace('/\d{3}\.\d{3}\.\d{3}-\d{2}/', '***.***.***-**', $texto);

        // CPF sem pontuação: 00000000000 → ***000000**
        $texto = preg_replace('/\b\d{11}\b/', '***********', $texto);

        // RG: XX.XXX.XXX-X → **.***.***-*
        $texto = preg_replace('/\d{1,2}\.\d{3}\.\d{3}-\w/', '**.***.***-*', $texto);

        // Telefone: (XX) XXXXX-XXXX → (**) *****-****
        $texto = preg_replace('/\(\d{2}\)\s?\d{4,5}-\d{4}/', '(**) *****-****', $texto);

        // Celular sem DDD: 9XXXX-XXXX → 9****-****
        $texto = preg_replace('/\b9\d{4}-\d{4}\b/', '9****-****', $texto);

        // CEP: 00000-000 → *****-***
        $texto = preg_replace('/\d{5}-\d{3}/', '*****-***', $texto);

        // E-mail: usuario@dominio.com → u*****@d*****.com
        $texto = preg_replace_callback(
            '/\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/',
            function (array $matches): string {
                $usuario = $matches[1];
                $dominio = $matches[2];
                $usuarioMascarado = $usuario[0] . str_repeat('*', max(strlen($usuario) - 1, 1));
                $partesDominio = explode('.', $dominio);
                $partesDominio[0] = $partesDominio[0][0] . str_repeat('*', max(strlen($partesDominio[0]) - 1, 1));
                return $usuarioMascarado . '@' . implode('.', $partesDominio);
            },
            $texto
        );

        return $texto;
    }
}