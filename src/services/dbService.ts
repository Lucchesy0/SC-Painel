import { SC, AuditLogEntry, ThemeMode, Equipment, MainModule, SCItem } from '../types';
import { syncService } from './syncService';
import {
  saveSCToFirestore,
  deleteSCFromFirestore,
  bulkUploadSCsToFirestore,
  saveEquipmentToFirestore,
  deleteEquipmentFromFirestore,
  fetchAllSCsFromFirestore,
  getSCFromFirestore,
  clearSCsInFirestore,
  fetchAllEquipmentsFromFirestore,
  bulkUploadEquipmentsToFirestore,
  clearEquipmentsInFirestore,
  fetchSettingFromFirestore,
  saveSettingToFirestore,
} from './firebase';
import {
  getAllSCsFromIDB,
  saveSCToIDB,
  bulkSaveSCsToIDB,
  replaceSCsInIDB,
  clearSCsFromIDB,
  deleteSCFromIDB,
  clearIDB,
  getSettingFromIDB,
  saveSettingToIDB,
  getAllEquipmentsFromIDB,
  saveEquipmentToIDB,
  replaceEquipmentsInIDB,
  deleteEquipmentFromIDB,
} from '../utils/indexedDB';

/**
 * Helper to generate current timestamp string in Portuguese locale format
 */
