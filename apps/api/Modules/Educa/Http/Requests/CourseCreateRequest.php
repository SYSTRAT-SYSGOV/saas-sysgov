<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CourseCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'max:30'],
            'nome' => ['required', 'string', 'max:100'],
            'nivel' => ['required', 'string', 'in:infantil,fundamental_iniciais,fundamental_finais,medio,eja'],
            'modalidade' => ['required', 'string', 'in:regular,especial,eja'],
        ];
    }
}
