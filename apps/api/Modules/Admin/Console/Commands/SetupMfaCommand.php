<?php

declare(strict_types=1);

namespace Modules\Admin\Console\Commands;

use App\Models\User;
use App\Services\MfaService;
use Illuminate\Console\Command;
use PragmaRX\Google2FA\Google2FA;

final class SetupMfaCommand extends Command
{
    protected $signature = 'mfa:setup {email : E-mail do usuário}';

    protected $description = 'Gera o secret TOTP para um usuário privilegiado (bootstrap do primeiro admin).';

    public function handle(MfaService $mfa): int
    {
        $email = (string) $this->argument('email');
        $user = User::query()->where('email', $email)->first();

        if (!$user) {
            $this->error("Usuário com e-mail '{$email}' não encontrado.");
            return self::FAILURE;
        }

        if ($user->mfa_enabled && $user->mfa_confirmed_at) {
            $this->warn("MFA já está ativo para {$user->email}.");
            return self::SUCCESS;
        }

        $data = $mfa->enable($user);
        $currentCode = (new Google2FA())->getCurrentOtp($data['secret']);

        $this->info("Usuário: {$user->email}");
        $this->line('');
        $this->info('Adicione o secret abaixo ao app autenticador (Google Authenticator, Authy, etc.):');
        $this->line('');
        $this->line("  Secret: {$data['secret']}");
        $this->line("  OTP Auth: {$data['otpauth_url']}");
        $this->line('');
        $this->info("Código atual para confirmar: {$currentCode}");
        $this->line('');
        $this->line('Depois, faça login com e-mail + senha + o código do app. O MFA será ativado ao confirmar o primeiro login.');

        return self::SUCCESS;
    }
}
