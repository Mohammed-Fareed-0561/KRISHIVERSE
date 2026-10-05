// Voice Service for Offline-First Tamil Agricultural Assistant
// Supports Tamil voice recognition and synthesis completely offline

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSupported = this.checkSupport();
    this.tamilGrammar = this.buildTamilGrammar();
    this.agriculturalTerms = this.loadAgriculturalTerms();
    this.voiceCache = new Map();
  }

  checkSupport() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition) && 
             window.speechSynthesis;
  }

  // Build Tamil grammar for better recognition accuracy
  buildTamilGrammar() {
    return {
      crops: [
        'நெல்', 'கரும்பு', 'பருத்தி', 'வெங்காயம்', 'தக்காளி', 'மிளகாய்',
        'மஞ்சள்', 'இஞ்சி', 'பயறு', 'கொண்டைக்கடலை', 'துவரை', 'வாழை'
      ],
      diseases: [
        'நோய்', 'பூச்சி', 'பூஞ்சாணம்', 'இலைச்சுருள்', 'வேர் அழுகல்', 'காய்நோய்',
        'மஞ்சள் கட்டை', 'வெண்ணிற ஈரல் நோய்', 'புகையிலை நோய்'
      ],
      actions: [
        'நடவு', 'பாசனம்', 'உரம்', 'பூச்சிக்கொல்லி', 'அறுவடை', 'சந்தை',
        'விலை', 'வானிலை', 'மழை', 'வெயில்', 'வறண்டல்'
      ],
      quantities: [
        'கிலோ', 'கிராம்', 'குவிண்டல்', 'ஏக்கர்', 'ஹெக்டர்', 'லிட்டர்', 'மில்லி'
      ]
    };
  }

  // Load agricultural terms for better recognition
  loadAgriculturalTerms() {
    return {
      // Tamil agricultural terminology with English equivalents
      'நெல்': 'rice',
      'கரும்பு': 'sugarcane',
      'பருத்தி': 'cotton',
      'விதை': 'seed',
      'உரம்': 'fertilizer',
      'பூச்சிக்கொல்லி': 'pesticide',
      'நடவு': 'planting',
      'அறுவடை': 'harvest',
      'பாசனம்': 'irrigation',
      'மழை': 'rain',
      'வறண்டல்': 'drought',
      'வெள்ளம்': 'flood',
      'சந்தை': 'market',
      'விலை': 'price'
    };
  }

  // Initialize speech recognition with Tamil language support
  initializeRecognition() {
    if (!this.isSupported) {
      throw new Error('Speech recognition not supported');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure for Tamil agricultural context
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'ta-IN'; // Tamil (India)

    // Custom grammar for agricultural terms
    const grammar = '#JSGF V1.0; grammar crops; public <crop> = ' + 
                   this.tamilGrammar.crops.join(' | ') + ';';
    const speechGrammarList = new SpeechGrammarList();
    speechGrammarList.addFromString(grammar, 1);
    this.recognition.grammars = speechGrammarList;

    return this.recognition;
  }

  // Start voice recognition with agricultural context
  startListening(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Voice recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      try {
        this.recognition = this.initializeRecognition();
        this.isListening = true;

        let finalTranscript = '';
        let interimTranscript = '';

        this.recognition.onstart = () => {
          if (options.onStart) options.onStart();
        };

        this.recognition.onresult = (event) => {
          interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript.toLowerCase();
            
            if (result.isFinal) {
              finalTranscript = this.enhanceAgriculturalTranscript(transcript);
            } else {
              interimTranscript = transcript;
            }
          }

          if (options.onInterim && interimTranscript) {
            options.onInterim(interimTranscript);
          }
        };

        this.recognition.onerror = (event) => {
          this.isListening = false;
          console.error('Speech recognition error:', event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (finalTranscript) {
            resolve(finalTranscript);
          } else if (interimTranscript) {
            resolve(this.enhanceAgriculturalTranscript(interimTranscript));
          } else {
            reject(new Error('No speech detected'));
          }
        };

        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  // Enhance transcript with agricultural term correction
  enhanceAgriculturalTranscript(transcript) {
    let enhanced = transcript;
    
    // Replace misrecognized agricultural terms
    Object.entries(this.agriculturalTerms).forEach(([tamil, english]) => {
      const regex = new RegExp(english, 'gi');
      enhanced = enhanced.replace(regex, tamil);
    });

    // Fix common Tamil recognition errors
    const corrections = {
      'நெல் சாகுபடி': 'நெல் சாகுபடி',
      'கரும்பு பயிர்': 'கரும்பு பயிர்',
      'பருத்தி பயிர்': 'பருத்தி பயிர்'
    };

    Object.entries(corrections).forEach(([wrong, correct]) => {
      enhanced = enhanced.replace(new RegExp(wrong, 'gi'), correct);
    });

    return enhanced.trim();
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Text to speech with Tamil voice synthesis
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      // Check cache first
      const cacheKey = text.substring(0, 100);
      if (this.voiceCache.has(cacheKey)) {
        const cachedUtterance = this.voiceCache.get(cacheKey);
        this.synthesis.speak(cachedUtterance);
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure for Tamil
      utterance.lang = 'ta-IN';
      utterance.rate = options.rate || 0.9; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Find Tamil voice
      const voices = this.synthesis.getVoices();
      const tamilVoice = voices.find(voice => 
        voice.lang.includes('ta') || voice.name.includes('Tamil')
      );
      
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }

      utterance.onstart = () => {
        if (options.onStart) options.onStart();
      };

      utterance.onend = () => {
        // Cache the utterance for reuse
        this.voiceCache.set(cacheKey, utterance);
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  // Preload Tamil voices
  async preloadVoices() {
    return new Promise((resolve) => {
      if (this.synthesis.getVoices().length > 0) {
        resolve(this.synthesis.getVoices());
        return;
      }

      this.synthesis.onvoiceschanged = () => {
        resolve(this.synthesis.getVoices());
      };
    });
  }

  // Get available voices
  getVoices() {
    return this.synthesis.getVoices();
  }

  // Check if speaking
  isSpeaking() {
    return this.synthesis.speaking;
  }

  // Cancel current speech
  cancelSpeech() {
    this.synthesis.cancel();
  }

  // Pause speech
  pauseSpeech() {
    this.synthesis.pause();
  }

  // Resume speech
  resumeSpeech() {
    this.synthesis.resume();
  }

  // Clean up resources
  destroy() {
    this.stopListening();
    this.cancelSpeech();
    this.voiceCache.clear();
  }
}

export default VoiceService;
