<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenant_security_settings', function (Blueprint $table) {
            $table->text('default_password_plain_cipher')->nullable()->after('default_password_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_security_settings', function (Blueprint $table) {
            $table->dropColumn('default_password_plain_cipher');
        });
    }
};
