import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Bell, RotateCcw } from '@geist-ui/icons';
import { Modal, Text, Button, Card } from '@geist-ui/core';
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '896px',
        maxHeight: '85vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text h3 my={0}>Settings</Text>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{
            width: '256px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '16px'
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('general')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  minHeight: '48px',
                  border: 'none',
                  cursor: 'pointer',
                  ...(activeTab === 'general' ? {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#93C5FD'
                  } : {
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.6)'
                  })
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} />
                  <span>General</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  minHeight: '48px',
                  border: 'none',
                  cursor: 'pointer',
                  ...(activeTab === 'appearance' ? {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#93C5FD'
                  } : {
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.6)'
                  })
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎨</span>
                  <span>Appearance</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  minHeight: '48px',
                  border: 'none',
                  cursor: 'pointer',
                  ...(activeTab === 'notifications' ? {
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#93C5FD'
                  } : {
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.6)'
                  })
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} />
                  <span>Notifications</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <Text h4 my={0} style={{ marginBottom: '16px' }}>General Settings</Text>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Text small style={{ opacity: 0.8 }}>Default Currency</Text>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSettings({ currency: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(8px)',
                          color: 'white',
                          fontSize: '14px',
                          minHeight: '48px',
                          cursor: 'pointer'
                        }}
                      >
                        {CURRENCIES.map(currency => (
                          <option key={currency.code} value={currency.code} style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                            {currency.flag} {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                      <Text small style={{ opacity: 0.6 }}>
                        This will be used as the default currency for new prices
                      </Text>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Text small style={{ opacity: 0.8 }}>Language</Text>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(8px)',
                          color: 'white',
                          fontSize: '14px',
                          minHeight: '48px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="en" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇺🇸 English</option>
                        <option value="es" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇪🇸 Español</option>
                        <option value="fr" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇫🇷 Français</option>
                        <option value="de" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇩🇪 Deutsch</option>
                        <option value="it" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇮🇹 Italiano</option>
                        <option value="pt" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇵🇹 Português</option>
                        <option value="zh" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇨🇳 中文</option>
                        <option value="ja" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇯🇵 日本語</option>
                        <option value="ko" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇰🇷 한국어</option>
                        <option value="ar" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🇸🇦 العربية</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <Text h4 my={0} style={{ marginBottom: '16px' }}>Appearance Settings</Text>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Text small style={{ opacity: 0.8 }}>Theme</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          cursor: 'pointer',
                          minHeight: '56px',
                          transition: 'all 0.2s'
                        }}>
                          <input
                            type="radio"
                            value="light"
                            checked={settings.theme === 'light'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'light' })}
                            style={{ marginRight: '12px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>Light</div>
                            <div style={{ fontSize: '14px', opacity: 0.6 }}>Always use light theme</div>
                          </div>
                        </label>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          cursor: 'pointer',
                          minHeight: '56px',
                          transition: 'all 0.2s'
                        }}>
                          <input
                            type="radio"
                            value="dark"
                            checked={settings.theme === 'dark'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'dark' })}
                            style={{ marginRight: '12px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>Dark</div>
                            <div style={{ fontSize: '14px', opacity: 0.6 }}>Always use dark theme</div>
                          </div>
                        </label>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          cursor: 'pointer',
                          minHeight: '56px',
                          transition: 'all 0.2s'
                        }}>
                          <input
                            type="radio"
                            value="system"
                            checked={settings.theme === 'system'}
                            onChange={(e) => updateSettings({ theme: e.target.value as 'system' })}
                            style={{ marginRight: '12px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>System</div>
                            <div style={{ fontSize: '14px', opacity: 0.6 }}>Follow your device settings</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <Text h4 my={0} style={{ marginBottom: '16px' }}>Notification Settings</Text>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(8px)',
                      minHeight: '72px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.notifications}
                          onChange={(e) => updateSettings({ notifications: e.target.checked })}
                          style={{ marginTop: '4px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, color: 'white' }}>Enable notifications</div>
                          <Text small style={{ opacity: 0.6, marginTop: '4px' }}>
                            Get notified about price changes and deals
                          </Text>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Button
                onClick={handleReset}
                type="error"
                ghost
                style={{ minHeight: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCcw size={16} />
                <span>Reset to Defaults</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;