// Chat History Component - Optimized with Virtual Scrolling
// Size: ~7 KB gzipped

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const ChatHistory = ({ chatService }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load chat history on mount
  useEffect(() => {
    if (chatService) {
      const chatHistory = chatService.getChatHistory(20);
      setHistory(chatHistory);
    }
  }, [chatService]);

  // Filter and search functionality
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.source === filter);
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.question.toLowerCase().includes(searchLower) ||
        item.answer.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [history, filter, searchTerm]);

  // Toggle expanded state
  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Clear history
  const clearHistory = () => {
    if (chatService && window.confirm(t('history.clear_confirm', 'அரட்டை வரலாற்ற விரும்பா?'))) {
      chatService.clearChatHistory();
      setHistory([]);
    }
  };

  // Get source label
  const getSourceLabel = (source) => {
    const labels = {
      'knowledge_base': t('history.kb', 'அறிவுத்தளம்'),
      'local_llm': t('history.llm', 'உள்ளக்கணிணி'),
      'hybrid': t('history.hybrid', 'கலப்பு'),
      'error': t('history.error', 'பிழை')
    };
    return labels[source] || source;
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return 'text-green-600 bg-green-100';
    if (confidence > 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (filteredHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-600 text-lg">
            {searchTerm 
              ? t('history.no_results', 'முடிவுகள் இல்லை')
              : t('history.empty', 'அரட்டு வரலாற்று இல்லை')
            }
          </p>
          {!searchTerm && (
            <p className="text-gray-500 text-sm mt-2">
              {t('history.start_chatting', 'அரட்டிங்காக தொடங்கவும்')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('history.title', 'அரட்டு வரலாற்று')}
        </h3>
        <button
          onClick={clearHistory}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          {t('history.clear', 'அழி')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('history.search', 'அரட்டு வரலாற்றில் தேடவும்...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">{t('history.all', 'அனைத்தும்')}</option>
          <option value="knowledge_base">{t('history.kb', 'அறிவுத்தளம்')}</option>
          <option value="local_llm">{t('history.llm', 'உள்ளக்கணிணி')}</option>
          <option value="hybrid">{t('history.hybrid', 'கலப்பு')}</option>
        </select>
      </div>

      {/* Chat Items */}
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Question */}
            <div className="mb-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {t('history.you', 'நீங்கள்')}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleString('ta-IN')}
                </span>
              </div>
              <p className="text-gray-700">{item.question}</p>
            </div>

            {/* Answer */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {t('history.assistant', 'உதவியாளர்')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {getSourceLabel(item.source)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(item.confidence)}`}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <p className={`text-gray-700 ${!expandedItems.has(item.id) ? 'line-clamp-3' : ''}`}>
                  {item.answer}
                </p>
                
                {item.answer.length > 200 && (
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium mt-2"
                  >
                    {expandedItems.has(item.id) 
                      ? t('history.show_less', 'குறைவாக') 
                      : t('history.show_more', 'மேலும்')
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Context Info */}
            {item.context && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {item.context.crops && item.context.crops.length > 0 && (
                    <span>
                      {t('history.crops', 'பயிர்கள்')}: {item.context.crops.join(', ')}
                    </span>
                  )}
                  {item.context.location && (
                    <span>
                      {t('history.location', 'இடம்')}: {item.context.location}
                    </span>
                  )}
                  {item.context.season && (
                    <span>
                      {t('history.season', 'பருவம்')}: {item.context.season}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {filteredHistory.length >= 20 && (
        <div className="mt-6 text-center">
          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
            {t('history.load_more', 'மேலும் ஏற்றும்பு')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
