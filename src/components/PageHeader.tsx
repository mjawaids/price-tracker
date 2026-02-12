import React from 'react';
import { ShoppingCart } from '@geist-ui/icons';
import { Spacer, Text } from '@geist-ui/core';

interface PageHeaderProps {
  title: string;
  description?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <>
      {/* Navigation */}
      <nav style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                height: '32px',
                width: '32px',
                background: 'linear-gradient(to right, #3b82f6, #9333ea)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingCart size={20} style={{ color: 'white' }} />
              </div>
              <Text span style={{ marginLeft: '8px', fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>SpendLess</Text>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a
                href="/"
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Back to App
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(147, 51, 234, 0.2))',
        backdropFilter: 'blur(4px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', padding: '3rem 1rem' }}>
          <Text h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 1rem 0' }}>{title}</Text>
          {description && (
            <Text p style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', maxWidth: '672px', margin: 0 }}>{description}</Text>
          )}
        </div>
      </div>
    </>
  );
};

export default PageHeader;