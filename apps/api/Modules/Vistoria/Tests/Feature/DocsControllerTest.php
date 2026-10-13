<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use Tests\TestCase;

final class DocsControllerTest extends TestCase
{
    public function test_api_docs_serve_a_pagina_swagger_ui_sem_autenticacao(): void
    {
        $response = $this->get('/api/docs');

        $response->assertStatus(200);
        self::assertStringContainsString('swagger-ui', $response->getContent());
        self::assertStringContainsString('/api/docs/openapi.yaml', $response->getContent());
    }

    public function test_openapi_spec_esta_disponivel_sem_autenticacao(): void
    {
        $response = $this->get('/api/docs/openapi.yaml');

        $response->assertStatus(200);
        self::assertStringContainsString('openapi: 3.0.3', $response->getContent());
        self::assertStringContainsString('/autuacoes', $response->getContent());
    }
}
