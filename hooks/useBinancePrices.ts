import { useState, useEffect, useRef, useCallback } from 'react';

export const useCoinbasePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);
  const retryDelay = useRef<number>(3000); // Start with 3s delay

  // Format pairs for Coinbase: "BTC/USDT" -> "BTC-USDT"
  const getCoinbasePairs = useCallback(() => {
    return pairs
      .map((p) => {
          const upper = p.toUpperCase();
          // Coinbase uses dashes (BTC-USD, BTC-USDT)
          if (upper.includes('/')) return upper.replace('/', '-');
          return upper;
      })
      .filter((p) => p && !p.includes('LOCKED'));
  }, [pairs]);

  useEffect(() => {
    const coinbasePairs = getCoinbasePairs();
    if (coinbasePairs.length === 0) return;

    const connect = () => {
        // Clear any existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Coinbase Exchange WebSocket Public Feed
        const wsUrl = 'wss://ws-feed.exchange.coinbase.com';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            // console.log('Connected to Coinbase Live Prices');
            retryDelay.current = 3000;
            
            // Subscribe to ticker channel
            const subscribeMsg = {
                type: "subscribe",
                product_ids: coinbasePairs,
                channels: ["ticker"]
            };
            ws.send(JSON.stringify(subscribeMsg));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                // Handle Ticker Update
                // { type: "ticker", product_id: "BTC-USDT", price: "90000.00", ... }
                if (message.type === 'ticker' && message.product_id && message.price) {
                    // Convert "BTC-USDT" -> "BTCUSDT" to match the keys the App expects
                    const internalSymbol = message.product_id.replace('-', '').toUpperCase();
                    const price = parseFloat(message.price);

                    setPrices((prev) => ({ ...prev, [internalSymbol]: price }));
                }
            } catch (e) {
                // Ignore parse errors
            }
        };

        ws.onclose = () => {
             // Exponential Backoff for Reconnect
            // console.log(`Coinbase WS Disconnected. Retrying in ${retryDelay.current}ms`);
            reconnectTimeout.current = setTimeout(() => {
                connect();
                // Increase delay for next time, cap at 30s
                retryDelay.current = Math.min(retryDelay.current * 1.5, 30000);
            }, retryDelay.current);
        };

        ws.onerror = (err) => {
            console.warn('Coinbase WS Error:', err);
            ws.close();
        };
    };

    connect();

    return () => {
        if (wsRef.current) wsRef.current.close();
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [JSON.stringify(pairs)]); 

  return prices;
};