import React, { useState } from 'react'
import { User, Settings, LogOut, ChevronDown, Moon, Sun, Monitor, Key } from 'lucide-react'
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 backdrop-blur-sm"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <User className="h-4 w-4 text-white" />
        </div>
        <span className="hidden sm:inline text-sm font-medium">
          {user.user_metadata?.full_name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-20 animate-scale-in">
            <div className="py-1">
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              
              {/* Theme Selector */}
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Theme</p>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                      theme === 'light' 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Sun className="h-3 w-3" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                      theme === 'dark' 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Moon className="h-3 w-3" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                      theme === 'system' 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1"></div>
              
              <button
                onClick={() => {
                  setShowSettings(true)
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              
              <button
                onClick={() => {
                  setShowChangePassword(true)
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </button>
              
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
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