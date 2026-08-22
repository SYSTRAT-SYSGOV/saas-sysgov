<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ToggleModuleRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['enabled' => ['required', 'boolean'], 'settings' => ['sometimes', 'array']]; }
}
