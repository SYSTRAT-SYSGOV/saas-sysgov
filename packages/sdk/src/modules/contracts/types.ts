export type ApiContract = {
  id: number;
  number: string;
  title: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  status: string;
};

export type CreateContractInput = {
  number: string;
  title: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  status?: 'draft' | 'active' | 'suspended' | 'ended';
};

export type UpdateContractInput = Partial<Pick<CreateContractInput, 'title' | 'starts_at' | 'ends_at' | 'amount_cents' | 'status'>>;
