import { useState, useEffect, useRef, useCallback } from "react";
import ImprovedVoiceService from "../services/voice/ImprovedVoiceService.js";
import { useTranslation } from 'react-i18next';

export function useVoice() {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Map app languages to Web Speech API language codes
  const getLangCode = useCallback(() => {
    const lang = i18n.language || 'en';
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN',
    };
    return langMap[lang] || 'en-US';
  }, [i18n.language]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined' && 
        (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const voiceService = new ImprovedVoiceService();
      recognitionRef.current = voiceService;

      // Set up event handlers
      voiceService.onStart = () => setIsListening(true);
      voiceService.onResult = (result) => {
        setTranscript(result.transcript);
        setIsListening(false);
      };
      voiceService.onInterim = (partial) => {
        setTranscript(partial);
      };
      voiceService.onError = (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      };
      voiceService.onEnd = () => setIsListening(false);

      // Initialize recognition with correct language
      const langCode = getLangCode();
      voiceService.setLanguage(langCode);
    }
  }, [getLangCode]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.startListening({
        onStart: () => setIsListening(true),
        onInterim: (partial) => {
          setTranscript(partial);
        },
        onResult: (result) => {
          setTranscript(result.transcript);
          setIsListening(false);
        },
        onError: (error) => {
          console.error('Speech recognition error:', error);
          setIsListening(false);
        },
        onEnd: () => setIsListening(false),
      });
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stopListening();
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLangCode();
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, [getLangCode]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    hasSupport: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}
