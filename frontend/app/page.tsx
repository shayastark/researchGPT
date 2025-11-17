'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import LoginOptions from './components/LoginOptions';
import ResearchForm from './components/ResearchForm';

export default function Home() {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {!authenticated ? (
        <LoginOptions />
      ) : (
        <div>
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <h1 className="text-xl font-bold text-gray-900">ResearchGPT</h1>
                <UserInfo />
              </div>
            </div>
          </nav>
          <ResearchForm />
        </div>
      )}
    </main>
  );
}

function UserInfo() {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {user?.email?.address || 
           user?.wallet?.address?.slice(0, 6) + '...' + user?.wallet?.address?.slice(-4) ||
           'User'}
        </p>
        {wallets && wallets[0] && (
          <div className="text-xs">
            <p className="text-gray-500">
              {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
              {wallets[0].walletClientType === 'privy' && ' (Embedded)'}
            </p>
            <p className="text-gray-400 mt-1 font-mono text-[10px]">
              {wallets[0].address}
            </p>
          </div>
        )}
      </div>
      <button
        onClick={logout}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        Disconnect
      </button>
    </div>
  );
}

