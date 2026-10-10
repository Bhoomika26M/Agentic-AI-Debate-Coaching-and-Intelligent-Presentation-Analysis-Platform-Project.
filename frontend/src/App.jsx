import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col items-center justify-center p-6 text-center">
      <div className="relative p-1 rounded-2xl bg-gradient-to-r from-arena-amber via-arena-prop to-arena-opp max-w-xl w-full mb-8">
        <div className="bg-arena-bg-card p-8 rounded-xl backdrop-blur-sm border border-white/5">
          <div className="inline-block px-3 py-1 rounded-full bg-arena-amber/10 text-arena-amber text-xs uppercase tracking-widest font-semibold mb-4">
            Milestone 1 Scaffolding
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
            The Arena
          </h1>
          <p className="text-arena-muted text-base sm:text-lg mb-6">
            Agentic AI Debate Coach & Intelligent Presentation Analysis Platform
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-arena-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-arena-prop"></span>
              Proposition
            </span>
            <span>vs</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-arena-opp"></span>
              Opposition
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
