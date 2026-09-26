<?php

declare(strict_types=1);

/*
 * Rotas públicas do módulo Cursos — SEM login e SEM TenantContext.
 *
 * Sem TenantContext o TenantAware não filtra por tenant: qualquer consulta
 * a um model do módulo feita a partir daqui enxergaria todos os órgãos.
 * Por isso os controllers destas rotas (Http/Controllers/Publico) só podem
 * depender do ValidacaoCertificadoService, que faz uma única busca por
 * código e devolve apenas os campos públicos do certificado (design D7).
 * O teste de arquitetura do módulo falha se isso for violado.
 */

use Illuminate\Support\Facades\Route;
use Modules\Cursos\Http\Controllers\Publico\ValidacaoCertificadoController;

Route::get('/certificados/{codigo}', ValidacaoCertificadoController::class)->where('codigo', '[0-9A-Za-z-]{1,20}');
