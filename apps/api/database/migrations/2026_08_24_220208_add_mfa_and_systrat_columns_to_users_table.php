<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('avatar_url')->nullable()->after('email');
            $table->boolean('is_systrat')->default(false)->after('avatar_url');
            $table->boolean('is_active')->default(true)->after('is_systrat');
            $table->string('mfa_secret')->nullable()->after('password');
            $table->boolean('mfa_enabled')->default(false)->after('mfa_secret');
            $table->timestamp('mfa_confirmed_at')->nullable()->after('mfa_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['avatar_url', 'is_systrat', 'is_active', 'mfa_secret', 'mfa_enabled', 'mfa_confirmed_at']);
        });
    }
};
