import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      resetSettings();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'general'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                General
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'appearance'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Palette className="h-4 w-4 inline mr-2" />
                Appearance
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'notifications'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Bell className="h-4 w-4 inline mr-2" />
                Notifications
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Currency
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSettings({ currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {CURRENCIES.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.flag} {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        This will be used as the default currency for new prices
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                        <option value="pt">Português</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                        <option value="ar">العربية</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="light"
                            checked={settings.theme === 'light'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'light' })}
                            className="mr-2"
                          />
                          Light
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="dark"
                            checked={settings.theme === 'dark'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'dark' })}
                            className="mr-2"
                          />
                          Dark
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="system"
                            checked={settings.theme === 'system'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'system' })}
                            className="mr-2"
                          />
                          System (follows your device settings)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications}
                          onChange={(e) => updateSettings({ notifications: e.target.checked })}
                          className="mr-2"
                        />
                        Enable notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Get notified about price changes and deals
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;