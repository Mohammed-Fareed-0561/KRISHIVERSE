// Performance Monitor - Tracks app performance and user analytics
// Provides insights for continuous optimization

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: null,
      renderTime: null,
      apiResponseTime: {},
      voiceResponseTime: {},
      aiInferenceTime: {},
      bundleSize: null,
      memoryUsage: [],
      cacheHitRate: 0,
      userInteractions: 0,
      errors: []
    };
    this.observers = [];
    this.isMonitoring = false;
    this.startTime = null;
    this.sessionId = this.generateSessionId();
  }

  // Generate unique session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Start monitoring
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = performance.now();
    
    // Monitor page load
    this.monitorPageLoad();
    
    // Monitor API calls
    this.monitorAPIPerformance();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor user interactions
    this.monitorUserInteractions();
    
    // Monitor errors
    this.monitorErrors();
    
    console.log('Performance monitoring started');
  }

  // Monitor page load performance
  monitorPageLoad() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const navigation = entries[0];
        this.metrics.loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        
        // Calculate render time
        this.metrics.renderTime = Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
      }
    }

    // Monitor bundle size
    this.monitorBundleSize();
  }

  // Monitor bundle size
  monitorBundleSize() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('resource');
      let totalSize = 0;
      let jsSize = 0;
      
      entries.forEach(entry => {
        if (entry.transferSize) {
          totalSize += entry.transferSize;
          if (entry.name.endsWith('.js')) {
            jsSize += entry.transferSize;
          }
        }
      });
      
      this.metrics.bundleSize = {
        total: totalSize,
        javascript: jsSize,
        compressed: jsSize * 0.3 // Estimated compression ratio
      };
    }
  }

  // Monitor API performance
  monitorAPIPerformance() {
    // Override fetch to monitor API calls
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = async function(...args) {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // Log API performance
        self.logAPIPerformance(url, duration, response.status);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        // Log API error
        self.logAPIPerformance(url, duration, 'error', error);
        
        throw error;
      }
    };
  }

  // Log API performance
  logAPIPerformance(url, duration, status, error = null) {
    const apiType = this.getAPIType(url);
    
    if (!this.metrics.apiResponseTime[apiType]) {
      this.metrics.apiResponseTime[apiType] = [];
    }
    
    this.metrics.apiResponseTime[apiType].push({
      url,
      duration,
      status,
      timestamp: Date.now(),
      error: error?.message
    });
    
    // Keep only last 50 entries per API type
    if (this.metrics.apiResponseTime[apiType].length > 50) {
      this.metrics.apiResponseTime[apiType].shift();
    }
  }

  // Get API type from URL
  getAPIType(url) {
    if (url.includes('/api/weather')) return 'weather';
    if (url.includes('/api/prices')) return 'prices';
    if (url.includes('/api/schemes')) return 'schemes';
    if (url.includes('/api/chat')) return 'chat';
    if (url.includes('openweathermap.org')) return 'weather-external';
    if (url.includes('agmarknet.gov.in')) return 'prices-external';
    return 'unknown';
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if (!('performance' in window && 'memory' in performance.memory)) {
      return;
    }
    
    const checkMemory = () => {
      const memory = performance.memory;
      const usage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
        timestamp: Date.now()
      };
      
      this.metrics.memoryUsage.push(usage);
      
      // Keep only last 100 entries
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }
    };
    
    // Check memory every 5 seconds
    setInterval(checkMemory, 5000);
    checkMemory(); // Initial check
  }

  // Monitor user interactions
  monitorUserInteractions() {
    const interactions = ['click', 'touchstart', 'keydown', 'scroll'];
    
    const logInteraction = () => {
      this.metrics.userInteractions++;
    };
    
    interactions.forEach(event => {
      document.addEventListener(event, logInteraction, { passive: true });
    });
  }

  // Monitor errors
  monitorErrors() {
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  // Log error
  logError(error) {
    this.metrics.errors.push(error);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }

  // Log voice performance
  logVoicePerformance(type, duration, success = true) {
    if (!this.metrics.voiceResponseTime[type]) {
      this.metrics.voiceResponseTime[type] = [];
    }
    
    this.metrics.voiceResponseTime[type].push({
      duration,
      success,
      timestamp: Date.now()
    });
    
    // Keep only last 20 entries per voice type
    if (this.metrics.voiceResponseTime[type].length > 20) {
      this.metrics.voiceResponseTime[type].shift();
    }
  }

  // Log AI inference performance
  logAIInference(model, inputSize, outputSize, duration, confidence) {
    if (!this.metrics.aiInferenceTime[model]) {
      this.metrics.aiInferenceTime[model] = [];
    }
    
    this.metrics.aiInferenceTime[model].push({
      inputSize,
      outputSize,
      duration,
      confidence,
      timestamp: Date.now()
    });
    
    // Keep only last 30 entries per model
    if (this.metrics.aiInferenceTime[model].length > 30) {
      this.metrics.aiInferenceTime[model].shift();
    }
  }

  // Update cache hit rate
  updateCacheHitRate(hitRate) {
    this.metrics.cacheHitRate = hitRate;
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      sessionDuration: this.startTime ? Math.round(performance.now() - this.startTime) : 0,
      loadTime: this.metrics.loadTime,
      renderTime: this.metrics.renderTime,
      bundleSize: this.metrics.bundleSize,
      userInteractions: this.metrics.userInteractions,
      cacheHitRate: this.metrics.cacheHitRate,
      errors: this.metrics.errors.length
    };
    
    // API performance summary
    summary.apiPerformance = {};
    Object.entries(this.metrics.apiResponseTime).forEach(([type, entries]) => {
      if (entries.length > 0) {
        const durations = entries.map(e => e.duration);
        const successRate = entries.filter(e => e.status < 400).length / entries.length * 100;
        
        summary.apiPerformance[type] = {
          averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          minResponseTime: Math.min(...durations),
          maxResponseTime: Math.max(...durations),
          totalRequests: entries.length,
          successRate: Math.round(successRate)
        };
      }
    });
    
    // Voice performance summary
    summary.voicePerformance = {};
    Object.entries(this.metrics.voiceResponseTime).forEach(([type, entries]) => {
      if (entries.length > 0) {
        const durations = entries.map(e => e.duration);
        const successRate = entries.filter(e => e.success).length / entries.length * 100;
        
        summary.voicePerformance[type] = {
          averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          minResponseTime: Math.min(...durations),
          maxResponseTime: Math.max(...durations),
          totalRequests: entries.length,
          successRate: Math.round(successRate)
        };
      }
    });
    
    // AI inference summary
    summary.aiInference = {};
    Object.entries(this.metrics.aiInferenceTime).forEach(([model, entries]) => {
      if (entries.length > 0) {
        const durations = entries.map(e => e.duration);
        const confidences = entries.map(e => e.confidence).filter(c => c !== undefined);
        
        summary.aiInference[model] = {
          averageInferenceTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          minInferenceTime: Math.min(...durations),
          maxInferenceTime: Math.max(...durations),
          totalInferences: entries.length,
          averageConfidence: confidences.length > 0 ? 
            Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length * 100) / 100 : null
        };
      }
    });
    
    // Memory usage summary
    if (this.metrics.memoryUsage.length > 0) {
      const memoryData = this.metrics.memoryUsage;
      summary.memoryUsage = {
        averageUsed: Math.round(memoryData.reduce((a, b) => a + b.used, 0) / memoryData.length),
        peakUsed: Math.max(...memoryData.map(m => m.used)),
        averagePercentage: Math.round(memoryData.reduce((a, b) => a + b.percentage, 0) / memoryData.length),
        peakPercentage: Math.max(...memoryData.map(m => m.percentage))
      };
    }
    
    return summary;
  }

  // Get performance score
  getPerformanceScore() {
    const summary = this.getPerformanceSummary();
    let score = 100;
    
    // Load time score (40% weight)
    if (summary.loadTime) {
      if (summary.loadTime < 1000) score -= 0;
      else if (summary.loadTime < 2000) score -= 10;
      else if (summary.loadTime < 3000) score -= 20;
      else score -= 30;
    }
    
    // API response time score (20% weight)
    let avgApiResponseTime = 0;
    let apiCount = 0;
    Object.values(summary.apiPerformance).forEach(perf => {
      avgApiResponseTime += perf.averageResponseTime;
      apiCount++;
    });
    if (apiCount > 0) {
      avgApiResponseTime /= apiCount;
      if (avgApiResponseTime < 500) score -= 0;
      else if (avgApiResponseTime < 1000) score -= 5;
      else if (avgApiResponseTime < 2000) score -= 10;
      else score -= 15;
    }
    
    // Memory usage score (20% weight)
    if (summary.memoryUsage) {
      if (summary.memoryUsage.averagePercentage < 50) score -= 0;
      else if (summary.memoryUsage.averagePercentage < 70) score -= 5;
      else if (summary.memoryUsage.averagePercentage < 85) score -= 10;
      else score -= 15;
    }
    
    // Error rate score (20% weight)
    const errorRate = summary.errors / Math.max(summary.userInteractions, 1) * 100;
    if (errorRate < 1) score -= 0;
    else if (errorRate < 5) score -= 5;
    else if (errorRate < 10) score -= 10;
    else score -= 20;
    
    return Math.max(0, Math.round(score));
  }

  // Send performance data to analytics
  async sendToAnalytics() {
    const summary = this.getPerformanceSummary();
    
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(summary)
      });
    } catch (error) {
      console.warn('Failed to send performance data:', error);
    }
  }

  // Export performance data
  exportData() {
    const summary = this.getPerformanceSummary();
    const dataStr = JSON.stringify(summary, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `krishiverse-performance-${Date.now()}.json`;
    link.click();
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics = {
      loadTime: null,
      renderTime: null,
      apiResponseTime: {},
      voiceResponseTime: {},
      aiInferenceTime: {},
      bundleSize: null,
      memoryUsage: [],
      cacheHitRate: 0,
      userInteractions: 0,
      errors: []
    };
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export default PerformanceMonitor;
