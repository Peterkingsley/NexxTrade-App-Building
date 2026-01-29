import { useState, useEffect, useRef } from 'react';

export const useBinancePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<any>(null);

  useEffect(() => {
    // 1. Format pairs for Binance stream (e.g., "BTC/USDT" -> "btcusdt")
    // Filter out pairs that are "Locked" or invalid or too short to be a pair
    const formattedPairs = pairs
      .map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((p) => p && !p.includes('locked') && p.length > 3);

    if (formattedPairs.length === 0) return;

    const connect = () => {
        // Use aggTrade for real-time trade data
        const streams = formattedPairs.map((p) => `${p}@aggTrade`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          // console.log('Connected to Binance Live Prices');
        };

        ws.onmessage = (event) => {
          try {
              const message = JSON.parse(event.data);
              // aggTrade format: { stream: "btcusdt@aggTrade", data: { s: "BTCUSDT", p: "123.45", ... } }
              if (message.data && message.data.s && message.data.p) {
                const symbol = message.data.s; 
                const price = parseFloat(message.data.p);

                setPrices((prev) => {
                     // Simple optimization to avoid rerenders if price is identical
                     if (prev[symbol] === price) return prev;
                     return { ...prev, [symbol]: price };
                });
              }
          } catch (e) {
              // Ignore parse errors
          }
        };

        ws.onclose = () => {
            // console.log('Binance WS disconnected. Reconnecting...');
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error('Binance WS Error (Price Feed):', err);
            ws.close();
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
  }, [JSON.stringify(pairs)]); 

  return prices;
};