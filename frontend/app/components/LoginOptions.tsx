'use client';

import { usePrivy, useLoginWithEmail, useLoginWithSiwe, useWallets } from '@privy-io/react-auth';
import { useState } from 'react';

export default function LoginOptions() {
  const { login } = usePrivy();
  const { wallets } = useWallets();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();
  const { generateSiweMessage, loginWithSiwe, state: siweState } = useLoginWithSiwe();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            ResearchGPT
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-powered research with x402 payments
          </p>
        </div>

        {/* Email Login */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Login with Email</h2>
          <p className="text-sm text-gray-600 mb-4">
            We'll create an embedded wallet for you automatically
          </p>
          
          {emailState.status === 'initial' || emailState.status === 'error' ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3 text-gray-900 bg-white"
              />
              <button
                onClick={() => sendCode({ email })}
                disabled={emailState.status === 'sending-code' || !email}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailState.status === 'sending-code' ? 'Sending...' : 'Send Code'}
              </button>
              {emailState.status === 'error' && emailState.error && (
                <p className="mt-2 text-sm text-red-600">{emailState.error.message}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Code sent to {email}. Check your email.
              </p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3 text-gray-900 bg-white"
                maxLength={6}
              />
              <button
                onClick={() => loginWithCode({ code })}
                disabled={emailState.status === 'submitting-code' || !code}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailState.status === 'submitting-code' ? 'Verifying...' : 'Verify Code'}
              </button>
              {emailState.status === 'error' && emailState.error && (
                <p className="mt-2 text-sm text-red-600">{emailState.error.message}</p>
              )}
            </>
          )}
        </div>

        {/* Wallet Login */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Login with Wallet</h2>
          <button
            onClick={async () => {
              if (!wallets || !wallets[0]) {
                await login();
                return;
              }
              
              try {
                const message = await generateSiweMessage({
                  address: wallets[0].address,
                  chainId: 'eip155:8453', // Base
                });
                
                const signature = await wallets[0].sign(message);
                await loginWithSiwe({ signature, message });
              } catch (error) {
                console.error('Wallet login error:', error);
              }
            }}
            disabled={siweState.status !== 'initial' && siweState.status !== 'error'}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {siweState.status === 'generating-message' ? 'Generating...' : 
             siweState.status === 'awaiting-signature' ? 'Sign in wallet...' :
             siweState.status === 'submitting-signature' ? 'Logging in...' :
             'Connect Wallet'}
          </button>
          {siweState.status === 'error' && siweState.error && (
            <p className="mt-2 text-sm text-red-600">{siweState.error.message}</p>
          )}
        </div>

        {/* Quick Login (Privy Modal) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Quick Login</h2>
          <button
            onClick={login}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Open Privy Login
          </button>
        </div>
      </div>
    </div>
  );
}

