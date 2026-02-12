import React, { useState } from 'react'
import { User, Settings, LogOut, Moon, Sun, Monitor, Key, ChevronDown } from '@geist-ui/icons'
import { Button, Text } from '@geist-ui/core'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import SettingsModal from './SettingsModal'
import ChangePasswordModal from './ChangePasswordModal'

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const { user, signOut } = useAuth()
  const { isDark, theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  if (!user) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <User size={16} color="white" />
        </div>
        <span style={{ 
          display: 'none', 
          fontSize: '14px', 
          fontWeight: 500 
        }}>
          {user.user_metadata?.full_name || user.email?.split('@')[0]}
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10
            }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            right: 0,
            marginTop: '8px',
            width: '224px',
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95))',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 20
          }}>
            <div style={{ padding: '4px 0' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Text b style={{ fontSize: '14px', marginBottom: '4px' }}>
                  {user.user_metadata?.full_name || 'User'}
                </Text>
                <Text small style={{ opacity: 0.6 }}>{user.email}</Text>
              </div>
              
              {/* Theme Selector */}
              <div style={{ padding: '8px 16px' }}>
                <Text small style={{ 
                  opacity: 0.6, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  Theme
                </Text>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setTheme('light')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(theme === 'light' ? {
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93C5FD'
                      } : {
                        backgroundColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.6)'
                      })
                    }}
                  >
                    <Sun size={12} />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(theme === 'dark' ? {
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93C5FD'
                      } : {
                        backgroundColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.6)'
                      })
                    }}
                  >
                    <Moon size={12} />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      ...(theme === 'system' ? {
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93C5FD'
                      } : {
                        backgroundColor: 'transparent',
                        color: 'rgba(255, 255, 255, 0.6)'
                      })
                    }}
                  >
                    <Monitor size={12} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
              
              <div style={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
                margin: '4px 0' 
              }}></div>
              
              <button
                onClick={() => {
                  setShowSettings(true)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
              >
                <Settings size={16} style={{ marginRight: '8px' }} />
                Settings
              </button>
              
              <button
                onClick={() => {
                  setShowChangePassword(true)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
              >
                <Key size={16} style={{ marginRight: '8px' }} />
                Change Password
              </button>
              
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: '#EF4444'
                }}
              >
                <LogOut size={16} style={{ marginRight: '8px' }} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
      
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}

export default UserMenu