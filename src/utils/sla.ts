import { useState, useEffect } from 'react';
import { SC, SlaSettings, SCReminderInfo, SCReminderUrgency } from '../types';
import { calcDays } from './storage';
import { saveSettingToIDB, getSettingFromIDB } from './indexedDB';

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  slaDaysWarning: 7,
  criticalOverdueDays: 15,
};

const SLA_STORAGE_KEY = 'mcm_sla_config';
const LEGACY_WARNING_DAYS_KEY = 'mcm_setting_sla_days';
const LEGACY_CRITICAL_DAYS_KEY = 'mcm_setting_critical_days';

/**
 * Lê as configurações de SLA de forma síncrona do localStorage
 * com fallback inteligente para chaves legadas e valores padrão.
 */
export function getSlaSettings(): SlaSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SLA_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(SLA_STORAGE_KEY);
    const legacyWarning = Number(localStorage.getItem(LEGACY_WARNING_DAYS_KEY));
    const legacyCritical = Number(localStorage.getItem(LEGACY_CRITICAL_DAYS_KEY));

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SlaSettings>;
      const warningVal =
        typeof parsed.slaDaysWarning === 'number' && parsed.slaDaysWarning > 0
          ? parsed.slaDaysWarning
          : !isNaN(legacyWarning) && legacyWarning > 0
          ? legacyWarning
          : DEFAULT_SLA_SETTINGS.slaDaysWarning;

      const criticalVal =
        typeof parsed.criticalOverdueDays === 'number' && parsed.criticalOverdueDays > 0
          ? parsed.criticalOverdueDays
          : !isNaN(legacyCritical) && legacyCritical > 0
          ? legacyCritical
          : DEFAULT_SLA_SETTINGS.criticalOverdueDays;

      return {
        slaDaysWarning: warningVal,
        criticalOverdueDays: criticalVal,
      };
    }

    // Se ainda não existir no JSON consolidado, verifica chaves legadas individuais
    const slaWarning = !isNaN(legacyWarning) && legacyWarning > 0 ? legacyWarning : DEFAULT_SLA_SETTINGS.slaDaysWarning;
    const slaCritical = !isNaN(legacyCritical) && legacyCritical > 0 ? legacyCritical : DEFAULT_SLA_SETTINGS.criticalOverdueDays;

    return {
      slaDaysWarning: slaWarning,
      criticalOverdueDays: slaCritical,
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações de SLA:', err);
    return { ...DEFAULT_SLA_SETTINGS };
  }
}

/**
 * Salva as configurações de SLA no localStorage, sincroniza chaves legadas e IndexedDB,
 * e notifica toda a aplicação reativamente em tempo real via CustomEvent.
 */
export function saveSlaSettings(newSettings: Partial<SlaSettings>): SlaSettings {
  const current = getSlaSettings();
  const merged: SlaSettings = {
    slaDaysWarning:
      typeof newSettings.slaDaysWarning === 'number' && newSettings.slaDaysWarning > 0
        ? Math.round(newSettings.slaDaysWarning)
        : current.slaDaysWarning,
    criticalOverdueDays:
      typeof newSettings.criticalOverdueDays === 'number' && newSettings.criticalOverdueDays > 0
        ? Math.round(newSettings.criticalOverdueDays)
        : current.criticalOverdueDays,
  };

  try {
    localStorage.setItem(SLA_STORAGE_KEY, JSON.stringify(merged));
    localStorage.setItem(LEGACY_WARNING_DAYS_KEY, String(merged.slaDaysWarning));
    localStorage.setItem(LEGACY_CRITICAL_DAYS_KEY, String(merged.criticalOverdueDays));

    // Salva no IndexedDB de forma assíncrona
    saveSettingToIDB('sla_config', merged).catch(() => {});

    // Dispara evento para atualização imediata dos componentes React
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<SlaSettings>('mcm_sla_updated', { detail: merged }));
    }
  } catch (err) {
    console.error('Falha ao salvar configurações de SLA:', err);
  }

  return merged;
}

/**
 * Hook do React para consumir as configurações de SLA com atualização em tempo real
 */
