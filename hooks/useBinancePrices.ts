import { useState, useEffect, useRef } from 'react';

export const useBinancePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Format pairs for Binance stream (e.g., "BTC/USDT" -> "btcusdt")
    // Filter out pairs that are "Locked" or invalid
    const formattedPairs = pairs
      .map((p) => p.toLowerCase().replace('/', ''))
      .filter((p) => p && !p.includes('locked'));

    if (formattedPairs.length === 0) return;

    // 2. Construct Stream URL
    // Format: wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade
    const streams = formattedPairs.map((p) => `${p}@trade`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    // 3. Connect
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('Connected to Binance Live Prices');
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // message.data.s is the symbol (e.g., BTCUSDT)
      // message.data.p is the price string
      if (message.data && message.data.s && message.data.p) {
        const symbol = message.data.s; // e.g. "BTCUSDT"
        const price = parseFloat(message.data.p);

        // Map back to our format "BTC/USDT" implies checking how we stored keys
        // To make it easy, we store keys as "BTCUSDT" (uppercase, no slash)
        // The UI will have to strip the slash from its pair to look this up.
        setPrices((prev) => ({
          ...prev,
          [symbol]: price,
        }));
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [JSON.stringify(pairs)]); // Re-connect if pairs change

  return prices;
};