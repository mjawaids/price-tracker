import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Palette, Bell, RotateCcw } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { CURRENCIES } from '../utils/currency';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications'>('general');

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      resetSettings();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Render modal at body level using portal
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999] animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="glass-card rounded-t-3xl sm:rounded-2xl w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/20 flex-shrink-0 safe-top">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-3 sm:p-2 text-white/40 hover:text-white/80 transition-colors duration-200 rounded-lg hover:bg-white/10 touch-target active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-full sm:w-64 bg-white/5 backdrop-blur-sm border-b sm:border-b-0 sm:border-r border-white/20 flex-shrink-0 overflow-y-auto">
            <nav className="p-3 sm:p-4 space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 min-h-[48px] active:scale-95 ${
                  activeTab === 'general'
                    ? 'bg-blue-500/20 text-blue-300 shadow-md'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-3" />
                General
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 min-h-[48px] active:scale-95 ${
                  activeTab === 'appearance'
                    ? 'bg-blue-500/20 text-blue-300 shadow-md'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Palette className="h-4 w-4 inline mr-3" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 min-h-[48px] active:scale-95 ${
                  activeTab === 'notifications'
                    ? 'bg-blue-500/20 text-blue-300 shadow-md'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Bell className="h-4 w-4 inline mr-3" />
                Notifications
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {activeTab === 'general' && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">General Settings</h3>
                    
                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Default Currency
                        </label>
                        <select
                          value={settings.currency}
                          onChange={(e) => updateSettings({ currency: e.target.value })}
                          className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white transition-all duration-200 min-h-[48px]"
                        >
                          {CURRENCIES.map(currency => (
                            <option key={currency.code} value={currency.code} className="bg-gray-900 text-white">
                              {currency.flag} {currency.name} ({currency.symbol})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-white/60 mt-2">
                          This will be used as the default currency for new prices
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          Language
                        </label>
                        <select
                          value={settings.language}
                          onChange={(e) => updateSettings({ language: e.target.value })}
                          className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 backdrop-blur-sm text-white transition-all duration-200 min-h-[48px]"
                        >
                          <option value="en" className="bg-gray-900 text-white">🇺🇸 English</option>
                          <option value="es" className="bg-gray-900 text-white">🇪🇸 Español</option>
                          <option value="fr" className="bg-gray-900 text-white">🇫🇷 Français</option>
                          <option value="de" className="bg-gray-900 text-white">🇩🇪 Deutsch</option>
                          <option value="it" className="bg-gray-900 text-white">🇮🇹 Italiano</option>
                          <option value="pt" className="bg-gray-900 text-white">🇵🇹 Português</option>
                          <option value="zh" className="bg-gray-900 text-white">🇨🇳 中文</option>
                          <option value="ja" className="bg-gray-900 text-white">🇯🇵 日本語</option>
                          <option value="ko" className="bg-gray-900 text-white">🇰🇷 한국어</option>
                          <option value="ar" className="bg-gray-900 text-white">🇸🇦 العربية</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Appearance Settings</h3>
                    
                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-3">
                          Theme
                        </label>
                        <div className="space-y-3">
                          <label className="flex items-center p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all duration-200 cursor-pointer min-h-[56px] active:scale-95">
                            <input
                              type="radio"
                              value="light"
                              checked={settings.theme === 'light'}
                              onChange={(e) => updateSettings({ theme: e.target.value as 'light' })}
                              className="mr-3 text-blue-500 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium text-white">Light</div>
                              <div className="text-sm text-white/60">Always use light theme</div>
                            </div>
                          </label>
                          <label className="flex items-center p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all duration-200 cursor-pointer min-h-[56px] active:scale-95">
                            <input
                              type="radio"
                              value="dark"
                              checked={settings.theme === 'dark'}
                              onChange={(e) => updateSettings({ theme: e.target.value as 'dark' })}
                              className="mr-3 text-blue-500 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium text-white">Dark</div>
                              <div className="text-sm text-white/60">Always use dark theme</div>
                            </div>
                          </label>
                          <label className="flex items-center p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all duration-200 cursor-pointer min-h-[56px] active:scale-95">
                            <input
                              type="radio"
                              value="system"
                              checked={settings.theme === 'system'}
                              onChange={(e) => updateSettings({ theme: e.target.value as 'system' })}
                              className="mr-3 text-blue-500 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium text-white">System</div>
                              <div className="text-sm text-white/60">Follow your device settings</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Notification Settings</h3>
                    
                    <div className="space-y-4 sm:space-y-6">
                      <div className="p-4 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm min-h-[72px] active:scale-95 transition-transform">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications}
                            onChange={(e) => updateSettings({ notifications: e.target.checked })}
                            className="mt-1 text-blue-500 focus:ring-blue-500 rounded"
                          />
                          <div>
                            <div className="font-medium text-white">Enable notifications</div>
                            <p className="text-sm text-white/60 mt-1">
                              Get notified about price changes and deals
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reset Button */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/20 safe-bottom">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center space-x-2 px-4 py-3 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all duration-200 w-full sm:w-auto min-h-[48px] active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;