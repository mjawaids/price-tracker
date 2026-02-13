import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff } from '@geist-ui/icons'
import { Card, Button, Text } from '@geist-ui/core'
import { useAuth } from '../contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}

type AuthMode = 'signin' | 'signup' | 'forgot'

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { signIn, signUp, resetPassword } = useAuth()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setMessage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
        handleClose()
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: 'Passwords do not match' })
          return
        }
        if (password.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
          return
        }
        await signUp(email, password, fullName)
        handleClose()
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setMessage({ 
          type: 'success', 
          text: 'Password reset email sent! Check your inbox and follow the instructions.' 
        })
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    fontSize: '1rem',
    backgroundColor: 'white',
    color: '#000'
  };

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <Card style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        maxWidth: '28rem',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <Text h3 style={{ margin: 0 }}>
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </Text>
          <Button
            icon={<X />}
            auto
            scale={0.8}
            px={0.6}
            onClick={handleClose}
            type="abort"
          />
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {message && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? '#16a34a' : '#dc2626',
              border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {message.text}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</Text>
              <input
                style={inputStyle}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div>
            <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Email</Text>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Password</Text>
              <div style={{ position: 'relative' }}>
                <input
                  style={{...inputStyle, paddingRight: '3rem'}}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <Text small b style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password</Text>
              <div style={{ position: 'relative' }}>
                <input
                  style={{...inputStyle, paddingRight: '3rem'}}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          <Button
            htmlType="submit"
            loading={loading}
            type="secondary"
            width="100%"
            style={{
              background: 'linear-gradient(to right, #2563eb, #9333ea)',
              color: 'white'
            }}
          >
            {mode === 'signin' ? 'Sign In' : 
             mode === 'signup' ? 'Create Account' : 
             'Send Reset Email'}
          </Button>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mode === 'signin' && (
              <>
                <Button
                  auto
                  type="abort"
                  scale={0.75}
                  onClick={() => setMode('forgot')}
                  style={{ textDecoration: 'underline' }}
                >
                  Forgot your password?
                </Button>
                <Text small style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                  Don't have an account?{' '}
                  <span
                    onClick={() => setMode('signup')}
                    style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                  >
                    Sign up
                  </span>
                </Text>
              </>
            )}
            
            {mode === 'signup' && (
              <Text small style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                Already have an account?{' '}
                <span
                  onClick={() => setMode('signin')}
                  style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                >
                  Sign in
                </span>
              </Text>
            )}
            
            {mode === 'forgot' && (
              <Text small style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                Remember your password?{' '}
                <span
                  onClick={() => setMode('signin')}
                  style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                >
                  Sign in
                </span>
              </Text>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AuthModal