'use client';

import { useState, useEffect } from 'react';
import { useX402Fetch, useWallets, usePrivy, useCreateWallet } from '@privy-io/react-auth';

export default function ResearchForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { wrapFetchWithPayment } = useX402Fetch();

  // Try to create wallet if authenticated but no wallet exists (only once)
  const [walletCreationAttempted, setWalletCreationAttempted] = useState(false);
  
  useEffect(() => {
    if (authenticated && (!wallets || wallets.length === 0) && !walletCreationAttempted) {
      console.log('No wallet found, attempting to create embedded wallet...');
      setWalletCreationAttempted(true);
      createWallet()
        .then(() => {
          console.log('✅ Embedded wallet created successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to create wallet:', error);
          setWalletCreationAttempted(false); // Allow retry on error
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, wallets?.length, walletCreationAttempted]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async function handleResearch() {
    if (!authenticated) {
      setError('Please login first');
      return;
    }

    if (!wallets || !wallets[0]) {
      setError('No wallet available. Please wait for wallet to be created.');
      return;
    }
    
    const wallet = wallets[0];

    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Starting research request...');
      console.log(`Using wallet: ${wallet.address} (${wallet.walletClientType})`);
      
      // Step 1: Backend proxies x402 call (handles CORS issue)
      // Note: Currently uses agent's wallet due to CORS limitations
      // TODO: Implement user wallet payment delegation in future
      console.log('Calling backend x402 proxy (handles CORS)...');
      const x402Response = await fetch(`${apiUrl}/api/x402-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          walletAddress: wallet.address,
        }),
      });

      if (!x402Response.ok) {
        const errorText = await x402Response.text();
        throw new Error(`x402 request failed: ${x402Response.status} ${errorText}`);
      }

      const x402Result = await x402Response.json();
      const researchData = x402Result.researchData;
      console.log('Research data received:', researchData);

      // Step 2: Send to backend for AI processing
      console.log('Sending to backend for processing...');
      const processedResponse = await fetch(`${apiUrl}/api/process-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          researchData,
          walletAddress: wallet.address,
        }),
      });

      if (!processedResponse.ok) {
        const errorText = await processedResponse.text();
        throw new Error(`Backend processing failed: ${processedResponse.status} ${errorText}`);
      }

      const processed = await processedResponse.json();
      setResult(processed.result || processed.data || JSON.stringify(processed, null, 2));
      console.log('Research complete!');
    } catch (error: any) {
      console.error('Research error:', error);
      setError(error.message || 'An error occurred during research');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* User Info Card */}
      {authenticated && user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Logged in as:</span>{' '}
            {user.email?.address || user.wallet?.address || 'User'}
          </p>
          {wallets && wallets[0] && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">Wallet:</span>{' '}
              {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
              {wallets[0].walletClientType === 'privy' && ' (Embedded Wallet)'}
            </p>
          )}
        </div>
      )}

      {/* Research Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Research Query</h2>
        
        <div className="mb-4">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to research?
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            rows={4}
            placeholder="e.g., What are the latest trends in AI and machine learning?"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleResearch}
          disabled={loading || !authenticated || !wallets || !wallets[0] || !query.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Research...
            </span>
          ) : (
            'Research (Pay with USDC)'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {(!wallets || !wallets[0]) && authenticated && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 mb-2">
              Waiting for wallet to be created... This usually takes a few seconds.
            </p>
            <button
              onClick={() => {
                createWallet()
                  .then(() => console.log('Wallet created'))
                  .catch((err) => console.error('Failed to create wallet:', err));
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Click here to create wallet manually
            </button>
          </div>
        )}
        
        {wallets && wallets[0] && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 mb-2">
              <span className="font-medium">✅ Wallet Ready!</span>
            </p>
            <p className="text-xs text-green-700 mb-2">
              <span className="font-medium">Wallet Address:</span>{' '}
              <code className="bg-green-100 px-2 py-1 rounded">{wallets[0].address}</code>
            </p>
            <p className="text-xs text-green-700">
              <span className="font-medium">To fund this wallet:</span>
              <br />
              1. Send <strong>USDC on Base Mainnet</strong> to the address above
              <br />
              2. You can bridge USDC from Ethereum using{' '}
              <a href="https://bridge.base.org/" target="_blank" rel="noopener noreferrer" className="underline">
                Base Bridge
              </a>
              {' '}or buy USDC on a DEX that supports Base
              <br />
              3. Once funded, you can make research requests that will automatically pay with x402
              <br />
              <br />
              <span className="text-[10px] text-gray-600">
                💡 Typical cost: ~$0.10-$1.00 per research request. No gas fees required (facilitator pays gas).
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Research Results</h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-md overflow-auto">
              {result}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

