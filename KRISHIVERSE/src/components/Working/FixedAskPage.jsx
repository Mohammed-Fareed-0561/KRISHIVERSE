import React, { useState } from "react";

export default function FixedAskPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSend = () => {
    if (input.trim()) {
      setMessages(prev => [...prev, { type: 'user', text: input }]);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-6">Ask Assistant - Fixed Version</h1>
        
        <div className="card bg-base-100 shadow-sm border border-base-200 mb-4">
          <div className="card-body">
            <div className="form-control">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question here..."
                className="input input-bordered w-full"
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            
            <button onClick={handleSend} className="btn btn-primary w-full mt-4">
              Send
            </button>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>
            {messages.length === 0 ? (
              <p className="text-base-content/60">No messages yet. Send a message to test.</p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg, index) => (
                  <div key={index} className={`p-3 rounded ${msg.type === 'user' ? 'bg-primary/10 ml-8' : 'bg-base-200'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
