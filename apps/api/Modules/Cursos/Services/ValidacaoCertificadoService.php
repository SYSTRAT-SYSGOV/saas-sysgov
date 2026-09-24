<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Models\Certificado;

/**
 * ÚNICO ponto de acesso a dados das rotas públicas do módulo (design D7).
 *
 * Roda sem TenantContext: faz uma única consulta, pelo código (único em toda
 * a plataforma), e devolve apenas os campos que a spec permite expor, lidos
 * do snapshot do próprio certificado. Não consulte nenhum outro model aqui —
 * sem tenant na requisição, o TenantAware não filtra nada.
 */
final class ValidacaoCertificadoService
{
    /** Campos expostos na validação pública (spec: "Validação pública de autenticidade"). */
    public const CAMPOS_PUBLICOS = ['codigo', 'status', 'tipo', 'participante', 'curso', 'carga_horaria', 'periodo', 'data_emissao', 'orgao'];

    /**
     * @return array<string, string>|null null quando o código não existe
     */
    public function consultar(string $codigoDigitado): ?array
    {
        $codigo = CertificadoService::normalizarCodigo($codigoDigitado);
        if (strlen($codigo) !== 12) {
            return null;
        }

        $certificado = Certificado::query()
            ->withoutGlobalScope('tenant')
            ->where('codigo', $codigo)
            ->first(['codigo', 'tipo', 'dados', 'revogado_em']);

        if ($certificado === null) {
            return null;
        }

        $dados = $certificado->dados;
        $publico = [
            'codigo' => $certificado->codigoFormatado(),
            'status' => $certificado->revogado() ? 'revogado' : 'valido',
            'tipo' => $certificado->tipo,
            'participante' => (string) ($dados['participante'] ?? ''),
            'curso' => (string) ($dados['curso'] ?? ''),
            'carga_horaria' => (string) ($dados['carga_horaria'] ?? ''),
            'periodo' => (string) ($dados['periodo'] ?? ''),
            'data_emissao' => (string) ($dados['data_emissao'] ?? ''),
            'orgao' => (string) ($dados['orgao'] ?? ''),
        ];

        return array_intersect_key($publico, array_flip(self::CAMPOS_PUBLICOS));
    }
}
