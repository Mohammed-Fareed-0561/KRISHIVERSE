// Voice Controls Component - Lightweight and Optimized
// Size: ~8 KB gzipped

import React from 'react';
import { useTranslation } from 'react-i18next';

const VoiceControls = ({ 
  isListening, 
  isSpeaking, 
  onStart, 
  onStop, 
  onSpeak, 
  onCancel 
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-900">
          {t('voice.controls', 'குரல் கட்டுப்பாடுகள்')}
        </h3>
        <div className="flex items-center space-x-2">
          {isListening && (
            <span className="flex items-center text-red-600">
              <span className="animate-pulse w-2 h-2 bg-red-600 rounded-full mr-2"></span>
              {t('voice.listening', 'கேட்கிறது...')}
            </span>
          )}
          {isSpeaking && (
            <span className="flex items-center text-green-600">
              <span className="animate-pulse w-2 h-2 bg-green-600 rounded-full mr-2"></span>
              {t('voice.speaking', 'பேசுகிறது...')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={isListening ? onStop : onStart}
          className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
            isListening
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          {isListening 
            ? t('voice.stop', 'நிறுத்து') 
            : t('voice.start', 'தொடங்கு')
          }
        </button>

        <button
          onClick={onSpeak}
          disabled={isSpeaking}
          className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          {t('voice.speak_response', 'பதிலை கேட்க')}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('voice.cancel', 'ரத்து செய்')}
          </button>
        )}
      </div>

      {/* Voice Tips */}
      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          {t('voice.tips', 'குரல் உதவிக்குறிப்புகள்')}
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• {t('voice.tip1', 'தெளிவாகவும் வேகமாகவும் பேசுங்கள்')}</li>
          <li>• {t('voice.tip2', 'விவசாய சொற்களைப் பயன்படுத்துங்கள்')}</li>
          <li>• {t('voice.tip3', 'அமைதியில் இருந்து பேசுங்கள்')}</li>
          <li>• {t('voice.tip4', 'தமிழ் உச்சரிப்புடன் பேசுங்கள்')}</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceControls;
