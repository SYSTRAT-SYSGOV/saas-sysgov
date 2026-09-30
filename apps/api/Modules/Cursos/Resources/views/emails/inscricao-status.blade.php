<x-email-layout :identidade="$identidade">
    @foreach ($paragrafos as $paragrafo)
        <p>{{ $paragrafo }}</p>
    @endforeach
</x-email-layout>
