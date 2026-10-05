export const CEP_TIMEOUT_MS = 6000;

export type EnderecoCep = {
  logradouro: string;
  complemento: string;
  cidade: string;
  estado: string;
};

export function digitosCep(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 8);
}

export function formatarCep(valor: string) {
  const digitos = digitosCep(valor);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export async function buscarCep(cep: string, signal: AbortSignal): Promise<EnderecoCep> {
  const digitos = digitosCep(cep);
  const response = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal });
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP.");
  }

  const data = (await response.json()) as {
    erro?: boolean;
    logradouro?: string;
    complemento?: string;
    localidade?: string;
    uf?: string;
  };

  if (data.erro || !data.localidade || !data.uf) {
    throw new Error("CEP não encontrado.");
  }

  return {
    logradouro: data.logradouro ?? "",
    complemento: data.complemento ?? "",
    cidade: data.localidade,
    estado: data.uf,
  };
}
