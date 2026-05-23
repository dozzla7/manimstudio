import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { projects, reloadDB } from './generate';
import { getVideoPath } from '../services/render';
import { readFileSync, existsSync } from 'fs';

export const projectRoute = new Hono();

// Serve video files
projectRoute.get('/video/:filename', (c) => {
  const filename = c.req.param('filename');
  const videoPath = getVideoPath(filename);
  
  if (!existsSync(videoPath)) {
    return c.json({ error: 'Video not found' }, 404);
  }
  
  const videoData = readFileSync(videoPath);
  
  return new Response(videoData, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': videoData.length.toString(),
    },
  });
});

projectRoute.get('/:id', (c) => {
  reloadDB();
  const id = c.req.param('id');
  const project = projects.get(id);
  
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }
  
  const completedScenes = project.scenes.filter((s: any) => s.status === 'completed').length;
  
  return c.json({
    project,
    progress: {
      total: project.scenes.length,
      completed: completedScenes,
      current: project.scenes.find((s: any) => s.status === 'rendering')?.title,
    },
  });
});

projectRoute.get('/:id/scenes', (c) => {
  reloadDB();
  const id = c.req.param('id');
  const project = projects.get(id);
  
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }
  
  return c.json({ scenes: project.scenes });
});

projectRoute.get('/:id/scene/:sceneId', (c) => {
  reloadDB();
  const id = c.req.param('id');
  const sceneId = c.req.param('sceneId');
  const project = projects.get(id);
  
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }
  
  const scene = project.scenes.find((s: any) => s.id === sceneId);
  
  if (!scene) {
    return c.json({ error: 'Scene not found' }, 404);
  }
  
  return c.json({ scene });
});

projectRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  
  if (!projects.has(id)) {
    return c.json({ error: 'Project not found' }, 404);
  }
  
  projects.delete(id);
  return c.json({ message: 'Project deleted' });
});
