import { SC, SCReminderInfo, SCReminderUrgency, NotificationSettings } from '../types';

const NOTIFICATION_SETTINGS_KEY = 'mcm_notification_settings';
const NOTIFIED_LOG_KEY = 'mcm_notified_sc_history';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  browserNotificationsEnabled: false,
  notifyDueSoonDays: 3,
  notifyOverdue: true,
  soundEnabled: true,
};

/**
 * Retorna o prazo padrão em dias a partir da prioridade caso não haja dataVencimento explícita.
 */
export function getDefaultSlaDays(prioridade?: 'Baixa' | 'Média' | 'Alta' | 'Urgente'): number {
  switch (prioridade) {
    case 'Urgente':
      return 2;
    case 'Alta':
      return 4;
    case 'Média':
      return 7;
    case 'Baixa':
      return 15;
    default:
      return 7;
  }
}

/**
 * Calcula a data de vencimento efetiva da solicitação de compra.
 */
export function getEffectiveDueDate(sc: SC): string {
  if (sc.dataVencimento && sc.dataVencimento.trim()) {
    return sc.dataVencimento;
  }
  if (!sc.data) return '';

  const startDate = new Date(sc.data + 'T00:00:00');
  if (isNaN(startDate.getTime())) return sc.data;

  const slaDays = getDefaultSlaDays(sc.prioridade);
  const dueDate = new Date(startDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Calcula o status de lembrete e urgência da SC.
 */
export function calculateSCReminderInfo(sc: SC, dueSoonThreshold = 3): SCReminderInfo {
  if (sc.status === 'Concluído') {
    return {
      sc,
      urgency: 'concluida',
      diasRestantes: 0,
      dataVencimentoEfetiva: getEffectiveDueDate(sc),
      mensagem: 'Solicitação concluída',
    };
  }

  const effectiveDueDateStr = getEffectiveDueDate(sc);
  if (!effectiveDueDateStr) {
    return {
      sc,
      urgency: 'normal',
      diasRestantes: 99,
      dataVencimentoEfetiva: '',
      mensagem: 'Sem prazo estipulado',
    };
  }

  // Compara com a data atual (zerando horário para comparação precisa por dia)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(effectiveDueDateStr + 'T00:00:00');
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let urgency: SCReminderUrgency = 'normal';
  let mensagem = '';

  if (diffDays < 0) {
    urgency = 'atrasada';
    const atraso = Math.abs(diffDays);
    mensagem = atraso === 1 ? 'Atrasada há 1 dia' : `Atrasada há ${atraso} dias`;
  } else if (diffDays === 0) {
    urgency = 'hoje';
    mensagem = 'Vence hoje!';
  } else if (diffDays <= dueSoonThreshold) {
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

/**
 * Obtém configurações salvas no localStorage
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Salva configurações no localStorage
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Falha ao salvar configurações de notificação:', err);
  }
}

/**
 * Verifica se a API de Notificações do Navegador é suportada
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retorna a permissão atual de notificação do navegador
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão para notificações nativas do navegador
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificações:', err);
    return 'denied';
  }
}

/**
 * Emite som de aviso sutil usando Web Audio API sem necessidade de arquivos externos
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio errors if context is blocked
  }
}

/**
 * Dispara uma notificação nativa do navegador se houver permissão
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      icon: '/logo-mcm.svg',
      badge: '/logo-mcm.svg',
      tag: options?.tag || 'mcm-sc-alert',
      ...options,
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    return true;
  } catch (err) {
    console.warn('Erro ao emitir notificação nativa:', err);
    return false;
  }
}

/**
 * Verifica as solicitações e emite alerta caso existam itens vencidos ou vencendo hoje/em breve.
 * Evita repetição excessiva gravando histórico por dia.
 */
export function checkAndNotifyUrgentSCs(
  scs: SC[],
  settings: NotificationSettings,
  onOpenSC?: (sc: SC) => void
): { overdueCount: number; dueSoonCount: number; todayCount: number } {
  const reminders = scs.map((sc) => calculateSCReminderInfo(sc, settings.notifyDueSoonDays));

  const overdueList = reminders.filter((r) => r.urgency === 'atrasada');
  const todayList = reminders.filter((r) => r.urgency === 'hoje');
  const dueSoonList = reminders.filter((r) => r.urgency === 'breve');

  const overdueCount = overdueList.length;
  const todayCount = todayList.length;
  const dueSoonCount = dueSoonList.length;

  const totalUrgent = overdueCount + todayCount + dueSoonCount;

  // Se notificações nativas estiverem habilitadas e permitidas
  if (
    settings.browserNotificationsEnabled &&
    isBrowserNotificationSupported() &&
    Notification.permission === 'granted' &&
    totalUrgent > 0
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const logKey = `${NOTIFICATION_SETTINGS_KEY}_sent_${todayStr}`;

    // Checa se já notificou hoje
    const alreadyNotified = sessionStorage.getItem(logKey);
    if (!alreadyNotified) {
      sessionStorage.setItem(logKey, 'true');

      let title = 'MCM Montagens - Lembretes de SC';
      let body = '';

      if (todayCount > 0 && overdueCount > 0) {
        body = `Atenção: ${todayCount} SC(s) vencem hoje e ${overdueCount} estão atrasadas!`;
      } else if (todayCount > 0) {
        body = `Atenção: ${todayCount} solicitação(ões) de compra vencem hoje!`;
      } else if (overdueCount > 0) {
        body = `Aviso: Existem ${overdueCount} solicitação(ões) com prazo vencido.`;
      } else if (dueSoonCount > 0) {
        body = `${dueSoonCount} solicitação(ões) de compra estão próximas do vencimento.`;
      }

      sendBrowserNotification(title, {
        body,
        tag: 'mcm-sc-due-summary',
        onClick: () => {
          if (todayList.length > 0 && onOpenSC) {
            onOpenSC(todayList[0].sc);
          } else if (overdueList.length > 0 && onOpenSC) {
            onOpenSC(overdueList[0].sc);
          } else if (dueSoonList.length > 0 && onOpenSC) {
            onOpenSC(dueSoonList[0].sc);
          }
        },
      });

      if (settings.soundEnabled) {
        playNotificationSound();
      }
    }
  }

  return {
    overdueCount,
    todayCount,
    dueSoonCount,
  };
}
