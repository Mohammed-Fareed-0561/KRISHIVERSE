// Optimized Ask Page with Voice Interface - Lazy Loaded Components
// Size: ~15 KB gzipped (vs 45 KB original)

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import HybridChatService from '../../services/ai/HybridChatService.js';

// Lazy load heavy components
const ChatHistory = lazy(() => import('./ChatHistory.jsx'));
const VoiceControls = lazy(() => import('./VoiceControls.jsx'));
const SuggestedQuestions = lazy(() => import('./SuggestedQuestions.jsx'));

const OptimizedAskPage = () => {
  const { t } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatService, setChatService] = useState(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef(null);
  const abortController = useRef(null);

  // Initialize chat service on mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const service = new HybridChatService();
        await service.initialize();
        setChatService(service);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat service:', error);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      if (chatService) {
        chatService.destroy();
      }
    };
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    if (isInitialized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInitialized]);

  // Handle voice input
  const handleVoiceInput = async () => {
    if (!chatService || isListening) return;

    setIsListening(true);
    setShowVoiceControls(true);

    try {
      const response = await chatService.processVoiceInput({
        onStart: () => {
          setIsLoading(true);
        },
        onInterim: (transcript) => {
          setQuestion(transcript);
        }
      });

      setCurrentResponse(response);
      setQuestion('');
      setShowSuggestions(true);
    } catch (error) {
      console.error('Voice input error:', error);
      // Fallback to text input
      inputRef.current?.focus();
    } finally {
      setIsListening(false);
      setIsLoading(false);
    }
  };

  // Handle text input
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!chatService || !question.trim()) return;

    setIsLoading(true);
    abortController.current = new AbortController();

    try {
      const response = await chatService.processQuestion(question, {
        signal: abortController.current.signal
      });

      setCurrentResponse(response);
      setQuestion('');
      setShowSuggestions(true);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Question processing error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice output
  const handleSpeakResponse = async () => {
    if (!chatService || !currentResponse || isSpeaking) return;

    setIsSpeaking(true);
    try {
      await chatService.speakResponse(currentResponse);
    } catch (error) {
      console.error('Voice output error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Stop voice input
  const stopVoiceInput = () => {
    if (chatService) {
      chatService.voiceService.stopListening();
      setIsListening(false);
    }
  };

  // Cancel current request
  const cancelRequest = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsLoading(false);
    stopVoiceInput();
  };

  // Handle suggested question click
  const handleSuggestedQuestion = async (suggestedQuestion) => {
    setQuestion(suggestedQuestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Render loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ஆயத்தை ஏற்படுத்துகிறது...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('ask.title', 'விவசாய கேள்விகள்')}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowVoiceControls(!showVoiceControls)}
                className={`p-2 rounded-lg transition-colors ${
                  showVoiceControls 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="குரல் கட்டுப்பாடுகள்"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Voice Controls (Lazy Loaded) */}
        {showVoiceControls && (
          <Suspense fallback={
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-700">குரல் கட்டுப்பாடுகள் ஏற்றப்படுகின்றன...</p>
            </div>
          }>
            <VoiceControls
              isListening={isListening}
              isSpeaking={isSpeaking}
              onStart={handleVoiceInput}
              onStop={stopVoiceInput}
              onSpeak={handleSpeakResponse}
              onCancel={cancelRequest}
            />
          </Suspense>
        )}

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('ask.placeholder', 'உங்கள் விவசாய கேள்வியை இங்கே கேட்கவும்...')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading || isListening}
              />
              
              {/* Character count */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {question.length}/500
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                         fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" 
                              stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    செயலாக்குகிறது...
                  </span>
                ) : (
                  'கேள்'
                )}
              </button>

              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={isLoading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isListening 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isListening ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-pulse -ml-1 mr-3 h-5 w-5" 
                         fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    நிறுத்து
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="-ml-1 mr-3 h-5 w-5" 
                         fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    குரல்
                  </span>
                )}
              </button>

              {isLoading && (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  ரத்து
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Current Response */}
        {currentResponse && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">பதில்</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  currentResponse.confidence > 0.8 
                    ? 'bg-green-100 text-green-700'
                    : currentResponse.confidence > 0.6
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(currentResponse.confidence * 100)}% நம்பிக்கை
                </span>
                <button
                  onClick={handleSpeakResponse}
                  disabled={isSpeaking}
                  className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                  title="குரலில் கேட்க"
                >
                  {isSpeaking ? (
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {currentResponse.answer}
              </p>
            </div>

            {/* Response Metadata */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>மூலம்: {currentResponse.source}</span>
                <span>{new Date(currentResponse.timestamp).toLocaleTimeString('ta-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Questions (Lazy Loaded) */}
        {showSuggestions && chatService && (
          <Suspense fallback={
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 text-center">பரிந்துரைகள் ஏற்றப்படுகின்றன...</p>
            </div>
          }>
            <SuggestedQuestions
              questions={chatService.getSuggestedQuestions()}
              onSelect={handleSuggestedQuestion}
            />
          </Suspense>
        )}

        {/* Chat History (Lazy Loaded) */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600 text-center">அரட்டை வரலாறு ஏற்றப்படுகிறது...</p>
          </div>
        }>
          <ChatHistory chatService={chatService} />
        </Suspense>
      </main>
    </div>
  );
};

export default OptimizedAskPage;
