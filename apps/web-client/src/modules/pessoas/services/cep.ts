/**
 * Serviço de integração com a API pública ViaCEP para preenchimento automático de endereços.
 */

export interface ConsultaCepResultado {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export async function consultarCep(cep: string): Promise<ConsultaCepResultado | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ConsultaCepResultado;
    if (data.erro) return null;
    return data;
  } catch (e) {
    console.error('Falha ao consultar CEP:', e);
    return null;
  }
}
