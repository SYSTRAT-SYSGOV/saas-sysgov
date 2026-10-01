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
     * @return array{nome: string, slug: string, boas_vindas: string|null, termo_texto: string|null, documento_obrigatorio: bool, identidade: array{titulo: string, cor_primaria: string|null, logo_url: string|null, assinatura_oculta: bool}}
     */
    public function informacoes(Tenant $tenant): array
    {
        $identidade = $this->resolvedorIdentidade->resolver($tenant);

        return [
            'nome' => $tenant->name,
            'slug' => $tenant->slug,
            // Campos de settings.cursos expostos aqui (design D10/D11), configurados pelo
            // Administrador em /configuracao-publica (tarefas 3.2/6.6): o cadastro externo
            // precisa do termo de verdade pra mostrar o que a pessoa está aceitando, e de saber
            // se o CPF é obrigatório pra validar e marcar o campo certo no formulário.
            'boas_vindas' => data_get($tenant->settings, 'cursos.boas_vindas'),
            'termo_texto' => data_get($tenant->settings, 'cursos.termo.texto'),
            'documento_obrigatorio' => (bool) data_get($tenant->settings, 'cursos.documento_obrigatorio', false),
            'identidade' => [
                'titulo' => $identidade->titulo,
                'cor_primaria' => $identidade->corPrimaria,
                'logo_url' => $identidade->logoUrl,
                // White-label (CLAUDE.md): a assinatura "Portal SYSGOV — SYSTRAT" do rodapé
                // respeita a mesma chave que já vale pro e-mail (D4) e pro portal de Cemitérios.
                'assinatura_oculta' => $identidade->assinaturaOculta,
            ],
        ];
    }
}
