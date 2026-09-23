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
        Schema::table('capd_sessoes', function (Blueprint $table) {
            $table->string('psc_transaction_id')->nullable()->after('hash_ata_sha256');
            $table->string('psc_certificate_serial')->nullable()->after('psc_transaction_id');
            $table->timestamp('psc_signed_at')->nullable()->after('psc_certificate_serial');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('capd_sessoes', function (Blueprint $table) {
            $table->dropColumn(['psc_transaction_id', 'psc_certificate_serial', 'psc_signed_at']);
        });
    }
};
