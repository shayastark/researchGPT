'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
          config={{
            // Enable multiple login methods
            loginMethods: ['email', 'wallet'],
            
            // Auto-create embedded wallets for users without wallets
            embeddedWallets: {
              createOnLogin: 'users-without-wallets',
            },
            
            appearance: {
              theme: 'light',
              accentColor: '#3b82f6',
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}

