import React, { useState } from "react";

export default function FarmerAskPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "My plant is yellow",
    "When to water crops?",
    "What fertilizer to use?",
    "Pest problem help",
    "Best planting time?"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: question,
      sender: "user"
    };

    setMessages([...messages, userMessage]);
    setQuestion("");
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: getAIResponse(question),
        sender: "ai"
      };
      setMessages(prev => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  const getAIResponse = (userQuestion) => {
    const responses = [
      "Water plants early morning. Give 1 inch water per week.",
      "Use cow dung fertilizer. Mix with soil well.",
      "Check leaves for pests. Use neem oil spray.",
      "Plant seeds after rain. Soil should be moist.",
      "Remove yellow leaves. Check soil nutrients."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-blue-600 rounded-3xl p-8 text-white text-center mb-8">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold mb-4">Ask Farm Help</h1>
          <p className="text-2xl">Get answers to your farming questions</p>
        </div>

        {/* Quick Questions */}
        <div className="bg-white rounded-3xl p-6 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Quick Questions</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickQuestions.map((quickQuestion, index) => (
              <button
                key={index}
                onClick={() => setQuestion(quickQuestion)}
                className="bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-2xl p-6 transition-all"
              >
                <div className="text-xl font-bold text-green-800">{quickQuestion}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="h-80 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">How can I help?</h3>
                <p className="text-xl text-gray-600">Ask any farming question</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-4 ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-md px-6 py-4 rounded-2xl text-xl ${
                      message.sender === "user"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-6 py-4 rounded-2xl">
                  <div className="flex items-center gap-3 text-xl">
                    <div className="w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t-4 border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your farming question here..."
                className="flex-1 px-6 py-4 border-4 border-gray-300 rounded-2xl text-xl focus:outline-none focus:ring-4 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Send</span>
                  </div>
                ) : (
                  <span>Send 📤</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
