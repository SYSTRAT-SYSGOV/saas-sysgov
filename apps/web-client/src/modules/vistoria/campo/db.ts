import Dexie, { type EntityTable } from 'dexie';

export type StatusFilaSincronizacao = 'pendente' | 'enviando' | 'sincronizado' | 'erro';

export interface ItemFilaSincronizacao {
  clientUuid: string;
  ordemServicoId: number;
  status: StatusFilaSincronizacao;
  payloadCriptografado: string;
  iv: string;
  criadoEm: string;
  tentativas: number;
  ultimoErro?: string;
}

export interface ItemPacoteDoDia {
  ordemServicoId: number;
  payloadCriptografado: string;
  iv: string;
  baixadoEm: string;
}

export class CampoDB extends Dexie {
  filaSincronizacao!: EntityTable<ItemFilaSincronizacao, 'clientUuid'>;
  pacoteDoDia!: EntityTable<ItemPacoteDoDia, 'ordemServicoId'>;

  constructor() {
    super('sysgov_vistoria_campo');

    this.version(1).stores({
      filaSincronizacao: 'clientUuid, ordemServicoId, status',
      pacoteDoDia: 'ordemServicoId',
    });
  }
}

export const campoDB = new CampoDB();
