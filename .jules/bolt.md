## 2024-05-22 - [Optimized Price Polling and Component Rendering]
**Learning:** High-frequency polling (1s) of public APIs like CoinGecko in a top-level React hook causes massive performance degradation due to both network rate-limiting (429s) and unnecessary re-renders of the entire component tree.
**Action:** Increased polling interval to 15s and added a state update guard in the hook to only trigger re-renders if prices actually changed. Memoized key components (SignalCard, Sidebar, BottomNav) to further insulate the UI from these updates.
