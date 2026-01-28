import React, { useState } from 'react';
import { MessageSquare, Bell, Play, FileText, Download, ChevronRight, ArrowLeft, Clock, User, Share2, Bookmark, PlayCircle, PauseCircle } from 'lucide-react';
import { ViewState, AcademyItem, AcademyCategoryType } from '../types';

interface AcademyViewProps {
    onNavigate: (view: ViewState) => void;
}

// --- MOCK DATA ---
const ACADEMY_ITEMS: AcademyItem[] = [
    // Videos
    {
        id: 'v1',
        title: 'Risk Management Masterclass',
        category: 'videos',
        type: 'Video',
        duration: '18:24',
        author: 'Alex Hormozi',
        date: 'Oct 12, 2023',
        description: 'Learn the mathematical approach to position sizing and how to never blow your account. We cover R:R ratios, kelly criterion, and psychological stops.',
        thumbnail: 'bg-emerald-900',
    },
    {
        id: 'v2',
        title: 'Master Support & Resistance',
        category: 'videos',
        type: 'Video',
        duration: '12:45',
        author: 'NexxTeam',
        date: 'Nov 01, 2023',
        description: 'The foundation of all technical analysis. Learn how to draw zones correctly and trade the retest.',
        thumbnail: 'bg-purple-900',
    },
    {
        id: 'v3',
        title: 'Trading Psychology 101',
        category: 'videos',
        type: 'Video',
        duration: '24:00',
        author: 'Mark Douglas Fan',
        date: 'Dec 15, 2023',
        description: 'Why you fail despite having a good strategy. Mastering the inner game of trading.',
        thumbnail: 'bg-blue-900',
    },
    // Guides
    {
        id: 'a1',
        title: 'Understanding Market Structure',
        category: 'guides',
        type: 'Article',
        duration: '5 min read',
        author: 'Sarah Jenkins',
        date: 'Jan 10, 2024',
        content: `
            <p class="mb-4">Market structure is the study of the market's behavior. It allows traders to read the market like a book, understanding the story of price action as it unfolds.</p>
            
            <h3 class="text-white font-bold text-lg mb-2">The Three States of Market</h3>
            <p class="mb-4">The market can only do three things: go up (uptrend), go down (downtrend), or move sideways (consolidation).</p>
            
            <ul class="list-disc pl-5 mb-4 space-y-2 text-gray-300">
                <li><strong>Uptrend:</strong> Characterized by Higher Highs (HH) and Higher Lows (HL).</li>
                <li><strong>Downtrend:</strong> Characterized by Lower Lows (LL) and Lower Highs (LH).</li>
                <li><strong>Consolidation:</strong> Price is trapped between a support and resistance level.</li>
            </ul>

            <h3 class="text-white font-bold text-lg mb-2">Break of Structure (BOS)</h3>
            <p class="mb-4">A break of structure occurs when price breaks a previous high in an uptrend or a previous low in a downtrend. This confirms the continuation of the trend.</p>

            <div class="bg-dark-800 p-4 border-l-4 border-brand-green italic my-6 text-gray-400">
                "Trade with the trend, until it bends." - Old Wall Street Adage
            </div>

            <p>Identifying these patterns early is crucial for high-probability setups.</p>
        `
    },
    {
        id: 'a2',
        title: 'The Ultimate Guide to Candlestick Patterns',
        category: 'guides',
        type: 'Article',
        duration: '8 min read',
        author: 'NexxTeam',
        date: 'Jan 15, 2024',
        content: '<p>Candlesticks are the language of the market...</p>'
    },
    // Resources
    {
        id: 'r1',
        title: 'Position Size Calculator Sheet',
        category: 'resources',
        type: 'Article', // Using Article view for simplicity, or could be a download
        duration: 'Tool',
        description: 'Excel sheet to automatically calculate lot size based on stop loss.'
    }
];

