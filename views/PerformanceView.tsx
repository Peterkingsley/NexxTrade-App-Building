import React, { useState } from 'react';
import { MessageSquare, Bell, Ribbon, TrendingUp, Activity, BarChart2, ChevronDown, Target, Trophy } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, BarChart as RechartsBarChart, Bar } from 'recharts';
import { ViewState } from '../types';

interface PerformanceViewProps {
    onNavigate: (view: ViewState) => void;
}

type TimeRange = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type ChartType = 'Area' | 'Line' | 'Bar';

const DATA_RANGES: Record<TimeRange, { name: string; value: number }[]> = {
  Daily: [
    { name: '00:00', value: 1000 },
    { name: '04:00', value: 1020 },
    { name: '08:00', value: 1050 },
    { name: '12:00', value: 1040 },
    { name: '16:00', value: 1080 },
    { name: '20:00', value: 1100 },
    { name: '23:59', value: 1120 },
  ],
  Weekly: [
    { name: 'Mon', value: 1000 },
    { name: 'Tue', value: 1150 },
    { name: 'Wed', value: 1100 },
    { name: 'Thu', value: 1300 },
    { name: 'Fri', value: 1250 },
    { name: 'Sat', value: 1400 },
    { name: 'Sun', value: 1450 },
  ],
  Monthly: [
    { name: 'Week 1', value: 1000 },
    { name: 'Week 2', value: 2200 },
    { name: 'Week 3', value: 1800 },
    { name: 'Week 4', value: 2800 },
  ],
  Yearly: [
    { name: 'Jan', value: 1000 },
    { name: 'Mar', value: 2200 },
    { name: 'May', value: 1800 },
    { name: 'Jul', value: 2800 },
    { name: 'Sep', value: 2400 },
    { name: 'Nov', value: 3200 },
  ],
};

const PerformanceView: React.FC<PerformanceViewProps> = ({ onNavigate }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('Monthly');
  const [chartType, setChartType] = useState<ChartType>('Area');
  const [groupsLabel, setGroupsLabel] = useState('Groups');

  const handleGroupsClick = () => {
    setGroupsLabel('Coming Soon');
    setTimeout(() => setGroupsLabel('Groups'), 2000);
  };

  const currentData = DATA_RANGES[timeRange];

  const renderChart = () => {
      const commonProps = {
          data: currentData,
          margin: { top: 10, right: 0, left: -20, bottom: 0 }
      };

      if (chartType === 'Line') {
          return (
            <LineChart {...commonProps}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} width={35} />
                <Tooltip 
                    contentStyle={{backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)'}} 
                    itemStyle={{color: 'var(--text-main)'}} 
                    labelStyle={{color: 'var(--text-muted)'}} 
                />
                <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#F87171" 
                    strokeWidth={3} 
                    dot={{ fill: '#F87171', strokeWidth: 0, r: 4 }} 
                    activeDot={{ r: 6 }} 
                    animationDuration={500} 
                />
            </LineChart>
          );
      }

      if (chartType === 'Bar') {
          return (
            <RechartsBarChart {...commonProps}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} width={35} />
                <Tooltip 
                    cursor={{fill: 'var(--bg-surface)', opacity: 0.5}}
                    contentStyle={{backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)'}} 
                    itemStyle={{color: 'var(--text-main)'}} 
                    labelStyle={{color: 'var(--text-muted)'}} 
                />
                <Bar 
                    dataKey="value" 
                    fill="#F87171" 
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
                    <stop offset="5%" stopColor="#F87171" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text-muted)', fontSize: 12}}
                interval="preserveStartEnd"
            />
             <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: 'var(--text-muted)', fontSize: 12}}
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
                stroke="#F87171" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                dot={{ fill: '#F87171', strokeWidth: 0, r: 3 }}
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
             <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700 transition-colors duration-300">
                <button className="px-4 py-1.5 bg-dark-700 text-white text-xs font-semibold rounded shadow-sm">
                    NexxTrade
                </button>
                <button 
                    onClick={handleGroupsClick}
                    className={`px-4 py-1.5 text-xs font-medium transition-all duration-300 ${groupsLabel === 'Coming Soon' ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`}
                >
                    {groupsLabel}
                </button>
            </div>
            <button onClick={() => onNavigate('notifications')} className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition border border-transparent hover:border-dark-700">
                <Bell size={20} />
            </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Stats Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden h-full text-white group flex flex-col justify-between">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-900/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                
                {/* Abstract Wave Line */}
                <svg className="absolute bottom-0 left-0 w-full h-32 opacity-20 pointer-events-none" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <path fill="currentColor" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>

                <div className="relative z-10 flex flex-col h-full justify-between">
                    {/* Header Section */}
                    <div className="flex justify-between items-start">
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/10 shadow-sm flex items-center gap-1 cursor-pointer hover:bg-white/30 transition-colors">
                                    {timeRange} <ChevronDown size={12} />
                                </span>
                             </div>
                             <p className="text-emerald-100 font-medium text-sm mt-2">Net Profit</p>
                             <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mt-1 drop-shadow-sm">
                                {timeRange === 'Daily' ? '+1.2%' : timeRange === 'Weekly' ? '+5.4%' : timeRange === 'Monthly' ? '+20.5%' : '+145.2%'}
                             </h1>
                        </div>
                        <div className="hidden md:flex flex-col items-end">
                             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 mb-2">
                                <TrendingUp size={24} className="text-white" />
                             </div>
                             <p className="text-emerald-100 text-xs font-bold text-right">+2.4% vs last {timeRange.toLowerCase().replace('ly', '')}</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8">
                        <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                <Target size={14} />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Win Rate</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">78%</p>
                        </div>
                        
                        <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                <Activity size={14} />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Signals</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">42</p>
                        </div>

                        <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/5 hover:bg-black/20 transition-colors group/stat">
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-100/70">
                                <Trophy size={14} />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Wins</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-white group-hover/stat:scale-105 transition-transform origin-left">33</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Pairs (Moved here for desktop grid) */}
             <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700 transition-colors duration-300 shadow-sm h-full">
                <div className="flex items-center gap-2 mb-6">
                    <Ribbon className="text-emerald-500" />
                    <h3 className="text-white font-bold">Top Performing Pairs</h3>
                </div>
                
                <div className="space-y-6">
                    {[
                        { pair: 'BTC/USDT', trades: 8, gain: 32.5 },
                        { pair: 'ETH/USDT', trades: 12, gain: 28.3 },
                        { pair: 'SOL/USDT', trades: 6, gain: 24.5 },
                        { pair: 'ADA/USDT', trades: 5, gain: 20.2 },
                    ].map((item, i) => (
                        <div key={i} className="flex justify-between items-end border-b border-dark-700 pb-4 last:border-0 last:pb-0">
                            <div>
                                <h4 className="text-white font-bold text-lg">{item.pair}</h4>
                                <p className="text-gray-400 text-xs">{item.trades} trades</p>
                            </div>
                            <span className="text-emerald-400 font-bold text-lg">+{item.gain}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex bg-dark-800 p-1 rounded-xl border border-dark-700 transition-colors duration-300 max-w-md">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
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
                    <p className="text-xs text-gray-500 mt-0.5">{timeRange} Performance</p>
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

      </div>
    </div>
  );
};

export default PerformanceView;