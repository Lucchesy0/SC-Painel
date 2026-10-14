import { ReturnTypeDefinition } from '../types';
import { fetchSettingFromFirestore, saveSettingToFirestore } from './firebase';

export const DEFAULT_RETURN_TYPES: ReturnTypeDefinition[] = [
  {
    id: 'Notebook',
    nome: 'Notebook',
    icone: '💻',
    descricao: 'Devolução de Notebook e periféricos corporativos',
    templatePadrao: 'Notebook\nModelo: XXXX\nMarca: XXXX\nAF: XXXX',
    observacaoPadrao: 'Com carregador e mochila.',
    isDefault: true,
    ordem: 1,
  },
  {
    id: 'Celular',
    nome: 'Celular',
    icone: '📱',
    descricao: 'Devolução de Celular corporativo e chip SIM',
    templatePadrao: 'Celular\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX',
    observacaoPadrao: 'Com carregador.',
    isDefault: true,
    ordem: 2,
  },
  {
    id: 'Modem',
    nome: 'Modem',
    icone: '📡',
    descricao: 'Devolução de Modem Wi-Fi / 4G',
    templatePadrao: 'Modem\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX',
    observacaoPadrao: 'Com fonte de alimentação.',
    isDefault: true,
    ordem: 3,
  },
  {
    id: 'Celular e Notebook',
    nome: 'Celular e Notebook',
    icone: '📱💻',
    descricao: 'Devolução conjunta de Celular e Notebook',
    templatePadrao:
      'Celular\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX\n\nNotebook\nModelo: XXXX\nMarca: XXXX\nAF: XXXX',
    observacaoPadrao: 'Com carregadores.',
    isDefault: true,
    ordem: 4,
  },
  {
    id: 'Celular e Modem',
    nome: 'Celular e Modem',
    icone: '📱📡',
    descricao: 'Devolução conjunta de Celular e Modem',
    templatePadrao:
      'Celular\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX\n\nModem\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX',
    observacaoPadrao: 'Com carregadores.',
    isDefault: true,
    ordem: 5,
  },
  {
    id: 'Notebook e Modem',
    nome: 'Notebook e Modem',
    icone: '💻📡',
    descricao: 'Devolução conjunta de Notebook e Modem',
    templatePadrao:
      'Notebook\nModelo: XXXX\nMarca: XXXX\nAF: XXXX\n\nModem\nModelo: XXXX\nImei chip: XXXX\nImei Celular: XXXX',
    observacaoPadrao: 'Com carregadores.',
    isDefault: true,
    ordem: 6,
  },
];

const STORAGE_KEY = 'mcm_return_types_config';
const FIRESTORE_SETTING_KEY = 'return_types_config';

let inMemoryReturnTypes: ReturnTypeDefinition[] = (() => {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_RETURN_TYPES;
})();

const listeners: Array<(types: ReturnTypeDefinition[]) => void> = [];

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb([...inMemoryReturnTypes]);
    } catch (e) {
      console.error('Error in returnTypes listener:', e);
    }
  });
}

export const returnTypesService = {
  /**
   * Retorna os tipos de devolução síncrona do cache local
   */
  getReturnTypes(): ReturnTypeDefinition[] {
    return [...inMemoryReturnTypes];
  },

  /**
   * Busca os tipos de devolução sincronizando com Firestore e localStorage
   */
  async fetchReturnTypesWithSync(): Promise<ReturnTypeDefinition[]> {
    try {
      const cloudData = await fetchSettingFromFirestore<ReturnTypeDefinition[]>(FIRESTORE_SETTING_KEY);
      if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
        inMemoryReturnTypes = cloudData;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
        } catch {}
        notifyListeners();
        return [...cloudData];
      }
    } catch (err) {
      console.warn('Erro ao sincronizar tipos de devolução da nuvem:', err);
    }

    // Se a nuvem não tiver, sobe os locais
    try {
      await saveSettingToFirestore(FIRESTORE_SETTING_KEY, inMemoryReturnTypes);
    } catch {}

    return [...inMemoryReturnTypes];
  },

  /**
   * Salva ou atualiza um tipo de devolução
   */
  async saveReturnType(typeDef: ReturnTypeDefinition): Promise<ReturnTypeDefinition[]> {
    const existingIndex = inMemoryReturnTypes.findIndex(
      (t) => t.id.toLowerCase() === typeDef.id.toLowerCase() || t.nome.toLowerCase() === typeDef.nome.toLowerCase()
    );

    const now = new Date().toISOString();
    const updatedItem: ReturnTypeDefinition = {
      ...typeDef,
      id: typeDef.id.trim(),
      nome: typeDef.nome.trim(),
      icone: typeDef.icone.trim() || '📦',
      updatedAt: now,
      createdAt: typeDef.createdAt || now,
    };

    let updatedList: ReturnTypeDefinition[];
    if (existingIndex >= 0) {
      updatedList = [...inMemoryReturnTypes];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        ...updatedItem,
      };
    } else {
      updatedList = [
        ...inMemoryReturnTypes,
        {
          ...updatedItem,
          ordem: (inMemoryReturnTypes.length || 0) + 1,
        },
      ];
    }

    inMemoryReturnTypes = updatedList;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}

    notifyListeners();

    // Sincroniza em background com Firestore
    saveSettingToFirestore(FIRESTORE_SETTING_KEY, updatedList).catch((err) => {
      console.warn('Falha silenciosa ao sincronizar tipos com Firestore:', err);
    });

    return [...updatedList];
  },

  /**
   * Exclui um tipo de devolução
   */
  async deleteReturnType(id: string): Promise<ReturnTypeDefinition[]> {
    const updatedList = inMemoryReturnTypes.filter((t) => t.id !== id && t.nome !== id);
    inMemoryReturnTypes = updatedList;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}

    notifyListeners();

    saveSettingToFirestore(FIRESTORE_SETTING_KEY, updatedList).catch(() => {});

    return [...updatedList];
  },

  /**
   * Restaura os 6 tipos oficiais padrão de fábrica
   */
  async resetToDefaults(): Promise<ReturnTypeDefinition[]> {
    inMemoryReturnTypes = [...DEFAULT_RETURN_TYPES];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RETURN_TYPES));
    } catch {}

    notifyListeners();

    saveSettingToFirestore(FIRESTORE_SETTING_KEY, DEFAULT_RETURN_TYPES).catch(() => {});

    return [...DEFAULT_RETURN_TYPES];
  },

  /**
   * Inscreve um ouvinte para atualizações reativas na UI
   */
  subscribe(callback: (types: ReturnTypeDefinition[]) => void): () => void {
    listeners.push(callback);
    callback([...inMemoryReturnTypes]);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
};
