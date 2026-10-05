// Improved Chatbot Service
// High-accuracy farming assistance with error handling and context awareness

import EnhancedAgriculturalChatbot from './EnhancedAgriculturalChatbot.js';

class ImprovedChatbotService {
  constructor() {
    this.chatbot = new EnhancedAgriculturalChatbot();
    this.isInitialized = false;
    this.errorCount = 0;
    this.maxErrors = 5;
    this.lastError = null;
    this.responseCache = new Map();
  }

  // Initialize the chatbot service
  async initialize() {
    try {
      // Initialize the enhanced chatbot
      await this.chatbot.initialize?.();
      this.isInitialized = true;
      console.log('Improved Chatbot Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize chatbot service:', error);
      this.lastError = error;
      return false;
    }
  }

  // Get chatbot response with comprehensive error handling
  async getResponse(question, userContext = {}) {
    try {
      // Validate input
      if (!question || typeof question !== 'string') {
        throw new Error('Invalid question format');
      }

      // Check if service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check error threshold
      if (this.errorCount >= this.maxErrors) {
        throw new Error('Service temporarily unavailable due to errors');
      }

      // Sanitize question
      const sanitizedQuestion = this.sanitizeQuestion(question);
      
      // Get response from enhanced chatbot
      const response = await this.chatbot.getResponse(sanitizedQuestion, userContext);
      
      // Validate response
      if (!response || !response.response) {
        throw new Error('Invalid response from chatbot');
      }

      // Reset error count on success
      this.errorCount = 0;
      
      return response;
      
    } catch (error) {
      this.errorCount++;
      this.lastError = error;
      
      console.error('Chatbot service error:', error);
      
      // Return appropriate error response
      return this.getErrorResponse(error, question);
    }
  }

  // Sanitize user question
  sanitizeQuestion(question) {
    return question
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  // Get error response based on error type
  getErrorResponse(error, question) {
    const errorType = this.classifyError(error);
    
    const errorResponses = {
      'network': {
        response: "I'm having trouble connecting to my knowledge base. Let me help you with basic farming advice while I reconnect. What specific crop or farming issue would you like to know about?",
        confidence: 0.3,
        type: 'network_error'
      },
      'validation': {
        response: "I didn't quite understand your question. Could you please rephrase it? For example, you could ask about 'rice cultivation', 'tomato diseases', or 'fertilizer recommendations'.",
        confidence: 0.2,
        type: 'validation_error'
      },
      'service': {
        response: "I'm experiencing some technical difficulties. Please try again in a moment. If the problem persists, you can restart the app to restore full functionality.",
        confidence: 0.1,
        type: 'service_error'
      },
      'timeout': {
        response: "I'm taking longer than expected to process your question. Let me try again. What farming assistance do you need?",
        confidence: 0.4,
        type: 'timeout_error'
      },
      'default': {
        response: "I apologize, but I encountered an error. Please try asking your question differently or contact support if the problem continues.",
        confidence: 0.2,
        type: 'unknown_error'
      }
    };

    return errorResponses[errorType] || errorResponses.default;
  }

  // Classify error type
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    
    if (message.includes('invalid') || message.includes('validation') || message.includes('format')) {
      return 'validation';
    }
    
    if (message.includes('timeout') || message.includes('time out')) {
      return 'timeout';
    }
    
    if (message.includes('service') || message.includes('unavailable')) {
      return 'service';
    }
    
    return 'default';
  }

  // Get basic fallback response when enhanced system fails
  getBasicFarmingResponse(question) {
    const questionLower = question.toLowerCase();
    
    // Basic keyword matching for fallback
    const basicResponses = {
      'rice': "For rice cultivation: maintain 2-5cm standing water, apply NPK 120:60:40 kg/ha, and monitor for blast disease.",
      'wheat': "For wheat cultivation: sow by mid-November, apply NPK 120:60:40 kg/ha, and monitor for rust disease.",
      'cotton': "For cotton: use Bt varieties, monitor for bollworm, and avoid excessive nitrogen.",
      'tomato': "For tomatoes: provide staking, monitor for fruit borer, and ensure proper irrigation.",
      'fertilizer': "Use soil testing for precise fertilizer recommendations. Generally, apply NPK based on crop requirements.",
      'disease': "Monitor crops regularly for symptoms. Use integrated pest management for disease control.",
      'pest': "Use pheromone traps and biological controls first. Use chemicals only when necessary.",
      'weather': "Check weather forecasts regularly. Adjust farming practices based on weather conditions.",
      'scheme': "Check PM-Kisan for ₹6,000 annual support and PMFBY for crop insurance.",
      'price': "Monitor local mandi prices regularly. Consider storage for better prices.",
      'water': "Use drip irrigation for water efficiency. Maintain proper field drainage."
    };

    // Find matching keyword
    for (const [keyword, response] of Object.entries(basicResponses)) {
      if (questionLower.includes(keyword)) {
        return {
          type: 'basic_fallback',
          response: response,
          confidence: 0.6,
          keyword: keyword
        };
      }
    }

    // Default response
    return {
      type: 'basic_fallback',
      response: "I can help with information about crops (rice, wheat, cotton, tomato), fertilizers, diseases, pests, weather, government schemes, and market prices. What would you like to know?",
      confidence: 0.4,
      keyword: 'general'
    };
  }

