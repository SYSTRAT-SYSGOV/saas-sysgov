export interface CartaoResumo {
  module: string;
  label: string;
  value: number;
  caption: string;
  tone: string;
}

export interface GrupoResumo {
  key: string;
  label: string;
  cards: CartaoResumo[];
}

/** Um card que o usuário pode mostrar ou ocultar na home (só dos módulos a que ele tem acesso). */
export interface CartaoEscolha {
  module: string;
  group: string;
  group_label: string;
  label: string;
  tone: string;
  hidden: boolean;
}
