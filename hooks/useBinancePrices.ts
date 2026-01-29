import { useState, useEffect, useRef } from 'react';

// CoinGecko ID Map for common assets
const COIN_GECKO_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'XRP': 'ripple',
    'BNB': 'binancecoin',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'XLM': 'stellar',
    'ALGO': 'algorand'
};

const POLLING_INTERVAL = 15000; // 15 seconds (Safe for CoinGecko Free Tier)

export const useBinancePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Refs for lifecycle management
  const isMountedRef = useRef<boolean>(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    
    // 1. Map Pairs to CoinGecko IDs
    // Input: ["BTC/USDT", "ETH/USDT"] -> IDs: ["bitcoin", "ethereum"]
    const requestedIds: string[] = [];
    const idToSymbolMap: Record<string, string> = {};

    pairs.forEach(pair => {
        const rawSymbol = pair.split('/')[0].toUpperCase(); // "BTC"
        const geckoId = COIN_GECKO_MAP[rawSymbol];
        
        if (geckoId) {
            requestedIds.push(geckoId);
            // Map "bitcoin" back to "BTCUSDT" for the app to consume
            idToSymbolMap[geckoId] = `${rawSymbol}USDT`;
        }
    });

    // If no valid pairs, exit
    if (requestedIds.length === 0) return;

    const fetchPrices = async () => {
        // Strict Lifecycle Check
        if (!isMountedRef.current) return;

        // Create abort controller for this specific request
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const idsParam = requestedIds.join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;

            const response = await fetch(url, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Exponential Backoff Handling
            if (response.status === 429) {
                console.warn("CoinGecko Rate Limit Hit (429). Backing off.");
                throw new Error('RATE_LIMIT');
            }

            if (!response.ok) {
                throw new Error(`HTTP_ERROR_${response.status}`);
            }

            const data = await response.json();
            
            // Transform Data: { "bitcoin": { "usd": 95000 } } -> { "BTCUSDT": 95000 }
            const newPrices: Record<string, number> = {};
            
            Object.keys(data).forEach(geckoId => {
                const appSymbol = idToSymbolMap[geckoId];
                if (appSymbol && data[geckoId].usd) {
                    newPrices[appSymbol] = data[geckoId].usd;
                }
            });

            if (isMountedRef.current) {
                setPrices(prev => ({ ...prev, ...newPrices }));
                retryCountRef.current = 0; // Reset backoff on success
                
                // Schedule next poll
                timeoutRef.current = setTimeout(fetchPrices, POLLING_INTERVAL);
            }

        } catch (error: any) {
            if (error.name === 'AbortError') return;

            // Calculate Backoff: 2s, 4s, 8s, 16s... Max 60s
            const delay = Math.min(2000 * (2 ** retryCountRef.current), 60000);
            retryCountRef.current += 1;

            console.log(`Price Fetch Error: ${error.message}. Retrying in ${delay}ms...`);

            if (isMountedRef.current) {
                timeoutRef.current = setTimeout(fetchPrices, delay);
            }
        }
    };

    // Start Polling
    fetchPrices();

    // Cleanup Function
    return () => {
        isMountedRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [JSON.stringify(pairs)]); // Deep compare pairs

  return prices;
};