import { useCallback, useEffect, useRef, useState } from 'react';

/** Blocos de até 15 MB: cada um vira um WebM válido e fica abaixo do limite de envio da API (20 MB). */
const TAMANHO_BLOCO = 15 * 1024 * 1024;

/**
 * Gravação da reunião para o Assistente IA (MediaRecorder). Ao atingir 15 MB o gravador é reiniciado,
 * gerando um novo bloco, e a gravação continua. `parar()` devolve todos os blocos gravados.
 */
export function useGravacaoIa() {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const blocos = useRef<Blob[]>([]);
  const atual = useRef<Blob[]>([]);
  const tamanho = useRef(0);
  const continuar = useRef(false);
  const fim = useRef<((b: Blob[]) => void) | null>(null);
  const relogio = useRef<number | null>(null);

  const novoGravador = useCallback(() => {
    if (!stream.current) return;
    atual.current = [];
    tamanho.current = 0;
    const g = new MediaRecorder(stream.current, MediaRecorder.isTypeSupported?.('audio/webm') ? { mimeType: 'audio/webm' } : undefined);
    g.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      atual.current.push(e.data);
      tamanho.current += e.data.size;
      if (tamanho.current >= TAMANHO_BLOCO && g.state !== 'inactive') g.stop();
    };
    g.onstop = () => {
      if (atual.current.length) blocos.current.push(new Blob(atual.current, { type: 'audio/webm' }));
      if (continuar.current) {
        novoGravador();
      } else {
        stream.current?.getTracks().forEach((t) => t.stop());
        stream.current = null;
        fim.current?.(blocos.current);
        fim.current = null;
      }
    };
    gravador.current = g;
    g.start(1000);
  }, []);

  const iniciar = useCallback(async () => {
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    blocos.current = [];
    continuar.current = true;
    setSegundos(0);
    novoGravador();
    setGravando(true);
    relogio.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
  }, [novoGravador]);

  const parar = useCallback(
    () =>
      new Promise<Blob[]>((resolve) => {
        continuar.current = false;
        setGravando(false);
        if (relogio.current) window.clearInterval(relogio.current);
        fim.current = resolve;
        if (gravador.current && gravador.current.state !== 'inactive') gravador.current.stop();
        else resolve(blocos.current);
      }),
    [],
  );

  const cancelar = useCallback(() => {
    void parar().then(() => {
      blocos.current = [];
    });
  }, [parar]);

  useEffect(
    () => () => {
      continuar.current = false;
      if (relogio.current) window.clearInterval(relogio.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const tempo = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

  return { gravando, tempo, iniciar, parar, cancelar };
}
