// Hook para buscar endereço pelo CEP via ViaCEP API
export async function fetchCep(cep) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      endereco_completo: [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
}

// Formata o CEP enquanto digita: 00000-000
export function formatCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return digits.slice(0, 5) + '-' + digits.slice(5);
  return digits;
}
