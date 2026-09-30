<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Publico;

use App\Models\Tenant;
use App\Notificacoes\ResolvedorIdentidade;

/**
 * Identidade visual do órgão para a casca da página pública (design D7) — mesmo resolvedor das
 * mensagens (D4), reaproveitado aqui para o cadastro/catálogo público terem a mesma marca do
 * e-mail que a pessoa recebe.
 */
final class OrgaoPublicoService
{
    public function __construct(private readonly ResolvedorIdentidade $resolvedorIdentidade) {}

    /**
     * @return array{nome: string, slug: string, boas_vindas: string|null, identidade: array{titulo: string, cor_primaria: string|null, logo_url: string|null}}
     */
    public function informacoes(Tenant $tenant): array
    {
        $identidade = $this->resolvedorIdentidade->resolver($tenant);

        return [
            'nome' => $tenant->name,
            'slug' => $tenant->slug,
            // Único campo de settings.cursos exposto aqui (design D11): o texto de boas-vindas
            // que o Administrador configura em /configuracao-publica (tarefa 3.2).
            'boas_vindas' => data_get($tenant->settings, 'cursos.boas_vindas'),
            'identidade' => [
                'titulo' => $identidade->titulo,
                'cor_primaria' => $identidade->corPrimaria,
                'logo_url' => $identidade->logoUrl,
            ],
        ];
    }
}