function getFormattedTimestamp(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} às ${timeStr}`;
}

export const dbService = {
  /**
   * Buscar todas as solicitações (Firebase Firestore em tempo real com fallback em cache local)
   */
  async getSCs(): Promise<SC[]> {
    try {
      const cloudData = await fetchAllSCsFromFirestore();
      if (cloudData && cloudData.length > 0) {
        // Atualiza cache local silenciosamente para suporte offline
        replaceSCsInIDB(cloudData).catch(() => {});
        return cloudData;
      }
      // Se a nuvem estiver vazia, verifica se há dados no cache local para subir
      const localData = await getAllSCsFromIDB();
      if (localData && localData.length > 0) {
        bulkUploadSCsToFirestore(localData).catch(() => {});
        return localData;
      }
      return cloudData || [];
    } catch (err) {
      console.warn('Firestore offline ou inacessível, utilizando cache local:', err);
      return await getAllSCsFromIDB();
    }
  },

  /**
   * Criar nova solicitação diretamente no Firebase Firestore
   */
  async createSC(scData: Omit<SC, 'id'>, authorName?: string): Promise<SC> {
    const timestamp = getFormattedTimestamp();
    const creationAudit: AuditLogEntry = {
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      dataHora: timestamp,
      tipo: 'Criação',
      descricao: `Solicitação ${scData.numero} criada no sistema com ${scData.itens?.length || 0} item(ns)`,
      usuario: authorName || scData.solicitante || 'Sistema',
    };

    // Normaliza os itens garantindo quantidades
    const normalizedItens: SCItem[] = (scData.itens || []).map((it) => {
      const qtd = it.quantidadeSolicitada ?? it.quantidade ?? 1;
      return {
        ...it,
        quantidade: qtd,
        quantidadeSolicitada: qtd,
      };
    });

    const newSC: SC = {
      ...scData,
      id: 'sc-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      itens: normalizedItens,
      ultimaAlteracao: {
        dataHora: timestamp,
        tipo: 'Criação da Solicitação',
        usuario: authorName || scData.solicitante || 'Sistema',
      },
      historicoAuditoria: [creationAudit],
    };

    // Salvar primariamente no Firestore com tolerância a falhas offline
    try {
      await saveSCToFirestore(newSC);
    } catch (cloudErr) {
      console.warn('Falha na gravação em nuvem (Firestore), mantendo em cache local seguro:', cloudErr);
    }

    // Cache local de segurança
    await saveSCToIDB(newSC).catch(() => {});
    syncService.broadcast('sc_created', newSC);
    return newSC;
  },

  /**
   * Atualizar solicitação existente no Firebase Firestore
   */
  async updateSC(id: string, scData: Omit<SC, 'id'>, authorName?: string): Promise<SC> {
    // Tenta buscar o registro existente no Firestore ou no cache
    let existing: SC | null = null;
    try {
      existing = await getSCFromFirestore(id);
    } catch {
      // ignore
    }
    if (!existing) {
      const all = await getAllSCsFromIDB();
      existing = all.find((item) => item.id === id) || null;
    }

    const timestamp = getFormattedTimestamp();

    let tipo = 'Edição de Dados';
    let descricao = 'Informações da solicitação atualizadas';

    if (existing) {
      if (existing.status !== scData.status) {
        tipo = 'Alteração de Status';
        descricao = `Status alterado de "${existing.status}" para "${scData.status}"`;
      } else if (existing.itens.length !== scData.itens.length) {
        tipo = 'Atualização de Itens';
        descricao = `Quantidade de itens alterada de ${existing.itens.length} para ${scData.itens.length}`;
      } else if (existing.prioridade !== scData.prioridade) {
        tipo = 'Alteração de Prioridade';
        descricao = `Prioridade alterada para ${scData.prioridade || 'Média'}`;
      }
    }

    const newAuditEntry: AuditLogEntry = {
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      dataHora: timestamp,
      tipo,
      descricao,
      usuario: authorName || scData.solicitante || 'Sistema',
    };

    const previousHistory = existing?.historicoAuditoria || [];

    const updatedSC: SC = {
      ...scData,
      id,
      ultimaAlteracao: {
        dataHora: timestamp,
        tipo,
        usuario: authorName || scData.solicitante || 'Sistema',
      },
      historicoAuditoria: [newAuditEntry, ...previousHistory],
    };

    // Salvar no Firebase Firestore com fallback offline
    try {
      await saveSCToFirestore(updatedSC);
    } catch (cloudErr) {
      console.warn('Falha na atualização em nuvem (Firestore), mantendo em cache local seguro:', cloudErr);
    }

    // Cache local e sincronização
    await saveSCToIDB(updatedSC).catch(() => {});
    syncService.broadcast('sc_updated', updatedSC);
    return updatedSC;
  },

  /**
   * Salvar SC diretamente com objeto completo no Firestore
   */
  async saveSC(sc: SC): Promise<SC> {
    try {
      await saveSCToFirestore(sc);
    } catch (cloudErr) {
      console.warn('Falha na gravação em nuvem (Firestore), mantendo em cache local seguro:', cloudErr);
    }
    await saveSCToIDB(sc).catch(() => {});
    syncService.broadcast('sc_updated', sc);
    return sc;
  },

  /**
   * Excluir solicitação do Firebase Firestore
   */
  async deleteSC(id: string): Promise<boolean> {
    try {
      await deleteSCFromFirestore(id);
      deleteSCFromIDB(id).catch(() => {});
      syncService.broadcast('sc_deleted', { id });
      return true;
    } catch (err) {
      console.error('Erro ao excluir SC do Firestore:', err);
      return false;
    }
  },

  /**
   * Importar / Adicionar múltiplas solicitações ao Firestore em lote
   */
  async bulkCreateSCs(scs: SC[]): Promise<number> {
    await bulkUploadSCsToFirestore(scs);
    bulkSaveSCsToIDB(scs).catch(() => {});
    syncService.broadcast('sc_bulk_created', { count: scs.length });
    return scs.length;
  },

  /**
   * Substituir todas as solicitações (importação completa / overwrite no Firestore)
   */
  async replaceAllSCs(scs: SC[]): Promise<number> {
    await bulkUploadSCsToFirestore(scs);
    replaceSCsInIDB(scs).catch(() => {});
    syncService.broadcast('sc_replaced', { count: scs.length });
    return scs.length;
  },

  /**
   * Limpar solicitações de compra do Firestore
   */
  async clearSCs(): Promise<boolean> {
    try {
      await clearSCsInFirestore();
      await clearSCsFromIDB();
      syncService.broadcast('sc_cleared');
      return true;
    } catch (err) {
      console.error('Erro ao limpar SCs no Firestore:', err);
      return false;
    }
  },

  /**
   * Limpar todas as tabelas no Firestore e localmente
   */
  async clearAll(): Promise<boolean> {
    try {
      await Promise.all([clearSCsInFirestore(), clearEquipmentsInFirestore()]);
      await clearIDB();
      syncService.broadcast('db_cleared');
      return true;
    } catch (err) {
      console.error('Erro ao limpar banco de dados geral:', err);
      return false;
    }
  },

  /**
   * Equipment Operations (Inventário de TI no Firestore)
   */
  async getEquipments(): Promise<Equipment[]> {
    try {
      const cloudData = await fetchAllEquipmentsFromFirestore();
      if (cloudData && cloudData.length > 0) {
        replaceEquipmentsInIDB(cloudData).catch(() => {});
        return cloudData;
      }
      const local = await getAllEquipmentsFromIDB();
      if (local && local.length > 0) {
        bulkUploadEquipmentsToFirestore(local).catch(() => {});
        return local;
      }
      return cloudData || [];
    } catch (err) {
      console.warn('Firestore inacessível para equipamentos, usando cache local:', err);
      return await getAllEquipmentsFromIDB();
    }
  },

  async saveEquipment(eq: Equipment): Promise<Equipment> {
    await saveEquipmentToFirestore(eq);
    saveEquipmentToIDB(eq).catch(() => {});
    syncService.broadcast('equipment_saved', eq);
    return eq;
  },

  async deleteEquipment(id: string): Promise<boolean> {
    try {
      await deleteEquipmentFromFirestore(id);
      deleteEquipmentFromIDB(id).catch(() => {});
      syncService.broadcast('equipment_deleted', { id });
      return true;
    } catch (err) {
      console.error('Erro ao excluir equipamento do Firestore:', err);
      return false;
    }
  },

  async bulkCreateEquipments(equipments: Equipment[]): Promise<number> {
    const current = await this.getEquipments();
    const merged = [...equipments, ...current];
    await bulkUploadEquipmentsToFirestore(merged);
    replaceEquipmentsInIDB(merged).catch(() => {});
    syncService.broadcast('equipment_saved', { bulk: true });
    return merged.length;
  },

  async replaceAllEquipments(equipments: Equipment[]): Promise<number> {
    await bulkUploadEquipmentsToFirestore(equipments);
    replaceEquipmentsInIDB(equipments).catch(() => {});
    syncService.broadcast('equipment_saved', { replaced: true });
    return equipments.length;
  },

  async clearEquipments(): Promise<boolean> {
    try {
      await clearEquipmentsInFirestore();
      await replaceEquipmentsInIDB([]);
      syncService.broadcast('equipment_deleted', { all: true });
      return true;
    } catch (err) {
      console.error('Erro ao limpar equipamentos no Firestore:', err);
      return false;
    }
  },

  /**
   * Configuração de tema sincronizada com o Firebase Firestore
   */
  async getTheme(): Promise<ThemeMode | null> {
    try {
      const saved = await fetchSettingFromFirestore<ThemeMode>('theme');
      if (saved) return saved;
    } catch {
      // ignore
    }
    const local = await getSettingFromIDB<ThemeMode>('theme');
    if (local) return local;
    return (localStorage.getItem('theme') as ThemeMode) || null;
  },

  async saveTheme(theme: ThemeMode): Promise<ThemeMode> {
    saveSettingToFirestore('theme', theme).catch(() => {});
    saveSettingToIDB('theme', theme).catch(() => {});
    localStorage.setItem('theme', theme);
    return theme;
  },

  /**
   * Módulo ativo persistido no Firestore
   */
  async getActiveModule(): Promise<MainModule | null> {
    try {
      const saved = await fetchSettingFromFirestore<MainModule>('active_module');
      if (saved) return saved;
    } catch {
      // ignore
    }
    return await getSettingFromIDB<MainModule>('active_module');
  },

  async saveActiveModule(module: MainModule): Promise<MainModule> {
    saveSettingToFirestore('active_module', module).catch(() => {});
    saveSettingToIDB('active_module', module).catch(() => {});
    return module;
  },
};
