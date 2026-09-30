<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Página pública do curso (design D11): `slug` (único por tenant, editável) identifica o curso na
 * URL pública; `texto_publico` é o texto de divulgação sanitizado (`HtmlSanitizer`, D5 da Fase 2).
 * Cursos existentes ganham um slug gerado do título — não dá pra deixar `NULL` porque a coluna
 * precisa ser navegável assim que a página pública for habilitada num órgão com cursos antigos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->string('slug', 160)->nullable()->after('titulo');
            $table->text('texto_publico')->nullable()->after('descricao');
        });

        $this->preencherSlugs();

        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->unique(['tenant_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->dropColumn(['slug', 'texto_publico']);
        });
    }

    /** Gera slugs a partir do título, únicos por tenant (sufixo -2, -3... em colisão dentro do mesmo tenant). */
    private function preencherSlugs(): void
    {
        $cursos = DB::table('cursos_cursos')->select(['id', 'tenant_id', 'titulo'])->orderBy('id')->get();

        /** @var array<int, array<string, true>> $usadosPorTenant */
        $usadosPorTenant = [];

        foreach ($cursos as $curso) {
            $base = Str::slug($curso->titulo);
            if ($base === '') {
                $base = 'curso';
            }

            $slug = $base;
            $sufixo = 2;
            while (isset($usadosPorTenant[$curso->tenant_id][$slug])) {
                $slug = "{$base}-{$sufixo}";
                $sufixo++;
            }
            $usadosPorTenant[$curso->tenant_id][$slug] = true;

            DB::table('cursos_cursos')->where('id', $curso->id)->update(['slug' => $slug]);
        }
    }
};
