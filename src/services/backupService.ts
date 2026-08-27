import { SC, Equipment } from '../types';
import { dbService } from './dbService';

export interface FullBackupPayload {
  appName: string;
  version: string;
  timestamp: string;
  dataHoraFormatada: string;
  motivoAlteracao: string;
  estatisticas: {
    totalSCs: number;
    totalEquipamentos: number;
  };
  dados: {
    solicitacoes: SC[];
    equipamentos: Equipment[];
    settings?: {
      theme?: string | null;
      activeModule?: string | null;
    };
  };
}

/**
 * Gera e dispara o download do arquivo JSON completo do IndexedDB quando solicitado pelo usuário
 */
export async function downloadIDBBackupFile(
  motivo = 'Backup Manual'
): Promise<{ filename: string; payload: FullBackupPayload }> {
  const [scs, equipments, theme, activeModule] = await Promise.all([
    dbService.getSCs(),
    dbService.getEquipments(),
    dbService.getTheme(),
    dbService.getActiveModule(),
  ]);

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const pad = (n: number) => String(n).padStart(2, '0');
  const fileDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const fileTime = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const filename = `MCM_Backup_${fileDate}_${fileTime}.json`;

  const payload: FullBackupPayload = {
    appName: 'MCM Industrial - Gestão & Inventário',
    version: '2.0',
    timestamp: now.toISOString(),
    dataHoraFormatada: `${dateFormatted} às ${timeFormatted}`,
    motivoAlteracao: motivo,
    estatisticas: {
      totalSCs: scs.length,
      totalEquipamentos: equipments.length,
    },
    dados: {
      solicitacoes: scs,
      equipamentos: equipments,
      settings: {
        theme,
        activeModule,
      },
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  }, 300);

  return { filename, payload };
}

