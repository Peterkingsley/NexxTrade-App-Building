import { useState, useEffect, useRef, useCallback } from 'react';

export const useBinancePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);
  const retryDelay = useRef<number>(3000); // Start with 3s delay

  // Format pairs for Binance stream
  const getStreams = useCallback(() => {
    return pairs
      .map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((p) => p && !p.includes('locked') && p.length > 3)
      .map((p) => `${p}@aggTrade`);
  }, [pairs]);

  useEffect(() => {
    const streams = getStreams();
    if (streams.length === 0) return;

    const connect = () => {
        // Clear any existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Use standard SSL port 443 instead of 9443 to avoid firewall issues
        // Binance Stream Limit: max 1024 streams per connection
        const streamString = streams.join('/');
        const wsUrl = `wss://stream.binance.com:443/stream?streams=${streamString}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // console.log('Connected to Binance Live Prices via Port 443');
          // Reset backoff on successful connection
          retryDelay.current = 3000;
        };

        ws.onmessage = (event) => {
          try {
              const message = JSON.parse(event.data);
              // Format: { stream: "btcusdt@aggTrade", data: { s: "BTCUSDT", p: "123.45", ... } }
              if (message.data && message.data.s && message.data.p) {
                const symbol = message.data.s; 
                const price = parseFloat(message.data.p);

                setPrices((prev) => {
                     // Optimization: Only update state if price actually changes significantly
                     // or purely relying on React's diffing (here we just update)
                     return { ...prev, [symbol]: price };
                });
              }
          } catch (e) {
              // Silent fail on parse error
          }
        };

        ws.onclose = () => {
            // Exponential Backoff for Reconnect
            // console.log(`WS Disconnected. Retrying in ${retryDelay.current}ms`);
            
            reconnectTimeout.current = setTimeout(() => {
                connect();
                // Increase delay for next time, cap at 30s
                retryDelay.current = Math.min(retryDelay.current * 1.5, 30000);
            }, retryDelay.current);
        };

        ws.onerror = (err) => {
            console.warn('Binance WS Error (switching to backoff):', err);
            ws.close(); // Trigger onclose to handle reconnect
        };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [JSON.stringify(pairs)]); // Re-connect only if pairs list changes

  return prices;
};