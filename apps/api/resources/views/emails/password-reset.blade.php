<x-email-layout :identidade="$identidade">
    <p>Olá, {{ $nome }}.</p>
    <p>Recebemos um pedido de redefinição de senha da sua conta no {{ $identidade->titulo }}.</p>
    <p>
        <a href="{{ $link }}" style="display:inline-block; background-color:{{ $identidade->corPrimaria ?? '#0c326f' }}; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
            Redefinir senha
        </a>
    </p>
    <p style="color:#6b7280; font-size:13px;">
        O link expira em 60 minutos. Se você não pediu essa redefinição, ignore este e-mail — sua senha continua a mesma.
    </p>
</x-email-layout>
