import React from "react";

export default function TestComponent() {
  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-4">Test Page</h1>
        <p className="text-base-content mb-4">This is a test to verify components are rendering.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Ask Page Test</h2>
            <p className="text-sm text-base-content/60">
              If the ask page is working, you should see this card with proper styling.
            </p>
            <button className="btn btn-primary">
              Test Button
            </button>
          </div>
          
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-2">Diagnosis Page Test</h2>
            <p className="text-sm text-base-content/60">
              If the diagnosis page is working, you should see this card with proper styling.
            </p>
            <button className="btn btn-primary">
              Test Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