  // Clear cache and reset errors
  reset() {
    this.responseCache.clear();
    this.errorCount = 0;
    this.lastError = null;
    this.chatbot.clearCache?.();
  }

  // Get service health status
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      lastError: this.lastError?.message,
      cacheSize: this.responseCache.size,
      status: this.errorCount >= this.maxErrors ? 'unhealthy' : 'healthy'
    };
  }

  // Get chatbot statistics
  getStats() {
    return this.chatbot.getStats?.() || {
      totalQueries: 0,
      cacheSize: 0,
      knowledgeBaseSize: 0,
      supportedCrops: 0,
      supportedDiseases: 0
    };
  }

  // Validate response format
  validateResponse(response) {
    if (!response) return false;
    if (!response.response || typeof response.response !== 'string') return false;
    if (response.confidence !== undefined && (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1)) return false;
    return true;
  }

  // Format response for display
  formatResponse(response) {
    if (!this.validateResponse(response)) {
      return this.getErrorResponse(new Error('Invalid response format'));
    }

    return {
      ...response,
      timestamp: Date.now(),
      formatted: this.formatText(response.response),
      suggestions: this.generateSuggestions(response)
    };
  }

  // Format text for better display
  formatText(text) {
    // Convert markdown-style formatting to display format
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n\n/g, '</p><p>') // Paragraphs
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/^/, '<p>') // Start with paragraph
      .replace(/$/, '</p>') // End with paragraph
      .replace(/<p><\/p>/g, '') // Remove empty paragraphs
      .replace(/<p><br><\/p>/g, '<br>'); // Convert paragraph breaks to line breaks
  }

  // Generate contextual suggestions
  generateSuggestions(response) {
    const suggestions = [];
    
    // Add suggestions based on response type
    switch (response.type) {
      case 'crop_specific':
        suggestions.push('Ask about diseases for this crop', 'Get fertilizer recommendations', 'Learn about irrigation needs');
        break;
      case 'disease_diagnosis':
        suggestions.push('Ask about prevention methods', 'Get chemical treatment options', 'Learn about natural remedies');
        break;
      case 'fertilizer_recommendation':
        suggestions.push('Ask about application timing', 'Get dosage information', 'Learn about other fertilizers');
        break;
      case 'scheme_information':
        suggestions.push('Ask about eligibility criteria', 'Get application process', 'Learn about other schemes');
        break;
      case 'weather_advice':
        suggestions.push('Ask about seasonal planning', 'Get crop-specific advice', 'Learn about weather protection');
        break;
      case 'market_prices':
        suggestions.push('Ask about storage options', 'Get market trends', 'Learn about selling strategies');
        break;
      default:
        suggestions.push('Ask about specific crops', 'Get disease information', 'Learn about fertilizers');
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  // Handle multiple questions
  async handleMultipleQuestions(questions) {
    const responses = [];
    
    for (const question of questions) {
      try {
        const response = await this.getResponse(question);
        responses.push(response);
      } catch (error) {
        console.error('Error handling question:', question, error);
        responses.push(this.getErrorResponse(error, question));
      }
    }
    
    return responses;
  }

  // Get conversation context
  getContext() {
    return this.chatbot.context || {};
  }

  // Update conversation context
  updateContext(newContext) {
    this.chatbot.context = { ...this.chatbot.context, ...newContext };
  }

  // Export conversation history
  exportHistory() {
    const history = this.chatbot.context.lastQuestions || [];
    return {
      questions: history,
      stats: this.getStats(),
      health: this.getHealthStatus(),
      exportDate: new Date().toISOString()
    };
  }

  // Search knowledge base
  searchKnowledgeBase(query) {
    // Basic search implementation
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search crops
    Object.entries(this.chatbot.knowledgeBase?.crops || {}).forEach(([crop, info]) => {
      if (crop.includes(queryLower) || info.description.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'crop',
          name: crop,
          description: info.description,
          relevance: this.calculateRelevance(query, info)
        });
      }
    });
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // Calculate search relevance
  calculateRelevance(query, item) {
    const queryLower = query.toLowerCase();
    const text = JSON.stringify(item).toLowerCase();
    
    let score = 0;
    
    // Exact match gets highest score
    if (text.includes(queryLower)) {
      score += 10;
    }
    
    // Partial matches get lower scores
    const queryWords = queryLower.split(' ');
    queryWords.forEach(word => {
      if (text.includes(word)) {
        score += 2;
      }
    });
    
    return score;
  }

  // Get help information
  getHelp() {
    return {
      capabilities: [
        'Crop cultivation advice',
        'Disease diagnosis and treatment',
        'Fertilizer recommendations',
        'Government scheme information',
        'Weather-based advice',
        'Market price information',
        'Pest management',
        'Irrigation guidance'
      ],
      supportedCrops: this.chatbot.knowledgeBase?.getSupportedCrops?.() || [],
      supportedDiseases: this.chatbot.knowledgeBase?.getSupportedDiseases?.() || [],
      tips: [
        'Be specific about your crop and problem',
        'Include details about symptoms',
        'Mention your location for better advice',
        'Ask about specific stages of growth'
      ],
      examples: [
        'How to control blast disease in rice?',
        'What fertilizer dose for wheat?',
        'PM Kisan scheme eligibility?',
        'Tomato late blight treatment?'
      ]
    };
  }
}

export default ImprovedChatbotService;
