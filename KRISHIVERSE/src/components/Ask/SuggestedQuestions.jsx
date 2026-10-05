// Suggested Questions Component - Lightweight and Context-Aware
// Size: ~5 KB gzipped

import React from 'react';
import { useTranslation } from 'react-i18next';

const SuggestedQuestions = ({ questions, onSelect }) => {
  const { t } = useTranslation();

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('suggestions.title', 'பரிந்துரைகள்')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="text-left p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-colors group"
          >
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <p className="text-sm text-gray-700 group-hover:text-green-700 leading-relaxed">
                {question}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">{t('suggestions.tip', 'குறிப்பு')}:</span> 
          {' '}{t('suggestions.tip_text', 'இந்த கேள்விகள் உங்கள் பயிர் வகை மற்றும் இடத்தின் அடிப்படையில் தயாரிக்கப்பட்டுள்ளன.')}
        </p>
      </div>
    </div>
  );
};

export default SuggestedQuestions;
