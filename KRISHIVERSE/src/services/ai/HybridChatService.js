// Hybrid Chat Service - Combines Local LLM with Agricultural Knowledge Base
// Provides accurate, context-aware farming advice completely offline

import AgriculturalKnowledgeBase from './AgriculturalKnowledgeBase.js';
import VoiceService from '../voice/VoiceService.js';

class HybridChatService {
  constructor() {
    this.knowledgeBase = new AgriculturalKnowledgeBase();
    this.voiceService = new VoiceService();
    this.userContext = {
      crops: [],
      location: null,
      language: 'ta',
      season: null,
      lastQuestions: []
    };
    this.chatHistory = [];
    this.isInitialized = false;
  }

  // Initialize the chat service
  async initialize() {
    try {
      // Load user preferences from localStorage
      this.loadUserContext();
      
      // Preload voice synthesis
      await this.voiceService.preloadVoices();
      
      // Initialize local LLM (Ollama)
      await this.initializeLocalLLM();
      
      this.isInitialized = true;
      console.log('Hybrid Chat Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Hybrid Chat Service:', error);
      throw error;
    }
  }

  // Load user context from storage
  loadUserContext() {
    const stored = localStorage.getItem('krishiverse_user_context');
    if (stored) {
      this.userContext = { ...this.userContext, ...JSON.parse(stored) };
    }
  }

  // Save user context to storage
  saveUserContext() {
    localStorage.setItem('krishiverse_user_context', JSON.stringify(this.userContext));
  }

  // Initialize local LLM (Ollama)
  async initializeLocalLLM() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      console.log('Available Ollama models:', data.models);
      
