export interface Coordenadas {
  latitude: number;
  longitude: number;
}

/**
 * Captura a posição atual do dispositivo para georreferenciar uma resposta no
 * momento do registro. Nunca lança erro — quando indisponível/negada, resolve
 * `null` para não bloquear o preenchimento do checklist.
 */
export function obterCoordenadasAtuais(): Promise<Coordenadas | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicao) => resolve({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30_000 },
    );
  });
}
