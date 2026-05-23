import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { generateStoryboard, generateManimCode, validateManimCode, validateAndFixManimCode } from '../services/llm';
import { renderManimCode, checkManimInstalled } from '../services/render';

export const generateRoute = new Hono();

const generateSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000),
  options: z.object({
    quality: z.enum(['low', 'medium', 'high']).optional().default('low'),
    style: z.enum(['3blue1brown', 'minimal', 'dark', 'custom']).optional().default('3blue1brown'),
    duration: z.number().min(10).max(300).optional().default(60),
  }).optional(),
});

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'projects.json');

export const projects = new Map<string, any>();

export function reloadDB() {
  if (existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
      for (const [key, value] of Object.entries(data)) {
        projects.set(key, value);
      }
    } catch (e) {
      console.error('Failed to load DB:', e);
    }
  }
}

// Initial load
reloadDB();

export function saveDB() {
  try {
    const obj = Object.fromEntries(projects);
    writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to save DB:', e);
  }
}

generateRoute.post('/', zValidator('json', generateSchema), async (c) => {
  const { prompt, options } = c.req.valid('json');
  
  const projectId = nanoid(12);
  
  // Create project entry
  const project = {
    id: projectId,
    prompt,
    options: options || {},
    status: 'generating',
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: [],
  };
  
  projects.set(projectId, project);
  saveDB();
  
  // Start async generation process (don't await)
  generateVideo(projectId, prompt, options).catch(console.error);
  
  return c.json({
    projectId,
    message: 'Video generation started. Poll /project/:id for status.',
  });
});

// Check manim status endpoint
generateRoute.get('/status', async (c) => {
  const manimStatus = await checkManimInstalled();
  return c.json({
    manim: manimStatus,
    groq: {
      configured: !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here',
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    },
  });
});

async function generateVideo(
  projectId: string, 
  prompt: string, 
  options?: any
) {
  const project = projects.get(projectId);
  if (!project) return;
  
  try {
    // Check if manim is installed first
    const manimCheck = await checkManimInstalled();
    if (!manimCheck.installed) {
      project.status = 'failed';
      project.error = `Manim not installed: ${manimCheck.error}`;
      project.updatedAt = new Date();
      saveDB();
      return;
    }
    // Single-shot generation: Create one scene that represents the entire video
    console.log(`[${projectId}] Generating Manim code in one shot...`);
    
    project.title = "Generated Animation";
    project.scenes = [{
      id: `${projectId}-scene-0`,
      order: 0,
      title: "Full Animation",
      description: prompt,
      manimCode: '',
      status: 'pending',
      videoUrl: null,
    }];
    
    project.status = 'generating_code';
    project.updatedAt = new Date();
    saveDB();
    
    const scene = project.scenes[0];
    
    try {
      console.log(`[${projectId}] Generating Manim code...`);
      // Generate code (this will wait for rate limit)
      const rawCode = await generateManimCode(prompt, options?.style, options?.duration);
      
      let codeToUse = rawCode;
      // Validate code
      let validation = validateManimCode(codeToUse);
      
      if (!validation.valid) {
        console.log(`[${projectId}] Code validation failed: ${validation.error}. Attempting to fix automatically...`);
        try {
          codeToUse = await validateAndFixManimCode(codeToUse, validation.error);
          validation = validateManimCode(codeToUse);
        } catch (e) {
          console.error(`[${projectId}] Auto-fix failed:`, e);
        }
      }
      
      if (!validation.valid) {
        console.error(`[${projectId}] Code validation failed:`, validation.error);
        scene.status = 'failed';
        scene.error = `Code validation failed: ${validation.error}`;
        scene.manimCode = codeToUse; // Still save for debugging
        project.status = 'failed';
        project.error = scene.error;
        project.updatedAt = new Date();
        projects.set(projectId, project);
        saveDB();
      } else {
        scene.manimCode = codeToUse;
        scene.status = 'queued'; // The worker will pick this up!
        project.status = 'queued';
        project.updatedAt = new Date();
        projects.set(projectId, project);
        saveDB();
        console.log(`[${projectId}] Code generated. Scene queued for worker.`);
      }
    } catch (sceneError) {
      console.error(`[${projectId}] Error in generation:`, sceneError);
      scene.status = 'failed';
      scene.error = sceneError instanceof Error ? sceneError.message : 'Unknown error';
      project.status = 'failed';
      project.error = scene.error;
      project.updatedAt = new Date();
      projects.set(projectId, project);
      saveDB();
    }
    
    // In the decoupled architecture, we don't mark the whole project as completed here.
    // The worker will update the status to 'completed' once rendering is done.
    
  } catch (error) {
    console.error(`[${projectId}] Error:`, error);
    project.status = 'failed';
    project.error = error instanceof Error ? error.message : 'Unknown error';
    project.updatedAt = new Date();
    projects.set(projectId, project);
    saveDB();
  }
}
