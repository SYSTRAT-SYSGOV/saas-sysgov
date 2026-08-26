<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use PragmaRX\Google2FAQRCode\Google2FA;

final class MfaService
{
    private Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate MFA secret and QR code for user
     *
     * @return array{secret: string, otpauth_url: string, qr_code_url: string|null}
     */
    public function enable(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();

        $user->update([
            'mfa_secret' => encrypt($secret),
            'mfa_enabled' => false,
            'mfa_confirmed_at' => null,
        ]);

        $company = (string) config('app.name', 'SYSGOV');
        $otpauthUrl = sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($company),
            rawurlencode($user->email),
            $secret,
            rawurlencode($company)
        );

        $data = [
            'secret' => $secret,
            'otpauth_url' => $otpauthUrl,
            'qr_code_url' => null,
        ];

        // QR inline é opcional — depende de bacon/bacon-qr-code ou chillerlan/php-qrcode
        try {
            $data['qr_code_url'] = $this->google2fa->getQRCodeInline($company, $user->email, $secret);
        } catch (\Throwable) {
            // sem serviço de QR instalado — o frontend usa otpauth_url
        }

        return $data;
    }

    /**
     * Confirm MFA code and enable MFA
     * RN-USR-005: MFA obrigatório para papéis privilegiados
     */
    public function confirm(User $user, string $code): bool
    {
        $secret = decrypt($user->mfa_secret);
        $valid = $this->google2fa->verifyKey($secret, $code);

        if ($valid) {
            $user->update([
                'mfa_enabled' => true,
                'mfa_confirmed_at' => now(),
            ]);

            // Clear permission cache
            $user->clearPermissionCache();
        }

        return $valid;
    }

    /**
     * Disable MFA (requires password confirmation)
     */
    public function disable(User $user, string $password): bool
    {
        if (!password_verify($password, $user->password)) {
            return false;
        }

        $user->update([
            'mfa_secret' => null,
            'mfa_enabled' => false,
            'mfa_confirmed_at' => null,
        ]);

        $user->clearPermissionCache();

        return true;
    }

    /**
     * Verify MFA code
     */
    public function verify(User $user, string $code): bool
    {
        if (!$user->mfa_enabled || !$user->mfa_secret) {
            return false;
        }

        $secret = decrypt($user->mfa_secret);
        return $this->google2fa->verifyKey($secret, $code);
    }

    /**
     * Check if user requires MFA but hasn't configured it
     * RN-USR-005: MFA obrigatório para papéis privilegiados
     */
    public function isRequired(User $user): bool
    {
        return $user->requiresMfa() && !$user->mfa_enabled;
    }

    /**
     * Assert MFA is configured for privileged roles
     * Throws exception if MFA required but not configured
     */
    public function assertRequired(User $user): void
    {
        if ($this->isRequired($user)) {
            throw new \RuntimeException('MFA obrigatório para este papel. Configure a autenticação de dois fatores.');
        }
    }
}