      // Check if Mistral is available
      const hasMistral = data.models.some(model => model.name.includes('mistral'));
      if (!hasMistral) {
        console.warn('Mistral model not found in Ollama. Will use knowledge base only.');
      }
    } catch (error) {
      console.warn('Ollama not available. Using knowledge base only:', error.message);
    }
  }

  // Process user question with hybrid approach
  async processQuestion(question, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Update user context
      this.updateUserContext(question);
      
      // Step 1: Check knowledge base first (fast, accurate)
      const kbResponse = this.knowledgeBase.query(question, this.userContext);
      
      // Step 2: If high confidence from KB, return it
      if (kbResponse.confidence > 0.8) {
        return await this.formatResponse(kbResponse, question, 'knowledge_base');
      }

      // Step 3: If low confidence, try local LLM with enhanced prompt
      const llmResponse = await this.queryLocalLLM(question, kbResponse);
      
      // Step 4: Combine responses for best accuracy
      const combinedResponse = this.combineResponses(kbResponse, llmResponse);
      
      return await this.formatResponse(combinedResponse, question, 'hybrid');
    } catch (error) {
      console.error('Error processing question:', error);
      return this.getErrorResponse(question, error);
    }
  }

  // Update user context based on question
  updateUserContext(question) {
    const questionLower = question.toLowerCase();
    
    // Extract crop information
    const crops = ['நெல்', 'கரும்பு', 'பருத்தி', 'தக்காளி', 'வெங்காயம்'];
    for (const crop of crops) {
      if (questionLower.includes(crop) && !this.userContext.crops.includes(crop)) {
        this.userContext.crops.push(crop);
        this.saveUserContext();
        break;
      }
    }

    // Extract location information
    const locations = ['கோவை', 'சென்னை', 'திருச்சி', 'மதுரை', 'சேலம்'];
    for (const location of locations) {
      if (questionLower.includes(location)) {
        this.userContext.location = location;
        this.saveUserContext();
        break;
      }
    }

    // Update last questions
    this.userContext.lastQuestions.push(question);
    if (this.userContext.lastQuestions.length > 10) {
      this.userContext.lastQuestions.shift();
    }
    this.saveUserContext();
  }

  // Query local LLM with enhanced prompt
  async queryLocalLLM(question, kbContext) {
    try {
      const enhancedPrompt = this.buildEnhancedPrompt(question, kbContext);
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: enhancedPrompt,
          stream: false,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        type: 'llm_response',
        answer: data.response,
        confidence: 0.7,
        source: 'local_llm',
        model: 'mistral'
      };
    } catch (error) {
      console.warn('Local LLM query failed:', error);
      return null;
    }
  }

  // Build enhanced prompt with context
  buildEnhancedPrompt(question, kbContext) {
    let prompt = `You are an agricultural expert for Tamil Nadu farmers. Provide practical, accurate advice in Tamil.

Context:
- User's crops: ${this.userContext.crops.join(', ') || 'Not specified'}
- Location: ${this.userContext.location || 'Not specified'}
- Season: ${this.getCurrentSeason()}
- Previous questions: ${this.userContext.lastQuestions.slice(-3).join(', ') || 'None'}

Knowledge Base Information:
${kbContext ? `Crop/Disease Info: ${kbContext.answer}` : 'No specific information found'}

Question: ${question}

Instructions:
1. Answer in Tamil language
2. Be practical and specific to Tamil Nadu farming
3. Include specific quantities, timing, and methods
4. Mention both chemical and organic options when available
5. Keep response under 300 words
6. Be helpful and encouraging

Answer:`;

    return prompt;
  }

  // Get current season based on month
  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 9 || month <= 0) return 'குளிர்காலம்';
    if (month >= 1 && month <= 4) return 'கோடைகாலம்';
    return 'மழைகாலம்';
  }

  // Combine knowledge base and LLM responses
  combineResponses(kbResponse, llmResponse) {
    if (!llmResponse) {
      return kbResponse;
    }

    if (kbResponse.confidence > 0.8) {
      return kbResponse;
    }

    // If both have moderate confidence, combine them
    const combinedAnswer = `${kbResponse.answer}\n\nகூடுதல் தகவல்: ${llmResponse.answer}`;
    
    return {
      type: 'combined',
      answer: combinedAnswer,
      confidence: Math.max(kbResponse.confidence, llmResponse.confidence),
      sources: [kbResponse.source, llmResponse.source],
      primary_source: kbResponse.confidence > llmResponse.confidence ? 'knowledge_base' : 'llm'
    };
  }

  // Format response with metadata
  async formatResponse(response, question, source) {
    const formattedResponse = {
      id: Date.now(),
      question: question,
      answer: response.answer,
      confidence: response.confidence,
      source: source,
      timestamp: new Date().toISOString(),
      language: this.userContext.language,
      context: {
        crops: this.userContext.crops,
        location: this.userContext.location,
        season: this.getCurrentSeason()
      },
      metadata: {
        model: response.model || 'knowledge_base',
        processing_time: Date.now() - performance.now(),
        offline: !navigator.onLine
      }
    };

    // Save to chat history
    this.chatHistory.push(formattedResponse);
    this.saveChatHistory();

    return formattedResponse;
  }

  // Get error response
  getErrorResponse(question, error) {
    return {
      id: Date.now(),
      question: question,
      answer: 'தவறு ஏற்பட்டது. தயவு செய்து மீண்டும் முயற்சி செய்யவும். இணைப்பு இல்லாமல் இருந்தால், அடிப்படை தகவல்கள் மூலம் பதிலளிக்கிறோம்.',
      confidence: 0.3,
      source: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  // Voice input processing
  async processVoiceInput(options = {}) {
    try {
      const transcript = await this.voiceService.startListening({
        onStart: options.onStart,
        onInterim: options.onInterim
      });

      return await this.processQuestion(transcript, { ...options, isVoice: true });
    } catch (error) {
      console.error('Voice input error:', error);
      throw error;
    }
  }

  // Voice output processing
  async speakResponse(response, options = {}) {
    try {
      await this.voiceService.speak(response.answer, {
        onStart: options.onStart,
        onEnd: options.onEnd,
        rate: options.rate || 0.9,
        pitch: options.pitch || 1.0
      });
    } catch (error) {
      console.error('Voice output error:', error);
      throw error;
    }
  }

  // Save chat history to IndexedDB
  async saveChatHistory() {
    try {
      if ('indexedDB' in window) {
        const db = await this.openDatabase();
        const transaction = db.transaction(['chat_history'], 'readwrite');
        const store = transaction.objectStore('chat_history');
        
        // Save only recent history (last 50 messages)
        const recentHistory = this.chatHistory.slice(-50);
        
        for (const message of recentHistory) {
          store.put(message);
        }
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  // Open IndexedDB database
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KrishiVerse', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('chat_history')) {
          const store = db.createObjectStore('chat_history', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Load chat history from IndexedDB
  async loadChatHistory() {
    try {
      if ('indexedDB' in window) {
        const db = await this.openDatabase();
        const transaction = db.transaction(['chat_history'], 'readonly');
        const store = transaction.objectStore('chat_history');
        
        const request = store.getAll();
        request.onsuccess = () => {
          this.chatHistory = request.result.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
        };
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  // Get chat history
  getChatHistory(limit = 50) {
    return this.chatHistory.slice(0, limit);
  }

  // Clear chat history
  clearChatHistory() {
    this.chatHistory = [];
    this.saveChatHistory();
  }

  // Get user context
  getUserContext() {
    return this.userContext;
  }

  // Update user context
  updateUserPreferences(preferences) {
    this.userContext = { ...this.userContext, ...preferences };
    this.saveUserContext();
  }

  // Get suggested questions based on context
  getSuggestedQuestions() {
    const suggestions = [];
    const { crops, location, season } = this.userContext;

    if (crops.length > 0) {
      const crop = crops[0];
      suggestions.push(`${crop} நடவுக்கு எப்போது சிறந்த காலம்?`);
      suggestions.push(`${crop} பயிருக்கு எவ்வளவு நீர் தேவை?`);
      suggestions.push(`${crop} பயிரில் பொதுவான நோய்கள் என்ன?`);
    }

    if (location) {
      suggestions.push(`${location} பகுதியில் இப்போதைய சந்தை விலை என்ன?`);
    }

    if (season) {
      suggestions.push(`${season}ல் என்ன பயிர்கள் நடவு செய்யலாம்?`);
    }

    return suggestions.slice(0, 5);
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      totalQuestions: this.chatHistory.length,
      averageConfidence: this.chatHistory.reduce((sum, msg) => sum + msg.confidence, 0) / this.chatHistory.length,
      sources: this.chatHistory.reduce((acc, msg) => {
        acc[msg.source] = (acc[msg.source] || 0) + 1;
        return acc;
      }, {}),
      responseTime: this.chatHistory.reduce((sum, msg) => sum + (msg.metadata?.processing_time || 0), 0) / this.chatHistory.length
    };
  }

  // Clean up resources
  destroy() {
    if (this.voiceService) {
      this.voiceService.destroy();
    }
    this.saveChatHistory();
    this.saveUserContext();
  }
}

export default HybridChatService;
