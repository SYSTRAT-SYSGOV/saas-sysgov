<x-email-layout :identidade="$identidade">
    <p>Olá, {{ $nome }}.</p>
    <p>Seu certificado do curso "{{ $curso }}" foi emitido. Código: <strong>{{ $codigo }}</strong>.</p>
    <p>
        <a href="{{ $link }}" style="display:inline-block; background-color:{{ $identidade->corPrimaria ?? '#0c326f' }}; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
            Validar certificado
        </a>
    </p>
    <p style="color:#6b7280; font-size:13px;">
        Qualquer pessoa pode validar a autenticidade deste certificado pelo código, sem precisar entrar no sistema.
    </p>
</x-email-layout>
