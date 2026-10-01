<?php

declare(strict_types=1);

/*
 * Rotas públicas do módulo Cursos — SEM login e SEM TenantContext (não têm `{orgao}` na URL).
 *
 * Sem TenantContext o TenantAware não filtra por tenant: qualquer consulta
 * a um model do módulo feita a partir daqui enxergaria todos os órgãos.
 * Por isso os controllers destas rotas (Http/Controllers/Publico) só podem
 * depender de classes de Services\Publico (design D7) — o teste de
 * arquitetura do módulo falha se isso for violado. Verificação de e-mail
 * também vive aqui: o token já diz sozinho qual usuário/tenant, então não
 * precisa do `{orgao}` nem do `ResolvePublicTenant`.
 */

use Illuminate\Support\Facades\Route;
use Modules\Cursos\Http\Controllers\Publico\ValidacaoCertificadoController;
use Modules\Cursos\Http\Controllers\Publico\VerificacaoEmailController;

Route::get('/certificados/{codigo}', ValidacaoCertificadoController::class)->where('codigo', '[0-9A-Za-z-]{1,20}');
Route::post('/verificar-email', VerificacaoEmailController::class);
