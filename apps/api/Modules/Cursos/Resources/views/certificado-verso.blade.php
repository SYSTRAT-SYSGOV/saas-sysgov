{{--
    Verso com o conteúdo programático (design D6), comum aos modelos padrão e visual. Só é
    incluído quando o snapshot tem conteúdo ($verso não nulo). Fluxo normal de texto dentro de
    uma página própria; o fundo do verso, se houver, ocupa a página inteira.
--}}
@if ($verso)
<div style="page-break-before: always; position: relative; width: {{ $largura }}pt; height: {{ $altura }}pt; overflow: hidden; font-family: 'DejaVu Sans', sans-serif; color: #1b2a41;">
    @if ($versoFundo)
        <img src="{{ $versoFundo }}" style="position: absolute; left: 0; top: 0; width: {{ $largura }}pt; height: {{ $altura }}pt;" alt="">
    @endif
    <div style="position: absolute; left: 50pt; top: 45pt; width: {{ $largura - 100 }}pt;">
        <div style="font-size: 16pt; font-weight: bold; color: #0c326f; margin-bottom: 4pt;">{{ $verso['titulo'] }}</div>
        <div style="font-size: 10pt; color: #4a5b73; margin-bottom: 12pt;">{{ $verso['subtitulo'] }}</div>
        <div style="font-size: 11pt; line-height: 1.45;">
            @foreach ($verso['linhas'] as $linha)
                <div style="margin-bottom: 3pt;">{{ $linha }}</div>
            @endforeach
        </div>
    </div>
    <div style="position: absolute; left: 50pt; top: {{ $altura - 50 }}pt; width: {{ $largura - 100 }}pt; font-size: 8.5pt; color: #4a5b73; text-align: center;">
        Código de autenticidade: {{ $codigo }} — confira em {{ $urlValidacao }}
    </div>
</div>
@endif
