'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, Badge } from '@/components/ui';
import { getProjectStatus, ProjectStatusResponse, getVideoUrl } from '@/lib/api';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [data, setData] = useState<ProjectStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  
  const fetchStatus = useCallback(async () => {
    try {
      const result = await getProjectStatus(projectId);
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    fetchStatus();
    
    // Poll for updates if not completed
    const interval = setInterval(() => {
      if (data?.project.status !== 'completed' && data?.project.status !== 'failed') {
        fetchStatus();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [projectId, data?.project.status, fetchStatus]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'rendering':
      case 'generating': return 'warning';
      default: return 'default';
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading project...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Project</h2>
            <p className="text-zinc-400 mb-6">{error || 'Project not found'}</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { project, progress } = data;
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold">Project {projectId}</h1>
              <p className="text-sm text-zinc-400 line-clamp-1 max-w-md">{project.prompt}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={getStatusColor(project.status) as any}>
              {project.status}
            </Badge>
            {(project.status === 'completed' || project.status === 'failed') && (
              <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
                New Project
              </Button>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        {project.status !== 'completed' && project.status !== 'failed' && (
          <Card className="mb-8">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  {project.status === 'generating' ? 'Generating scenes...' : 'Rendering scenes...'}
                </span>
                <span className="text-sm text-zinc-400">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                />
              </div>
              {progress.current && (
                <p className="mt-2 text-sm text-zinc-500">Current: {progress.current}</p>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Error Message */}
        {project.status === 'failed' && project.error && (
          <Card className="mb-8 border-red-500/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-red-400 mb-1">Generation Failed</h3>
                  <p className="text-sm text-zinc-400">{project.error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Scenes Grid */}
        {project.scenes.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Scene List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">Scenes</h2>
              {project.scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setSelectedScene(scene.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedScene === scene.id 
                      ? 'bg-zinc-900 border-violet-500/50' 
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Scene {scene.order + 1}</span>
                    <Badge variant={getStatusColor(scene.status) as any}>
                      {scene.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400">{scene.title}</p>
                </button>
              ))}
            </div>
            
            {/* Scene Detail */}
            <div className="lg:col-span-2">
              {selectedScene ? (
                <SceneDetail 
                  scene={project.scenes.find(s => s.id === selectedScene)!} 
                />
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <p className="text-zinc-500">Select a scene to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {project.scenes.length === 0 && project.status !== 'failed' && (
          <Card>
            <CardContent className="py-20 text-center">
              <div className="animate-pulse w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Generating Storyboard...</h3>
              <p className="text-zinc-400">Breaking down your prompt into scenes</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Scene Detail Component
function SceneDetail({ scene }: { scene: any }) {
  const [showCode, setShowCode] = useState(false);
  const videoUrl = getVideoUrl(scene.videoUrl);
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{scene.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">{scene.description}</p>
          </div>
          <Badge variant={scene.status === 'completed' ? 'success' : scene.status === 'failed' ? 'error' : 'warning'}>
            {scene.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Video Preview */}
        {videoUrl && (
          <div className="mb-6">
            <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
              <video 
                src={videoUrl} 
                controls 
                className="w-full h-full rounded-lg"
                preload="metadata"
              />
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(scene.s3Url || videoUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {scene.s3Url ? 'Download from S3' : 'Download Video'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Placeholder while rendering */}
        {scene.status === 'rendering' && (
          <div className="aspect-video bg-zinc-800/50 rounded-lg mb-6 flex items-center justify-center border border-dashed border-zinc-700">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-zinc-400">Rendering scene...</p>
            </div>
          </div>
        )}
        
        {/* Code Toggle */}
        {scene.manimCode && (
          <div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-3"
            >
              <svg className={`w-4 h-4 transition-transform ${showCode ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showCode ? 'Hide' : 'Show'} Manim Code
            </button>
            
            {showCode && (
              <pre className="p-4 bg-zinc-900 rounded-lg overflow-x-auto text-sm">
                <code className="text-zinc-300">{scene.manimCode}</code>
              </pre>
            )}
          </div>
        )}
        
        {/* Error */}
        {scene.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{scene.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
