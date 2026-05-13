'use client';

import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1a1a1f',
            color: '#f5f5f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#3dffc0', secondary: '#1a1a1f' },
          },
          error: {
            iconTheme: { primary: '#ff4d6d', secondary: '#1a1a1f' },
          },
        }}
      />
    </AuthProvider>
  );
}
