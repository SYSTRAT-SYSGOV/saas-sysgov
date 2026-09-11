<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Configurações institucionais do próprio tenant (auto-atendimento pelo
 * admin_tenant): logo e dados institucionais (CNPJ, endereço, telefone)
 * usados nos documentos gerados pelo sistema (PDF do DFD, da Legislação
 * etc.) — diferente do painel de branding do tenant que o admin da
 * SYSTRAT configura via Modules\Admin\Http\Requests\UpdateTenantRequest
 * (esse é institucional/documental; aquele é white-label da plataforma).
 *
 * O logo fica em `settings.customLogoUrl` — MESMA chave já usada e
 * renderizada pelo Sidebar.tsx para o branding da plataforma — então o
 * upload feito aqui também atualiza a logo exibida no menu lateral. Os
 * demais campos ficam em `settings.documentInfo`, um sub-objeto próprio
 * pra não colidir com as chaves de white-label (customPrimaryColor,
 * portalTitle etc.) geridas pelo painel da SYSTRAT.
 */
final class TenantSettingsController
{
    private const CAMPOS_DOCUMENT_INFO = ['cnpj', 'endereco', 'cidade', 'uf', 'cep', 'telefone'];

    public function __construct(
        private readonly TenantContext $tenants,
    ) {}

    public function show(): JsonResponse
    {
        $tenant = $this->tenants->get();
        $settings = $tenant->settings ?? [];

        return response()->json([
            'customLogoUrl' => $settings['customLogoUrl'] ?? null,
            'documentInfo' => $this->documentInfo($settings),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->autorizarGerenciamento($request);

        $data = $request->validate([
            'documentInfo' => ['sometimes', 'array'],
            'documentInfo.cnpj' => ['sometimes', 'nullable', 'string', 'max:20'],
            'documentInfo.endereco' => ['sometimes', 'nullable', 'string', 'max:255'],
            'documentInfo.cidade' => ['sometimes', 'nullable', 'string', 'max:120'],
            'documentInfo.uf' => ['sometimes', 'nullable', 'string', 'size:2'],
            'documentInfo.cep' => ['sometimes', 'nullable', 'string', 'max:10'],
            'documentInfo.telefone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ]);

        $tenant = $this->tenants->get();
        $settings = $tenant->settings ?? [];
        $documentInfo = $this->documentInfo($settings);

        foreach (self::CAMPOS_DOCUMENT_INFO as $campo) {
            if (array_key_exists($campo, $data['documentInfo'] ?? [])) {
                $documentInfo[$campo] = $data['documentInfo'][$campo];
            }
        }

        $settings['documentInfo'] = $documentInfo;
        $tenant->update(['settings' => $settings]);
        $this->invalidateSessionCache();

        return response()->json([
            'customLogoUrl' => $settings['customLogoUrl'] ?? null,
            'documentInfo' => $documentInfo,
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $this->autorizarGerenciamento($request);

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,svg,webp', 'max:2048'],
        ]);

        $tenant = $this->tenants->get();
        $diretorio = "tenants/{$tenant->id}";

        // Remove qualquer logo anterior (extensão pode ter mudado) antes de
        // salvar a nova — só existe um arquivo de logo por tenant.
        Storage::disk('public')->deleteDirectory($diretorio);

        $extensao = $request->file('logo')->extension() ?: 'png';
        $caminho = $request->file('logo')->storeAs($diretorio, 'logo.' . $extensao, 'public');

        $settings = $tenant->settings ?? [];
        // Cache-bust via query string: o navegador (e o próprio tenant, ao
        // trocar a logo mais de uma vez na mesma sessão) não têm como saber
        // que o conteúdo mudou só pela URL, já que o nome do arquivo é fixo.
        $settings['customLogoUrl'] = Storage::disk('public')->url($caminho) . '?v=' . time();
        $tenant->update(['settings' => $settings]);
        $this->invalidateSessionCache();

        return response()->json([
            'customLogoUrl' => $settings['customLogoUrl'],
            'documentInfo' => $this->documentInfo($settings),
        ]);
    }

    public function deleteLogo(Request $request): JsonResponse
    {
        $this->autorizarGerenciamento($request);

        $tenant = $this->tenants->get();
        Storage::disk('public')->deleteDirectory("tenants/{$tenant->id}");

        $settings = $tenant->settings ?? [];
        unset($settings['customLogoUrl']);
        $tenant->update(['settings' => $settings]);
        $this->invalidateSessionCache();

        return response()->json([
            'customLogoUrl' => null,
            'documentInfo' => $this->documentInfo($settings),
        ]);
    }

    /**
     * @param array<string, mixed> $settings
     * @return array<string, string|null>
     */
    private function documentInfo(array $settings): array
    {
        $documentInfo = $settings['documentInfo'] ?? [];

        return array_combine(
            self::CAMPOS_DOCUMENT_INFO,
            array_map(fn (string $campo) => $documentInfo[$campo] ?? null, self::CAMPOS_DOCUMENT_INFO),
        );
    }

    /**
     * Só admin_tenant (do próprio tenant) ou platform admin gerenciam as
     * configurações institucionais — mesmo corte de acesso usado em outros
     * recursos "de tenant" do sistema (ex.: UpdateTenantAdminRequest).
     */
    private function autorizarGerenciamento(Request $request): void
    {
        $user = $request->user();
        abort_unless(
            $user !== null && ($user->is_platform_admin || $user->hasPermission('tenant.settings.update')),
            403,
            'Sem permissão para gerenciar as configurações institucionais.',
        );
    }

    /**
     * Mesmo padrão de Modules\Client\Http\Controllers\ClientNavigationController
     * — o /auth/me fica em cache por usuário+tenant+versão de navegação;
     * sem isso, a logo/dados institucionais recém-salvos só apareceriam
     * pros demais usuários (e nos PDFs, que leem do tenant da sessão) até
     * o cache expirar sozinho.
     */
    private function invalidateSessionCache(): void
    {
        $tenantId = $this->tenants->id();
        Cache::put('nav:version:' . $tenantId, now()->timestamp, now()->addYear());
    }
}
