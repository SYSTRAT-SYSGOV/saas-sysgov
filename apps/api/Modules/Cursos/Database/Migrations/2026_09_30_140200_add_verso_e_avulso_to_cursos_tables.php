<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Verso com conteúdo programático (D6) e emissão avulsa (D7).
 *
 * - `cursos_cursos.conteudo_programatico`: impresso no verso, congelado na emissão.
 * - `cursos_certificados.curso_id` + `concluido_em`: certificado avulso de um curso, sem
 *   inscrição; o índice único garante que emitir de novo para a mesma pessoa, curso e data
 *   devolva o existente. Nos certificados de inscrição/formação ficam nulos (não conflitam).
 * - `cursos_participantes.email` passa a aceitar nulo: pessoa ou empresa emitida à mão pode não
 *   ter e-mail. O único (tenant_id, email) continua valendo para quem tem.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->text('conteudo_programatico')->nullable()->after('descricao');
        });

        Schema::table('cursos_certificados', function (Blueprint $table): void {
            $table->foreignId('curso_id')->nullable()->after('formacao_id')->constrained('cursos_cursos')->restrictOnDelete();
            $table->date('concluido_em')->nullable()->after('curso_id');
            $table->unique(['curso_id', 'participante_id', 'concluido_em'], 'cursos_certificados_avulso_unique');
        });

        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->string('email')->nullable(false)->change();
        });

        Schema::table('cursos_certificados', function (Blueprint $table): void {
            $table->dropUnique('cursos_certificados_avulso_unique');
            $table->dropConstrainedForeignId('curso_id');
            $table->dropColumn('concluido_em');
        });

        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->dropColumn('conteudo_programatico');
        });
    }
};