const AcademyView: React.FC<AcademyViewProps> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = useState<'main' | 'list' | 'detail'>('main');
  const [selectedCategory, setSelectedCategory] = useState<AcademyCategoryType | null>(null);
  const [selectedItem, setSelectedItem] = useState<AcademyItem | null>(null);
  const [groupsLabel, setGroupsLabel] = useState('Groups');

  // --- HANDLERS ---
  const handleGroupsClick = () => {
    setGroupsLabel('Coming Soon');
    setTimeout(() => setGroupsLabel('Groups'), 2000);
  };

  const handleCategoryClick = (category: AcademyCategoryType) => {
      setSelectedCategory(category);
      setViewMode('list');
  };

  const handleItemClick = (item: AcademyItem) => {
      setSelectedItem(item);
      setViewMode('detail');
  };

  const handleBack = () => {
      if (viewMode === 'detail') {
          // If we have a selected category (came from list), go back to list
          // If no selected category (came from 'Latest' on main), go back to main
          if (selectedCategory) {
              setViewMode('list');
              setSelectedItem(null);
          } else {
              setViewMode('main');
              setSelectedItem(null);
          }
      } else if (viewMode === 'list') {
          setViewMode('main');
          setSelectedCategory(null);
      }
  };

  const getCategoryTitle = (cat: AcademyCategoryType) => {
      if (cat === 'videos') return 'Video Courses';
      if (cat === 'guides') return 'Trading Guides';
      return 'Resources';
  };

  // --- SUB-VIEWS ---

  const renderMain = () => (
    <>
      <div className="flex justify-between items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40">
        <button className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition">
          <MessageSquare size={20} />
        </button>
        <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700">
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
        <button onClick={() => onNavigate('notifications')} className="text-white p-2 bg-dark-800 rounded-xl hover:bg-dark-700 transition">
          <Bell size={20} />
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Featured Course */}
        <div 
            onClick={() => handleItemClick(ACADEMY_ITEMS.find(i => i.id === 'v2') || ACADEMY_ITEMS[0])}
            className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 cursor-pointer group"
        >
            <div className="h-40 bg-dark-700 relative flex items-center justify-center overflow-hidden">
                 {/* Placeholder for video thumbnail */}
                 <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-emerald-900 to-black"></div>
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-700"></div>
                 
                 <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center pl-1 text-dark-900 z-10 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                     <Play fill="currentColor" size={32} />
                 </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white font-bold text-lg">Master Support & Resistance</h3>
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">FEATURED</span>
                </div>
                <p className="text-gray-400 text-sm">Learn the fundamentals of technical analysis</p>
            </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div 
                onClick={() => handleCategoryClick('videos')}
                className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex flex-col justify-between h-32 hover:border-emerald-500/50 transition-colors cursor-pointer group relative overflow-hidden"
            >
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors"></div>
                <Play className="text-emerald-500 group-hover:scale-110 transition-transform origin-left relative z-10" size={28} />
                <div className="relative z-10">
                    <h4 className="text-white font-bold">Video Courses</h4>
                    <p className="text-gray-400 text-xs">{ACADEMY_ITEMS.filter(i => i.category === 'videos').length} items</p>
                </div>
            </div>
             <div 
                onClick={() => handleCategoryClick('guides')}
                className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex flex-col justify-between h-32 hover:border-emerald-500/50 transition-colors cursor-pointer group relative overflow-hidden"
            >
                 <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
                <FileText className="text-blue-500 group-hover:scale-110 transition-transform origin-left relative z-10" size={28} />
                <div className="relative z-10">
                    <h4 className="text-white font-bold">Trading Guides</h4>
                    <p className="text-gray-400 text-xs">{ACADEMY_ITEMS.filter(i => i.category === 'guides').length} items</p>
                </div>
            </div>
             <div 
                onClick={() => handleCategoryClick('resources')}
                className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex flex-col justify-between h-32 hover:border-emerald-500/50 transition-colors cursor-pointer group relative overflow-hidden"
            >
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
                <Download className="text-purple-500 group-hover:scale-110 transition-transform origin-left relative z-10" size={28} />
                <div className="relative z-10">
                    <h4 className="text-white font-bold">Resources</h4>
                    <p className="text-gray-400 text-xs">{ACADEMY_ITEMS.filter(i => i.category === 'resources').length} items</p>
                </div>
            </div>
        </div>

        {/* Latest Contents */}
        <div>
            <h3 className="text-white font-bold text-lg mb-4">Latest Contents</h3>
            <div className="space-y-4">
                {ACADEMY_ITEMS.slice(0, 3).map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="bg-dark-800 p-4 rounded-2xl border border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'Video' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {item.type === 'Video' ? <Play size={18} fill="currentColor" /> : <FileText size={18} />}
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1 line-clamp-1 group-hover:text-brand-green transition-colors">{item.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{item.type}</span>
                                    <span>•</span>
                                    <span>{item.duration}</span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" size={16} />
                    </div>
                ))}
            </div>
        </div>
      </div>
    </>
  );

  const renderList = () => {
      const items = ACADEMY_ITEMS.filter(i => i.category === selectedCategory);
      const title = selectedCategory ? getCategoryTitle(selectedCategory) : 'All Content';

      return (
        <>
            <div className="flex items-center p-4 pt-6 sticky top-0 bg-dark-900/95 backdrop-blur-sm z-40 border-b border-dark-800">
                <button onClick={handleBack} className="text-white p-2 hover:bg-dark-800 rounded-full transition mr-4">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>

            <div className="p-4 space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>No items found in this category yet.</p>
                    </div>
                ) : (
                    items.map(item => (
                         <div 
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="bg-dark-800 rounded-2xl p-3 border border-dark-700 flex gap-4 cursor-pointer hover:border-emerald-500/30 transition shadow-sm group"
                        >
                            <div className={`w-24 h-24 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden ${item.thumbnail || 'bg-dark-700'}`}>
                                {item.thumbnail && <div className={`absolute inset-0 ${item.thumbnail} opacity-50`}></div>}
                                {item.type === 'Video' ? (
                                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative z-10">
                                        <Play size={14} fill="white" className="text-white ml-0.5" />
                                    </div>
                                ) : (
                                    <FileText className="text-white/50 relative z-10" size={24} />
                                )}
                            </div>
                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                                    <span className="flex items-center gap-1"><Clock size={10} /> {item.duration}</span>
                                    <span>{item.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                        <User size={12} className="text-gray-400" />
                                    </div>
                                    <span className="text-xs text-gray-400">{item.author || 'NexxTeam'}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
      );
  };

  const renderArticle = (item: AcademyItem) => (
      <>
        {/* Header with Overlay */}
        <div className="relative h-64 w-full">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-900 z-10"></div>
            <div className={`absolute inset-0 bg-cover bg-center ${item.thumbnail ? item.thumbnail : 'bg-brand-green/20'}`}></div>
            
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-center z-20">
                 <button onClick={handleBack} className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex gap-2">
                    <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition">
                        <Bookmark size={20} />
                    </button>
                    <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {/* Title Block */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                <span className="inline-block px-2 py-1 bg-brand-green text-dark-900 text-[10px] font-bold rounded mb-3 uppercase tracking-wider">
                    {item.category === 'guides' ? 'Guide' : 'Resource'}
                </span>
                <h1 className="text-2xl font-bold text-white mb-2 leading-tight shadow-sm">{item.title}</h1>
                <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1.5 font-medium">
                        <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                            <User size={12} />
                        </div>
                        {item.author}
                    </span>
                    <span>•</span>
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.duration}</span>
                </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 pb-24">
            <div 
                className="text-gray-300 leading-relaxed space-y-4 text-sm font-light tracking-wide"
                dangerouslySetInnerHTML={{ __html: item.content || `<p>${item.description}</p>` }}
            />
        </div>
      </>
  );

  const renderVideo = (item: AcademyItem) => (
      <div className="flex flex-col min-h-full">
          {/* Video Player Area */}
          <div className="bg-black sticky top-0 z-30 w-full aspect-video flex items-center justify-center relative group">
              {/* Back Button Overlay */}
              <div className="absolute top-4 left-4 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button onClick={handleBack} className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70">
                    <ArrowLeft size={20} />
                 </button>
              </div>

              {/* Fake Player UI */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
              <button className="relative z-10 w-16 h-16 bg-brand-green rounded-full flex items-center justify-center text-dark-900 hover:scale-110 transition-transform shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <Play fill="currentColor" size={32} className="ml-1" />
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                  <div className="h-full w-1/3 bg-brand-green relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"></div>
                  </div>
              </div>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h1 className="text-xl font-bold text-white mb-2 leading-tight">{item.title}</h1>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{item.author}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                      </div>
                  </div>
                  <button className="text-brand-green">
                      <Bookmark size={24} />
                  </button>
              </div>

              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 mb-6">
                  <h3 className="text-white font-bold text-sm mb-2">Description</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                      {item.description}
                  </p>
              </div>

              <h3 className="text-white font-bold text-lg mb-4">Up Next</h3>
              <div className="space-y-4">
                  {ACADEMY_ITEMS.filter(i => i.category === 'videos' && i.id !== item.id).map(video => (
                      <div 
                        key={video.id}
                        onClick={() => handleItemClick(video)}
                        className="flex gap-3 cursor-pointer group"
                      >
                          <div className="w-28 h-16 bg-dark-800 rounded-lg relative overflow-hidden shrink-0 border border-dark-700">
                               <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition">
                                   <PlayCircle className="text-white/80" size={20} />
                               </div>
                          </div>
                          <div className="flex flex-col justify-center">
                              <h4 className="text-white font-bold text-sm line-clamp-2 group-hover:text-brand-green transition-colors">{video.title}</h4>
                              <span className="text-gray-500 text-xs mt-1">{video.duration}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="pb-24 min-h-screen bg-dark-900">
        {viewMode === 'main' && renderMain()}
        {viewMode === 'list' && renderList()}
        {viewMode === 'detail' && selectedItem && (
            selectedItem.type === 'Video' ? renderVideo(selectedItem) : renderArticle(selectedItem)
        )}
    </div>
  );
};

export default AcademyView;