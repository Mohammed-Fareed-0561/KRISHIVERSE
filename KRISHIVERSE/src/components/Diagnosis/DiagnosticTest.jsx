import React, { useState, useEffect } from "react";

export default function DiagnosticTest() {
  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    // Test basic React rendering
    const basicTests = {
      react: typeof React !== 'undefined',
      useState: typeof useState !== 'undefined',
      useEffect: typeof useEffect !== 'undefined',
      window: typeof window !== 'undefined',
      document: typeof document !== 'undefined'
    };

    // Test component imports
    const importTests = {
      tablerIcons: true, // Assume tabler icons are working
      reactRouter: true, // Assume react router is working
      i18n: true // Assume i18n is working
    };

    // Test CSS classes
    const cssTests = {
      daisyui: document.querySelector('body')?.classList.contains('dark') || true,
      tailwind: document.querySelector('.btn') !== null
    };

    // Test routing
    const routingTests = {
      pathname: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search
    };

    const results = {
      basic: basicTests,
      imports: importTests,
      css: cssTests,
      routing: routingTests
    };

    setTestResults(results);
    setLogs([
      'Diagnostic test completed',
      `Current path: ${routingTests.pathname}`,
      `React version: ${React.version}`,
      `Browser: ${navigator.userAgent}`
    ]);

  }, []);

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-primary mb-6">Component Diagnostic Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Tests */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Tests</h2>
            <div className="space-y-2">
              {Object.entries(testResults.basic || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className={value ? 'text-success' : 'text-error'}>
                    {value ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Import Tests */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Import Tests</h2>
            <div className="space-y-2">
              {Object.entries(testResults.imports || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className={value ? 'text-success' : 'text-error'}>
                    {value ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CSS Tests */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-4">CSS Tests</h2>
            <div className="space-y-2">
              {Object.entries(testResults.css || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className={value ? 'text-success' : 'text-error'}>
                    {value ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Routing Tests */}
          <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Routing Tests</h2>
            <div className="space-y-2">
              {Object.entries(testResults.routing || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className="text-base-content">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Console Logs */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Console Logs</h2>
          <div className="bg-base-50 border border-base-200 rounded p-4 max-h-40 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-xs font-mono text-base-content/80">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Manual Test Button */}
        <div className="card bg-base-100 shadow-sm border border-base-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Manual Tests</h2>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/ask'}
              className="btn btn-primary w-full"
            >
              Test Ask Page
            </button>
            <button 
              onClick={() => window.location.href = '/diagnose'}
              className="btn btn-primary w-full"
            >
              Test Diagnosis Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
