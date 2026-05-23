// API client for communicating with the Hono backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper to get full video URL
export function getVideoUrl(videoPath: string | null | undefined): string | null {
  if (!videoPath) return null;
  // If it's already a full URL, return as-is
  if (videoPath.startsWith('http')) return videoPath;
  // Otherwise, prepend the API base
  return `${API_BASE}${videoPath}`;
}

export interface GenerateRequest {
  prompt: string;
  options?: {
    quality?: 'low' | 'medium' | 'high';
    style?: '3blue1brown' | 'minimal' | 'dark' | 'custom';
    duration?: number;
  };
}

export interface GenerateResponse {
  projectId: string;
  message: string;
}

export interface ProjectStatusResponse {
  project: {
    id: string;
    prompt: string;
    status: 'pending' | 'generating' | 'rendering' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    scenes: Scene[];
    error?: string;
  };
  progress: {
    total: number;
    completed: number;
    current?: string;
  };
}

export interface Scene {
  id: string;
  order: number;
  title: string;
  description: string;
  manimCode: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export async function generateVideo(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate video');
  }

  return response.json();
}

export async function getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
  const response = await fetch(`${API_BASE}/project/${projectId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get project status');
  }

  return response.json();
}

export async function getScene(projectId: string, sceneId: string): Promise<{ scene: Scene }> {
  const response = await fetch(`${API_BASE}/project/${projectId}/scene/${sceneId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get scene');
  }

  return response.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/project/${projectId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete project');
  }
}
