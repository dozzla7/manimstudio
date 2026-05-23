// Shared types between frontend and backend

export interface Project {
  id: string;
  prompt: string;
  status: 'pending' | 'generating' | 'rendering' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  title: string;
  description: string;
  manimCode: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface GenerateRequest {
  prompt: string;
  options?: {
    quality?: 'low' | 'medium' | 'high';
    style?: '3blue1brown' | 'minimal' | 'dark' | 'custom';
    duration?: number; // approximate duration in seconds
  };
}

export interface GenerateResponse {
  projectId: string;
  message: string;
}

export interface ProjectStatusResponse {
  project: Project;
  progress: {
    total: number;
    completed: number;
    current?: string;
  };
}

// LLM-related types
export interface Storyboard {
  title: string;
  totalDuration: number;
  scenes: ScenePlan[];
}

export interface ScenePlan {
  order: number;
  title: string;
  description: string;
  duration: number;
  keyElements: string[];
}
