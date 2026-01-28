import React, { useState, useMemo } from 'react';
import { MessageSquare, Bell, Ribbon, TrendingUp, Activity, BarChart2, ChevronDown, Target, Trophy, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, BarChart as RechartsBarChart, Bar } from 'recharts';
import { ViewState, Signal } from '../types';

interface PerformanceViewProps {
    onNavigate: (view: ViewState) => void;
    signals: Signal[];
    isLoading: boolean;
}

type TimeRange = 'Daily' | 'Weekly' | 'Monthly' | 'All Time';
type ChartType = 'Area' | 'Line' | 'Bar';

const PerformanceView: React.FC<PerformanceViewProps> = ({ onNavigate, signals, isLoading }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('All Time');
  const [chartType, setChartType] = useState<ChartType>('Area');

  // --- Data Calculation Logic ---

  const performanceData = useMemo(() => {
    const closedSignals = signals.filter(s => s.status === 'closed');
    
    // Sort by date (assuming closedAt exists, otherwise use createdAt logic or fallback)
    // If closedAt is missing, we can't chart accurately over time, but we'll try to use what we have.
    // For now, let's map index to time if date is missing for robustness.
    const sortedSignals = [...closedSignals].sort((a, b) => {
        const dateA = a.closedAt ? new Date(a.closedAt).getTime() : 0;
        const dateB = b.closedAt ? new Date(b.closedAt).getTime() : 0;
        return dateA - dateB;
    });

    // 1. Calculate Statistics
    const totalClosed = sortedSignals.length;
    const wins = sortedSignals.filter(s => s.pnl > 0).length;
    const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
    const netProfit = sortedSignals.reduce((acc, curr) => acc + curr.pnl, 0);

    // 2. Generate Equity Curve Data
    let cumulativePnl = 0;
    const equityCurve = sortedSignals.map((signal, index) => {
        cumulativePnl += signal.pnl;
        // Format Label
        let label = `Trade ${index + 1}`;
        if (signal.closedAt) {
            const date = new Date(signal.closedAt);
            if (timeRange === 'All Time') label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            else if (timeRange === 'Monthly') label = date.toLocaleDateString(undefined, { day: 'numeric' });
            else label = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        }
        
        return {
            name: label,
            value: Number(cumulativePnl.toFixed(2)),
            pair: signal.pair,
            pnl: signal.pnl
        };
    });

    // 3. Top Pairs Logic
    const pairStats: Record<string, { trades: number; pnl: number }> = {};
    sortedSignals.forEach(s => {
        if (!pairStats[s.pair]) pairStats[s.pair] = { trades: 0, pnl: 0 };
        pairStats[s.pair].trades += 1;
        pairStats[s.pair].pnl += s.pnl;
    });

    const topPairs = Object.entries(pairStats)
        .map(([pair, stats]) => ({ pair, ...stats }))
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5); // Top 5

    return {
        totalClosed,
        wins,
        winRate,
        netProfit,
        equityCurve,
        topPairs,
        hasData: totalClosed > 0
    };
  }, [signals, timeRange]);

  // Filter Chart Data based on Range (simplified for now as "All Time" is most robust without complex date grouping)
  // In a real app, this would filter `sortedSignals` before mapping to equityCurve.
  // For this demo, we'll use the full curve or slice it.
  const chartData = useMemo(() => {
      if (timeRange === 'All Time') return performanceData.equityCurve;
      // Simple slicing for demo purposes if dates aren't strictly aligned
      const len = performanceData.equityCurve.length;
      if (timeRange === 'Monthly') return performanceData.equityCurve.slice(Math.max(0, len - 30));
      if (timeRange === 'Weekly') return performanceData.equityCurve.slice(Math.max(0, len - 7));
      if (timeRange === 'Daily') return performanceData.equityCurve.slice(Math.max(0, len - 24)); // Last 24 trades
      return performanceData.equityCurve;
  }, [performanceData, timeRange]);

  const renderChart = () => {
      const commonProps = {
          data: chartData,
          margin: { top: 10, right: 0, left: -20, bottom: 0 }
      };

      if (chartType === 'Line') {
          return (
            <LineChart {...commonProps}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} interval="preserveStartEnd" minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} width={35} />
                <Tooltip 
                    contentStyle={{backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)'}} 
                    itemStyle={{color: 'var(--text-main)'}} 
                    labelStyle={{color: 'var(--text-muted)'}} 
                />
                <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10B981', strokeWidth: 0, r: 4 }} 
                    activeDot={{ r: 6 }} 
                    animationDuration={500} 
                />
            </LineChart>
          );
      }

      if (chartType === 'Bar') {
          return (
            <RechartsBarChart {...commonProps}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} interval="preserveStartEnd" minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} width={35} />
                <Tooltip 
                    cursor={{fill: 'var(--bg-surface)', opacity: 0.5}}
                    contentStyle={{backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)'}} 
                    itemStyle={{color: 'var(--text-main)'}} 
                    labelStyle={{color: 'var(--text-muted)'}} 
                />
                <Bar 
                    dataKey="value" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={500} 
                />
            </RechartsBarChart>
          );
      }

      // Default Area Chart
      return (
        <AreaChart {...commonProps}>
            <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text-muted)', fontSize: 10}}
                interval="preserveStartEnd"
                minTickGap={30}
            />
             <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text-muted)', fontSize: 10}}
                width={35}
            />
            <Tooltip 
                contentStyle={{backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)'}}
                itemStyle={{color: 'var(--text-main)'}}
                labelStyle={{color: 'var(--text-muted)'}}
            />
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                animationDuration={500}
            />
        </AreaChart>
      );
  };

  return (
    <div className="pb-24 md:pb-6">
      <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 transition-colors duration-300 border-b border-dark-800 md:border-none">
         <div className="md:hidden">
            <button className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition border border-transparent hover:border-dark-700">
                <MessageSquare size={20} />
            </button>
        </div>
        
        <h1 className="hidden md:block text-2xl font-bold text-white ml-2">Performance Analytics</h1>

        <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('notifications')} className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition border border-transparent hover:border-dark-700">
                <Bell size={20} />
            </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                <p className="text-gray-500 text-sm">Calculating performance metrics...</p>
            </div>
        ) : !performanceData.hasData ? (
            <div className="flex flex-col items-center justify-center py-20 bg-dark-800 rounded-2xl border border-dark-700 border-dashed">
                <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mb-4">
                    <AlertCircle className="text-gray-500" size={24} />
                </div>
                <h3 className="text-white font-bold text-lg">No Data Available</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-xs text-center">Performance data will appear here once trading signals are closed and settled.</p>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Stats Card */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden h-full text-white group flex flex-col justify-between">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            {/* Header Section */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/10 shadow-sm flex items-center gap-1">
                                            {timeRange}
                                        </span>
                                    </div>
                                    <p className="text-emerald-100 font-medium text-sm mt-2">Net Profit</p>
                                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mt-1 drop-shadow-sm">
                                        {performanceData.netProfit > 0 ? '+' : ''}{performanceData.netProfit.toFixed(2)}%
                                    </h1>
                                </div>
                                <div className="hidden md:flex flex-col items-end">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 mb-2">
                                        <TrendingUp size={24} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8">
                                <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                                    <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                        <Target size={14} />
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Win Rate</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">{performanceData.winRate}%</p>
                                </div>
                                
                                <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                                    <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                        <Activity size={14} />
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Trades</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">{performanceData.totalClosed}</p>
                                </div>

                                <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                                    <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                        <Trophy size={14} />
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Wins</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">{performanceData.wins}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Performing Pairs */}
                    <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700 transition-colors duration-300 shadow-sm h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <Ribbon className="text-emerald-500" />
                            <h3 className="text-white font-bold">Top Performing Pairs</h3>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            {performanceData.topPairs.length > 0 ? (
                                performanceData.topPairs.map((item, i) => (
                                    <div key={i} className="flex justify-between items-end border-b border-dark-700 pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{item.pair}</h4>
                                            <p className="text-gray-400 text-xs">{item.trades} trades</p>
                                        </div>
                                        <span className={`font-bold text-lg ${item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {item.pnl > 0 ? '+' : ''}{item.pnl.toFixed(2)}%
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-4">Not enough data to rank pairs.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Time Range Filter */}
                <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700 transition-colors duration-300 max-w-md overflow-x-auto scrollbar-hide">
                    {(['All Time', 'Monthly', 'Weekly', 'Daily'] as TimeRange[]).map((range) => (
                        <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                            timeRange === range
                            ? 'bg-dark-700 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        >
                        {range}
                        </button>
                    ))}
                </div>

                {/* Equity Curve */}
                <div className="bg-dark-800 rounded-2xl p-4 border border-dark-700 transition-colors duration-300 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-white font-bold">Equity Curve</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{timeRange} Cumulative PnL</p>
                        </div>
                        
                        {/* Chart Type Selector */}
                        <div className="flex bg-dark-900 rounded-lg p-0.5 border border-dark-700">
                            <button 
                                onClick={() => setChartType('Area')} 
                                className={`p-1.5 rounded-md transition-all ${chartType === 'Area' ? 'bg-dark-700 text-emerald-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Area Chart"
                            >
                                <TrendingUp size={16} />
                            </button>
                            <button 
                                onClick={() => setChartType('Line')} 
                                className={`p-1.5 rounded-md transition-all ${chartType === 'Line' ? 'bg-dark-700 text-emerald-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Line Chart"
                            >
                                <Activity size={16} />
                            </button>
                            <button 
                                onClick={() => setChartType('Bar')} 
                                className={`p-1.5 rounded-md transition-all ${chartType === 'Bar' ? 'bg-dark-700 text-emerald-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Bar Chart"
                            >
                                <BarChart2 size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-48 md:h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default PerformanceView;