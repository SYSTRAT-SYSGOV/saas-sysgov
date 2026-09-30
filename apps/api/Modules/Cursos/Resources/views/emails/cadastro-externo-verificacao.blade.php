<x-email-layout :identidade="$identidade">
    <p>Olá, {{ $nome }}.</p>
    <p>Falta pouco para concluir seu cadastro no {{ $identidade->titulo }}. Confirme seu e-mail para poder entrar e se inscrever nos cursos.</p>
    <p>
        <a href="{{ $link }}" style="display:inline-block; background-color:{{ $identidade->corPrimaria ?? '#0c326f' }}; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
            Confirmar e-mail
        </a>
    </p>
    <p style="color:#6b7280; font-size:13px;">
        O link expira em 24 horas. Se você não fez esse cadastro, ignore este e-mail.
    </p>
</x-email-layout>
