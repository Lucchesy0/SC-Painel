import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Settings,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Sliders,
  Send,
  HelpCircle,
  Package,
} from 'lucide-react';
import { SC, NotificationSettings } from '../types';
import {
  calculateSCReminderInfo,
  getNotificationSettings,
  saveNotificationSettings,
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  playNotificationSound,
} from '../services/notificationService';
import { formatDateBR } from '../utils/storage';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scs: SC[];
  onSelectSC: (sc: SC) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TabType = 'urgentes' | 'todas' | 'config';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  scs,
  onSelectSC,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('urgentes');
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (isOpen) {
      setSettings(getNotificationSettings());
      setPermissionState(getBrowserNotificationPermission());
    }
  }, [isOpen]);

  const reminders = useMemo(() => {
    return scs.map((sc) => calculateSCReminderInfo(sc, settings.notifyDueSoonDays));
  }, [scs, settings.notifyDueSoonDays]);

  // Grupos
  const overdueList = useMemo(() => reminders.filter((r) => r.urgency === 'atrasada'), [reminders]);
  const todayList = useMemo(() => reminders.filter((r) => r.urgency === 'hoje'), [reminders]);
  const dueSoonList = useMemo(() => reminders.filter((r) => r.urgency === 'breve'), [reminders]);
  const normalList = useMemo(() => reminders.filter((r) => r.urgency === 'normal'), [reminders]);

  const urgentTotal = overdueList.length + todayList.length + dueSoonList.length;

  const handleRequestPermission = async () => {
    if (!isBrowserNotificationSupported()) {
      onToast('Seu navegador atual não suporta a API de Notificações.', 'error');
      return;
    }

    const perm = await requestBrowserNotificationPermission();
    setPermissionState(perm);

    if (perm === 'granted') {
      const updated = { ...settings, browserNotificationsEnabled: true };
      setSettings(updated);
      saveNotificationSettings(updated);
      onToast('Notificações do navegador ativadas com sucesso!', 'success');

      sendBrowserNotification('MCM Montagens - Notificações Ativadas', {
        body: 'Você receberá alertas automáticos sobre prazos e vencimentos de SCs.',
      });

      if (settings.soundEnabled) {
        playNotificationSound();
      }
    } else if (perm === 'denied') {
      onToast('Permissão de notificação negada no navegador. Habilite nos ajustes da página.', 'error');
    }
  };

  const handleTestNotification = () => {
    if (!isBrowserNotificationSupported()) {
      onToast('Notificações não são suportadas neste navegador.', 'error');
      return;
    }

    if (Notification.permission !== 'granted') {
      onToast('Por favor, autorize primeiro as notificações clicando em "Ativar Notificações".', 'info');
      handleRequestPermission();
      return;
    }

    const sampleText =
      urgentTotal > 0
        ? `Existem ${urgentTotal} solicitações de compra com atenção imediata ou vencimento próximo!`
        : 'Sistema de lembretes ativo e funcionando perfeitamente.';

    const sent = sendBrowserNotification('MCM Montagens - Teste de Lembrete', {
      body: sampleText,
    });

    if (settings.soundEnabled) {
      playNotificationSound();
    }

    if (sent) {
      onToast('Notificação de teste enviada com sucesso ao navegador!', 'success');
    } else {
      onToast('Não foi possível disparar a notificação. Verifique as permissões.', 'error');
    }
  };

  const handleSaveConfig = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
    onToast('Configurações de lembretes salvas.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1f2430] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600/80 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#181c25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Lembretes & Vencimentos
                {urgentTotal > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse">
                    {urgentTotal} pendência(s)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitoramento de prazos das Solicitações de Compra e alertas nativos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1d222d] border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 text-center">
            <div className="font-bold text-base sm:text-lg text-red-600 dark:text-red-400 font-mono">
              {overdueList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Atrasadas</div>
          </div>
          <div className="p-3 text-center">
            <div className="font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400 font-mono">
              {todayList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Vencem Hoje</div>
          </div>
          <div className="p-3 text-center">
            <div className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400 font-mono">
              {dueSoonList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Próximos {settings.notifyDueSoonDays} dias</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#181c25] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('urgentes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'urgentes'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Atenção Imediata</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white">
                {urgentTotal}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('todas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'todas'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Todas ({reminders.filter((r) => r.sc.status === 'Em andamento').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustes de Notificação</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[260px] custom-scrollbar">
          {activeTab === 'config' ? (
            /* Settings Tab */
            <div className="flex flex-col gap-4 text-xs">
              {/* Browser Notification Status Banner */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                    <Bell className="w-4 h-4 text-orange-500" />
                    <span>Notificações Nativas do Navegador</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        permissionState === 'granted'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : permissionState === 'denied'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {permissionState === 'granted'
                        ? 'Ativas (Permitidas)'
                        : permissionState === 'denied'
                        ? 'Bloqueadas pelo Navegador'
                        : 'Aguardando Permissão'}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Receba popups nativos na sua área de trabalho quando uma SC estiver vencendo ou atrasada.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {permissionState !== 'granted' ? (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-4 h-4" /> Ativar no Navegador
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 font-semibold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-orange-500" /> Testar Notificação
                    </button>
                  )}
                </div>
              </div>

              {/* Threshold Days Setting */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181c25] flex flex-col gap-3">
                <label className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                  <span>Alerta de Antecedência (Dias de Tolerância)</span>
                  <span className="font-mono text-orange-600 dark:text-orange-400">
                    {settings.notifyDueSoonDays} dia(s) antes
                  </span>
                </label>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Defina quantos dias antes da data limite da SC o sistema deve considerá-la em status "Próxima do Vencimento".
                </p>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {[1, 2, 3, 5, 7, 10].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleSaveConfig({ ...settings, notifyDueSoonDays: days })}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        settings.notifyDueSoonDays === days
                          ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {days} {days === 1 ? 'dia' : 'dias'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound and Alert Preferences */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181c25] flex flex-col gap-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Preferências de Alerta & Áudio
                </h4>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Sinal Sonoro de Alerta (Beep)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tocar som sutil ao disparar lembretes ou testes
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, soundEnabled: !settings.soundEnabled };
                      handleSaveConfig(updated);
                      if (updated.soundEnabled) playNotificationSound();
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      settings.soundEnabled ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Destacar Automaticamente SCs Atrasadas
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Exibir alertas prioritários de atraso em banner e badges
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleSaveConfig({ ...settings, notifyOverdue: !settings.notifyOverdue })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      settings.notifyOverdue ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        settings.notifyOverdue ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Reminders List (Urgentes or Todas) */
            (() => {
              const displayList =
                activeTab === 'urgentes'
                  ? reminders.filter((r) => r.urgency === 'atrasada' || r.urgency === 'hoje' || r.urgency === 'breve')
                  : reminders.filter((r) => r.sc.status === 'Em andamento');

              if (displayList.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-3 shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Tudo em dia!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                      {activeTab === 'urgentes'
                        ? 'Nenhuma solicitação de compra está com prazo vencido ou vencendo nos próximos dias.'
                        : 'Não há solicitações de compra pendentes no momento.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2.5">
                  {displayList.map((item) => {
                    const sc = item.sc;
                    const itemsCount = sc.itens?.length || 0;

                    let badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                    let borderColor = 'border-slate-200 dark:border-slate-700/60';
                    let icon = <Clock className="w-4 h-4 text-blue-500" />;

                    if (item.urgency === 'atrasada') {
                      badgeColor = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
                      borderColor = 'border-red-500/30 bg-red-500/5 dark:bg-red-950/10';
                      icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
                    } else if (item.urgency === 'hoje') {
                      badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
                      borderColor = 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10';
                      icon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
                    } else if (item.urgency === 'breve') {
                      badgeColor = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
                      borderColor = 'border-orange-500/20';
                      icon = <Clock className="w-4 h-4 text-orange-500" />;
                    }

                    return (
                      <div
                        key={sc.id || sc.numero}
                        onClick={() => {
                          onSelectSC(sc);
                          onClose();
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 bg-white dark:bg-[#181c25] hover:bg-slate-50 dark:hover:bg-[#1c2230] shadow-2xs ${borderColor}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                            {icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                SC #{sc.numero}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                {item.mensagem}
                              </span>

                              {sc.prioridade && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                  Prioridade {sc.prioridade}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                              <strong className="text-slate-700 dark:text-slate-200">Setor:</strong> {sc.solicitante}
                            </p>

                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <strong>Emissão:</strong> {formatDateBR(sc.data)}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-orange-500" />
                                <strong>Vencimento:</strong> {formatDateBR(item.dataVencimentoEfetiva)}
                              </span>
                              {itemsCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3 text-slate-400" />
                                  {itemsCount} item(ns)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                          <span className="hidden sm:inline">Ver detalhes</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#181c25] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Prazos calculados automaticamente pelo SLA e prioridade da SC</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
