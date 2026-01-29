import { useState, useEffect, useRef, useCallback } from 'react';

const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';
const HEARTBEAT_INTERVAL = 10000; // Check every 10 seconds
const CONNECTION_TIMEOUT = 5000; // Wait 5 seconds for connection to stabilize before resetting backoff

export const useCoinbasePrices = (pairs: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Refs for state management without triggering re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const connectionStabilizerRef = useRef<any>(null);

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
    isMountedRef.current = true;
    const coinbasePairs = getCoinbasePairs();

    // Cleanup function to close socket and clear timers
    const cleanup = () => {
        if (wsRef.current) {
            // Remove listeners to prevent zombie callbacks
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;
            wsRef.current.onopen = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (connectionStabilizerRef.current) clearTimeout(connectionStabilizerRef.current);
    };

    if (coinbasePairs.length === 0) return cleanup;

    const connect = () => {
        // Prevent double connections
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const ws = new WebSocket(COINBASE_WS_URL);
        wsRef.current = ws;
        lastMessageTimeRef.current = Date.now(); // Reset watchdog

        ws.onopen = () => {
            if (!isMountedRef.current) {
                ws.close();
                return;
            }
            // console.log('Coinbase WS Connected');
            
            // Subscribe logic
            const subscribeMsg = {
                type: "subscribe",
                product_ids: coinbasePairs,
                channels: ["ticker"] // Using ticker channel for lightweight price updates
            };
            ws.send(JSON.stringify(subscribeMsg));

            // Start Heartbeat Monitor
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = setInterval(() => {
                const now = Date.now();
                // If no message for 15 seconds, assume dead connection
                if (now - lastMessageTimeRef.current > 15000) {
                    console.warn("Coinbase WS: No heartbeat received. Forcing reconnect.");
                    ws.close(); // This triggers onclose
                }
            }, HEARTBEAT_INTERVAL);

            // If connection stays alive for 5 seconds, reset the backoff counter
            connectionStabilizerRef.current = setTimeout(() => {
                retryCountRef.current = 0;
            }, CONNECTION_TIMEOUT);
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;
            
            // Update heartbeat timestamp
            lastMessageTimeRef.current = Date.now();

            try {
                const message = JSON.parse(event.data);
                
                // Handle Ticker Update
                // { type: "ticker", product_id: "BTC-USDT", price: "90000.00", ... }
                if (message.type === 'ticker' && message.product_id && message.price) {
                    const internalSymbol = message.product_id.replace('-', '').toUpperCase();
                    const price = parseFloat(message.price);

                    setPrices((prev) => {
                        // Only update if price changed to avoid excessive renders
                        if (prev[internalSymbol] === price) return prev;
                        return { ...prev, [internalSymbol]: price };
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        };

        ws.onclose = (event) => {
            if (!isMountedRef.current) return;

            // Clear stability timer so we don't reset retries if it failed quickly
            if (connectionStabilizerRef.current) clearTimeout(connectionStabilizerRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            wsRef.current = null;

            // Log specific error codes for debugging
            if (event.code !== 1000) {
                console.warn(`Coinbase WS Closed. Code: ${event.code}, Reason: ${event.reason}`);
                if (event.code === 429) {
                    console.error("Coinbase Rate Limit Hit. Backing off significantly.");
                }
            }

            // Exponential Backoff Strategy
            // 1st retry: 1s, 2nd: 2s, 3rd: 4s, 4th: 8s... max 30s
            const delay = Math.min(1000 * (2 ** retryCountRef.current), 30000);
            retryCountRef.current += 1;

            // console.log(`Reconnecting in ${delay}ms... (Attempt ${retryCountRef.current})`);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        ws.onerror = (err) => {
            // Just log, onclose will handle the retry logic
            // console.error('Coinbase WS Error', err);
        };
    };

    connect();

    return () => {
        isMountedRef.current = false;
        cleanup();
    };
  }, [JSON.stringify(pairs)]); // Deep compare pairs to prevent unnecessary reconnects

  return prices;
};