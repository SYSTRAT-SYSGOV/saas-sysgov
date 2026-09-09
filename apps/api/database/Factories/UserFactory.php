<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => 'User '.Str::random(6),
            'email' => 'user-'.Str::random(8).'@sysgov.test',
            'password' => Hash::make('password-strong-123'),
            'is_platform_admin' => false,
            'is_systrat' => false,
            'is_active' => true,
        ];
    }
}