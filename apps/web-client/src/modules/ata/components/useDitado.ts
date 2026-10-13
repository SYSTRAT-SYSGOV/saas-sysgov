import { useCallback, useEffect, useRef, useState } from 'react';

interface ResultadoFala { isFinal: boolean; 0: { transcript: string } }
interface EventoFala { resultIndex: number; results: ArrayLike<ResultadoFala> }
interface Reconhecimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoFala) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type ConstrutorReconhecimento = new () => Reconhecimento;

function construtor(): ConstrutorReconhecimento | null {
  const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Digitação por voz (Web Speech API, pt-BR, contínua). Roda só no navegador: o áudio não passa pela API.
 * Entrega apenas os trechos finais (sem os parciais) para não "piscar" o texto do editor.
 */
export function useDitado(aoReconhecer: (texto: string) => void, aoErro: (mensagem: string) => void) {
  const [ativo, setAtivo] = useState(false);
  const ref = useRef<Reconhecimento | null>(null);
  const suportado = construtor() !== null;
  const callback = useRef(aoReconhecer);
  callback.current = aoReconhecer;

  const parar = useCallback(() => ref.current?.stop(), []);

  const iniciar = useCallback(() => {
    const C = construtor();
    if (!C) {
      aoErro('Este navegador não oferece digitação por voz. Use o Google Chrome ou o Microsoft Edge.');
      return;
    }
    const r = new C();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let texto = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) texto += e.results[i][0].transcript + ' ';
      }
      if (texto.trim()) callback.current(texto.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed') aoErro('Permita o uso do microfone no navegador para ditar a ata.');
    };
    r.onend = () => setAtivo(false);
    ref.current = r;
    r.start();
    setAtivo(true);
  }, [aoErro]);

  useEffect(() => () => ref.current?.stop(), []);

  return { suportado, ativo, iniciar, parar };
}
