<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\HtmlSanitizer;

/**
 * Configuração da página pública do órgão (design D10, D11) — sub-objeto próprio,
 * `settings.cursos`, pra não colidir com as chaves de white-label da plataforma
 * (`customPrimaryColor`, `portalTitle`...) nem com `settings.documentInfo` (outro controller).
 * `publico_habilitado` é a mesma chave que `ResolvePublicTenant` já lê (D7).
 */
final class ConfiguracaoPublicaService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @return array{publico_habilitado: bool, boas_vindas: string|null, termo: array{texto: string|null, versao: int}, documento_obrigatorio: bool}
     */
    public function obter(Tenant $tenant): array
    {
        return $this->normalizar($tenant->settings ?? []);
    }

    /**
     * @param array<string, mixed> $dados
     * @return array{publico_habilitado: bool, boas_vindas: string|null, termo: array{texto: string|null, versao: int}, documento_obrigatorio: bool}
     */
    public function atualizar(Tenant $tenant, array $dados): array
    {
        $settings = $tenant->settings ?? [];
        $antes = $this->normalizar($settings);
        $cursos = $antes;

        if (array_key_exists('publico_habilitado', $dados)) {
            $cursos['publico_habilitado'] = (bool) $dados['publico_habilitado'];
        }
        if (array_key_exists('boas_vindas', $dados)) {
            $cursos['boas_vindas'] = $this->sanitizarOuNulo($dados['boas_vindas']);
        }
        if (array_key_exists('documento_obrigatorio', $dados)) {
            $cursos['documento_obrigatorio'] = (bool) $dados['documento_obrigatorio'];
        }
        if (array_key_exists('termo', $dados) && array_key_exists('texto', $dados['termo'])) {
            $novoTexto = $this->sanitizarOuNulo($dados['termo']['texto']);
            // Versão só sobe quando o texto realmente muda (D10) — reenviar o mesmo texto (ex.:
            // o frontend sempre manda o campo inteiro no PUT) não pode inflar a versão à toa.
            if ($novoTexto !== $cursos['termo']['texto']) {
                $cursos['termo'] = ['texto' => $novoTexto, 'versao' => $cursos['termo']['versao'] + 1];
            }
        }

        $settings['cursos'] = $cursos;
        $tenant->update(['settings' => $settings]);

        $this->audit->record('cursos', 'configuracao_publica.atualizada', "Tenant #{$tenant->id}", ['cursos' => $antes], ['cursos' => $cursos]);

        return $cursos;
    }

    /**
     * @param array<string, mixed> $settings
     * @return array{publico_habilitado: bool, boas_vindas: string|null, termo: array{texto: string|null, versao: int}, documento_obrigatorio: bool}
     */
    private function normalizar(array $settings): array
    {
        $cursos = $settings['cursos'] ?? [];

        return [
            'publico_habilitado' => (bool) ($cursos['publico_habilitado'] ?? false),
            'boas_vindas' => $cursos['boas_vindas'] ?? null,
            'termo' => [
                'texto' => $cursos['termo']['texto'] ?? null,
                'versao' => (int) ($cursos['termo']['versao'] ?? 0),
            ],
            'documento_obrigatorio' => (bool) ($cursos['documento_obrigatorio'] ?? false),
        ];
    }

    private function sanitizarOuNulo(mixed $texto): ?string
    {
        if ($texto === null) {
            return null;
        }

        $limpo = $this->sanitizer->sanitize((string) $texto);

        return $limpo !== '' ? $limpo : null;
    }
}
