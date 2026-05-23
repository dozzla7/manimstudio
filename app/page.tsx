'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Textarea, Select } from '@/components/ui';
import { generateVideo } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [options, setOptions] = useState<{
    style: '3blue1brown' | 'minimal' | 'dark' | 'custom';
    quality: 'low' | 'medium' | 'high';
    duration: number;
  }>({
    style: '3blue1brown',
    quality: 'low',
    duration: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (prompt.length < 10) {
      setError('Please provide a more detailed prompt (at least 10 characters)');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await generateVideo({
        prompt,
        options,
      });
      
      router.push(`/project/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsLoading(false);
    }
  };

  const examplePrompts = [
    {
      title: 'Derivatives',
      prompt: 'Explain how derivatives work visually, showing the tangent line approaching a point on a curve and how the slope relates to the rate of change',
    },
    {
      title: 'Fourier Series',
      prompt: 'Visualize how a square wave can be built from sine waves, showing the Fourier series approximation with increasing terms',
    },
    {
      title: 'Matrix Transform',
      prompt: 'Show a 2D linear transformation applied to a square, demonstrating how a matrix stretches and rotates shapes',
    },
    {
      title: 'Neural Network',
      prompt: 'Animate a simple neural network forward pass, showing how inputs flow through layers with weighted connections',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        
        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-semibold">Manim Studio</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
               className="text-zinc-400 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#examples" className="text-zinc-400 hover:text-white transition-colors">
              Examples
            </a>
          </div>
        </nav>
        
        {/* Main Content */}
        <main className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-24">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Turn Ideas into<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Mathematical Animations
              </span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Create stunning educational visualizations in the style of 3Blue1Brown.
              Just describe what you want to see, and AI will generate the Manim code.
            </p>
          </div>
          
          {/* Input Form */}
          <Card variant="glass" className="mb-8">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit}>
                <Textarea
                  placeholder="Describe the mathematical concept or visualization you want to create...&#10;&#10;Example: Show how the derivative of x² gives the slope of the tangent line at each point, animating the tangent moving along the parabola"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[140px] text-base"
                />
                
                {error && (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                )}
                
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      label="Style"
                      value={options.style}
                      onChange={(e) => setOptions({ ...options, style: e.target.value as '3blue1brown' | 'minimal' | 'dark' | 'custom' })}
                      options={[
                        { value: '3blue1brown', label: '3Blue1Brown' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'dark', label: 'Dark Neon' },
                      ]}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      label="Quality"
                      value={options.quality}
                      onChange={(e) => setOptions({ ...options, quality: e.target.value as 'low' | 'medium' | 'high' })}
                      options={[
                        { value: 'low', label: 'Preview (Fast)' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High Quality' },
                      ]}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[150px]">
                    <Select
                      label="Duration"
                      value={options.duration.toString()}
                      onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) })}
                      options={[
                        { value: '30', label: 'Short (~30s)' },
                        { value: '60', label: 'Medium (~1min)' },
                        { value: '120', label: 'Long (~2min)' },
                      ]}
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isLoading}
                    disabled={isLoading || prompt.length < 10}
                    className="min-w-[180px]"
                  >
                    {isLoading ? 'Generating...' : 'Generate Animation'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Example Prompts */}
          <div id="examples">
            <h2 className="text-lg font-medium text-zinc-400 mb-4">Try these examples</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {examplePrompts.map((example) => (
                <button
                  key={example.title}
                  onClick={() => setPrompt(example.prompt)}
                  className="text-left p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white group-hover:text-violet-400 transition-colors">
                      {example.title}
                    </span>
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2">{example.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
      
      {/* Features Section */}
      <div className="border-t border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Describe</h3>
              <p className="text-zinc-400 text-sm">
                Write a natural language description of the mathematical concept you want to visualize
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Generate</h3>
              <p className="text-zinc-400 text-sm">
                AI creates a storyboard and writes optimized Manim code for each scene
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" suppressHydrationWarning>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Render</h3>
              <p className="text-zinc-400 text-sm">
                Watch as your animation renders in real-time, scene by scene
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">
            Built with Manim, Next.js, and AI
          </p>
          <p className="text-zinc-600 text-sm">
            Inspired by 3Blue1Brown
          </p>
        </div>
      </footer>
    </div>
  );
}
