export interface AutentiqueConfig {
  token: string;
  environment: 'production' | 'sandbox';
  defaultSignerName: string;
  defaultSignerEmail: string;
  isConnected: boolean;
  accountInfo?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

const STORAGE_KEY = 'mcm_autentique_config';

class AutentiqueService {
  private config: AutentiqueConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AutentiqueConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações do Autentique:', e);
    }

    return {
      token: '',
      environment: 'production',
      defaultSignerName: 'TI MCM Montagens',
      defaultSignerEmail: 'ti@mcmmontagens.com',
      isConnected: false,
    };
  }

  public getConfig(): AutentiqueConfig {
    return { ...this.config };
  }

  public saveConfig(updates: Partial<AutentiqueConfig>): AutentiqueConfig {
    this.config = {
      ...this.config,
      ...updates,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Erro ao salvar configurações do Autentique:', e);
    }
    return { ...this.config };
  }

  public async testConnection(
    token: string,
    environment: 'production' | 'sandbox' = 'production'
  ): Promise<{ success: boolean; user?: { id?: string; name?: string; email?: string }; error?: string }> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return { success: false, error: 'Token do Autentique não fornecido.' };
    }

    try {
      const endpoint = 'https://api.autentique.com.br/v2/graphql';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedToken}`,
        },
        body: JSON.stringify({
          query: `
            query {
              viewer {
                id
                name
                email
              }
            }
          `,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Falha na requisição Autentique (${response.status}: ${response.statusText})`,
        };
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        return {
          success: false,
          error: result.errors[0]?.message || 'Erro ao validar token no Autentique',
        };
      }

      const viewer = result.data?.viewer;
      if (viewer) {
        this.saveConfig({
          token: trimmedToken,
          environment,
          isConnected: true,
          accountInfo: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
          },
        });
        return {
          success: true,
          user: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
          },
        };
      }

      return {
        success: false,
        error: 'Resposta inesperada da API Autentique.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha de conexão com a API do Autentique.',
      };
    }
  }
}

export const autentiqueService = new AutentiqueService();
