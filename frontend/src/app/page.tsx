import { Mic, BrainCircuit, LineChart, MessageSquare, Play, Trophy, Users, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <main className="container mx-auto px-6 py-12 relative z-10 max-w-7xl">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">Agentic<span className="text-primary">Coach</span></h1>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-foreground/80">
            <Link href="#" className="hover:text-primary transition-colors">Dashboard</Link>
            <Link href="#" className="hover:text-primary transition-colors">Practice</Link>
            <Link href="#" className="hover:text-primary transition-colors">Analytics</Link>
            <Link href="#" className="hover:text-primary transition-colors">History</Link>
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium hover:text-primary transition-colors">Sign In</button>
            <button className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40">
              Start Debating
            </button>
          </div>
        </header>

        <section className="flex flex-col items-center text-center mt-12 mb-20 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm font-medium text-primary mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v1.0 AI Reasoning Engine Active
          </div>
          <h2 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight max-w-4xl leading-tight">
            Master the Art of <br/>
            <span className="gradient-text">Persuasion</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/60 max-w-2xl font-light">
            Train against a multi-turn agentic AI opponent. Get real-time feedback on arguments, logical fallacies, and presentation delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/practice" className="flex items-center gap-2 px-8 py-4 rounded-full bg-foreground text-background font-semibold hover:scale-105 transition-transform">
              <Play className="w-5 h-5 fill-current" />
              Start AI Simulation
            </Link>
            <Link href="/practice" className="flex items-center gap-2 px-8 py-4 rounded-full glass-panel font-semibold hover:bg-foreground/5 transition-colors">
              <LineChart className="w-5 h-5 text-primary" />
              View My Analytics
            </Link>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Feature Card 1 */}
          <div className="glass-panel p-8 rounded-3xl hover:border-primary/30 transition-colors group cursor-pointer">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Argument Analysis</h3>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Real-time claim extraction and evidence strength evaluation using advanced LLM reasoning.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="glass-panel p-8 rounded-3xl hover:border-accent/30 transition-colors group cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-bl-full -z-10 group-hover:scale-125 transition-transform"></div>
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Fallacy Detection</h3>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Instantly identifies Ad Hominem, Straw Man, and Red Herring arguments during live debates.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="glass-panel p-8 rounded-3xl hover:border-secondary/30 transition-colors group cursor-pointer">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Presentation Analytics</h3>
            <p className="text-foreground/60 text-sm leading-relaxed">
              Audio feature extraction measures speaking pace, filler words, and confidence estimation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