export function useSlaSettings(): SlaSettings {
  const [settings, setSettings] = useState<SlaSettings>(getSlaSettings);

  useEffect(() => {
    // Apenas sincroniza com o IndexedDB se localStorage não tiver sido configurado
    if (!localStorage.getItem(SLA_STORAGE_KEY) && !localStorage.getItem(LEGACY_WARNING_DAYS_KEY)) {
      getSettingFromIDB<SlaSettings>('sla_config').then((idbSettings) => {
        if (idbSettings && typeof idbSettings.slaDaysWarning === 'number') {
          setSettings(idbSettings);
          try {
            localStorage.setItem(SLA_STORAGE_KEY, JSON.stringify(idbSettings));
            localStorage.setItem(LEGACY_WARNING_DAYS_KEY, String(idbSettings.slaDaysWarning));
            localStorage.setItem(LEGACY_CRITICAL_DAYS_KEY, String(idbSettings.criticalOverdueDays));
          } catch {}
        }
      }).catch(() => {});
    }

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SlaSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getSlaSettings());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === SLA_STORAGE_KEY ||
        e.key === LEGACY_WARNING_DAYS_KEY ||
        e.key === LEGACY_CRITICAL_DAYS_KEY
      ) {
        setSettings(getSlaSettings());
      }
    };

    window.addEventListener('mcm_sla_updated', handleUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('mcm_sla_updated', handleUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return settings;
}

/**
 * Retorna o prazo padrão em dias a partir da configuração geral de SLA.
 */
export function getDefaultSlaDays(
  _prioridade?: 'Baixa' | 'Média' | 'Alta' | 'Urgente',
  settings?: SlaSettings
): number {
  const sla = settings || getSlaSettings();
  return sla.slaDaysWarning || 7;
}

/**
 * Calcula a data de vencimento efetiva da solicitação de compra considerando o SLA configurado.
 */
export function getEffectiveDueDate(sc: SC, settings?: SlaSettings): string {
  if (sc.dataVencimento && sc.dataVencimento.trim()) {
    return sc.dataVencimento;
  }
  if (!sc.data) return '';

  let startDate: Date;
  if (sc.data.includes('/')) {
    const parts = sc.data.split('/');
    startDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  } else {
    startDate = new Date(sc.data.includes('T') ? sc.data : sc.data + 'T00:00:00');
  }

  if (isNaN(startDate.getTime())) return sc.data;

  const slaDays = (settings || getSlaSettings()).slaDaysWarning;
  const dueDate = new Date(startDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Verifica se uma SC está em atraso, respeitando o limite geral configurado de SLA (ex: 15 dias)
 */
export function isSCDelayed(sc: SC, settings?: SlaSettings): boolean {
  if (sc.status === 'Concluído') return false;

  const sla = settings || getSlaSettings();
  const dias = sc.diasEmAberto ?? calcDays(sc.data, sc.status);

  // Se tem data limite manual especificada na SC
  if (sc.dataVencimento && sc.dataVencimento.trim()) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(sc.dataVencimento.includes('T') ? sc.dataVencimento : sc.dataVencimento + 'T00:00:00');
    due.setHours(0, 0, 0, 0);
    if (!isNaN(due.getTime()) && due.getTime() < today.getTime()) {
      return true;
    }
  }

  // Verifica o prazo geral configurado (ex: 15 dias)
  return dias > sla.slaDaysWarning;
}

/**
 * Verifica se uma SC está em atraso crítico (alerta vermelho escuro)
 */
export function isSCCriticalOverdue(sc: SC, settings?: SlaSettings): boolean {
  if (sc.status === 'Concluído') return false;

  const sla = settings || getSlaSettings();
  const dias = sc.diasEmAberto ?? calcDays(sc.data, sc.status);
  return dias > sla.criticalOverdueDays;
}

/**
 * Verifica se uma SC está vencendo em breve (alerta amarelo preventivo)
 */
export function isSCDueSoon(sc: SC, settings?: SlaSettings): boolean {
  if (sc.status === 'Concluído') return false;

  const sla = settings || getSlaSettings();
  const dias = sc.diasEmAberto ?? calcDays(sc.data, sc.status);

  // Se já está atrasada, não é "vencendo em breve"
  if (isSCDelayed(sc, sla)) return false;

  // Janela preventiva: ex. para warning 15d, entre 11 e 15 dias. Para warning 7d, entre 4 e 7 dias.
  const windowDays = Math.max(2, Math.min(5, Math.ceil(sla.slaDaysWarning * 0.3)));
  const minThreshold = Math.max(1, sla.slaDaysWarning - windowDays);

  return dias >= minThreshold && dias <= sla.slaDaysWarning;
}

/**
 * Calcula todas as métricas de lembrete e urgência da SC usando as regras de SLA ativas.
 */
export function calculateSCReminderInfo(
  sc: SC,
  customDueSoonThreshold?: number,
  settings?: SlaSettings
): SCReminderInfo {
  if (sc.status === 'Concluído') {
    return {
      sc,
      urgency: 'concluida',
      diasRestantes: 0,
      dataVencimentoEfetiva: getEffectiveDueDate(sc, settings),
      mensagem: 'Solicitação concluída',
    };
  }

  const sla = settings || getSlaSettings();
  const effectiveDueDateStr = getEffectiveDueDate(sc, sla);
  const diasAberto = sc.diasEmAberto ?? calcDays(sc.data, sc.status);

  if (!effectiveDueDateStr) {
    return {
      sc,
      urgency: 'normal',
      diasRestantes: 99,
      dataVencimentoEfetiva: '',
      mensagem: 'Sem prazo estipulado',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(effectiveDueDateStr.includes('T') ? effectiveDueDateStr : effectiveDueDateStr + 'T00:00:00');
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = isSCDelayed(sc, sla) || diffDays < 0;

  let urgency: SCReminderUrgency = 'normal';
  let mensagem = '';

  if (isOverdue) {
    urgency = 'atrasada';
    const atraso = diasAberto > sla.slaDaysWarning ? diasAberto - sla.slaDaysWarning : Math.abs(diffDays);
    mensagem = atraso <= 1 ? 'Atrasada há 1 dia' : `Atrasada há ${atraso} dias`;
  } else if (diffDays === 0) {
    urgency = 'hoje';
    mensagem = 'Vence hoje!';
  } else if (isSCDueSoon(sc, sla) || (typeof customDueSoonThreshold === 'number' && diffDays <= customDueSoonThreshold)) {
    urgency = 'breve';
    mensagem = diffDays === 1 ? 'Vence amanhã' : `Vence em ${diffDays} dias`;
  } else {
    urgency = 'normal';
    mensagem = `Vence em ${diffDays} dias`;
  }

  return {
    sc,
    urgency,
    diasRestantes: diffDays,
    dataVencimentoEfetiva: effectiveDueDateStr,
    mensagem,
  };
}
