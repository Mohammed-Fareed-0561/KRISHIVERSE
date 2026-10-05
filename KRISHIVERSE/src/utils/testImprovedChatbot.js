// Test utility for Improved Chatbot Service
// Run this in browser console to test the enhanced chatbot

import ImprovedChatbotService from '../services/ai/ImprovedChatbotService.js';

export async function testImprovedChatbot() {
  console.log('🧪 Testing Improved Chatbot Service...');
  
  const chatbot = new ImprovedChatbotService();
  
  // Test 1: Initialize chatbot
  console.log('✅ Test 1: Initializing chatbot...');
  try {
    const initialized = await chatbot.initialize();
    console.log('   Status:', initialized ? '✅ Success' : '❌ Failed');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 2: Basic crop questions
  console.log('✅ Test 2: Testing crop-specific questions...');
  const cropQuestions = [
    'How to grow rice?',
    'What fertilizer dose for wheat?',
    'Tomato disease treatment?',
    'Cotton cultivation tips?'
  ];
  
  for (const question of cropQuestions) {
    try {
      const response = await chatbot.getResponse(question, { language: 'en' });
      console.log(`   Q: ${question}`);
      console.log(`   A: ${response.response.substring(0, 100)}...`);
      console.log(`   Confidence: ${response.confidence}`);
      console.log(`   Type: ${response.type}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error for "${question}":`, error.message);
    }
  }
  
  // Test 3: Error handling
  console.log('✅ Test 3: Testing error handling...');
  try {
    const response = await chatbot.getResponse('', { language: 'en' });
    console.log('   Empty question handled:', response.type);
  } catch (error) {
    console.log('   Empty question error handled:', error.message);
  }
  
  try {
    const response = await chatbot.getResponse('invalid input', { language: 'invalid' });
    console.log('   Invalid input handled:', response.type);
  } catch (error) {
    console.log('   Invalid input error handled:', error.message);
  }
  
  // Test 4: Context awareness
  console.log('✅ Test 4: Testing context awareness...');
  try {
    const response = await chatbot.getResponse('What fertilizer should I use?', {
      language: 'en',
      userLocation: 'Tamil Nadu',
      currentSeason: 'kharif',
      cropTypes: ['rice']
    });
    console.log('   Context-aware response:', response.type);
    console.log('   Response includes location:', response.response.includes('Tamil Nadu'));
  } catch (error) {
    console.log('   Context test error:', error.message);
  }
  
  // Test 5: Health status
  console.log('✅ Test 5: Checking service health...');
  const health = chatbot.getHealthStatus();
  console.log('   Health status:', health.status);
  console.log('   Error count:', health.errorCount);
  console.log('   Cache size:', health.cacheSize);
  
  // Test 6: Statistics
  console.log('✅ Test 6: Getting service statistics...');
  const stats = chatbot.getStats();
  console.log('   Supported crops:', stats.supportedCrops);
  console.log('   Supported diseases:', stats.supportedDiseases);
  console.log('   Knowledge base size:', stats.knowledgeBaseSize);
  
  // Test 7: Help information
  console.log('✅ Test 7: Getting help information...');
  const help = chatbot.getHelp();
  console.log('   Capabilities:', help.capabilities.length);
  console.log('   Examples:', help.examples);
  
  console.log('🎉 Improved Chatbot Service test completed!');
  
  return {
    success: true,
    health,
    stats,
    help
  };
}

// Test specific scenarios
export async function testSpecificScenarios() {
  console.log('🧪 Testing Specific Scenarios...');
  
  const chatbot = new ImprovedChatbotService();
  await chatbot.initialize();
  
  const scenarios = [
    {
      name: 'Disease Diagnosis',
      question: 'My rice plants have yellow spots and brown lesions',
      expectedType: 'disease_diagnosis'
    },
    {
      name: 'Fertilizer Recommendation',
      question: 'How much DAP fertilizer for wheat?',
      expectedType: 'fertilizer_recommendation'
    },
    {
      name: 'Scheme Information',
      question: 'Tell me about PM Kisan scheme',
      expectedType: 'scheme_information'
    },
    {
      name: 'Weather Advice',
      question: 'What to do during monsoon season?',
      expectedType: 'weather_advice'
    },
    {
      name: 'Market Information',
      question: 'Current price for tomatoes?',
      expectedType: 'market_prices'
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    try {
      const response = await chatbot.getResponse(scenario.question);
      console.log(`   Expected: ${scenario.expectedType}`);
      console.log(`   Actual: ${response.type}`);
      console.log(`   Match: ${response.type === scenario.expectedType ? '✅' : '❌'}`);
      console.log(`   Confidence: ${response.confidence}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Specific scenarios test completed!');
}

// Test error recovery
export async function testErrorRecovery() {
  console.log('🧪 Testing Error Recovery...');
  
  const chatbot = new ImprovedChatbotService();
  await chatbot.initialize();
  
  // Simulate multiple errors
  for (let i = 0; i < 3; i++) {
    try {
      await chatbot.getResponse('');
    } catch (error) {
      console.log(`   Error ${i + 1}: ${error.message}`);
    }
  }
  
  // Check if service still works
  try {
    const response = await chatbot.getResponse('How to grow rice?');
    console.log('   ✅ Service recovered successfully');
    console.log('   Response type:', response.type);
  } catch (error) {
    console.log('   ❌ Service failed to recover:', error.message);
  }
  
  console.log('🎉 Error recovery test completed!');
}

// Performance test
export async function testPerformance() {
  console.log('🧪 Testing Performance...');
  
  const chatbot = new ImprovedChatbotService();
  await chatbot.initialize();
  
  const questions = [
    'How to grow rice?',
    'What fertilizer for wheat?',
    'Tomato disease treatment?',
    'Cotton cultivation tips?',
    'PM Kisan scheme details?'
  ];
  
  const startTime = performance.now();
  
  for (const question of questions) {
    const questionStart = performance.now();
    await chatbot.getResponse(question);
    const questionEnd = performance.now();
    console.log(`   "${question}": ${(questionEnd - questionStart).toFixed(2)}ms`);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = totalTime / questions.length;
  
  console.log(`\n📊 Performance Results:`);
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average per question: ${averageTime.toFixed(2)}ms`);
  console.log(`   Questions per second: ${(1000 / averageTime).toFixed(2)}`);
  
  console.log('🎉 Performance test completed!');
}

// Auto-run tests if in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment to auto-run tests
  // testImprovedChatbot();
  // testSpecificScenarios();
  // testErrorRecovery();
  // testPerformance();
}

export default {
  testImprovedChatbot,
  testSpecificScenarios,
  testErrorRecovery,
  testPerformance
};
