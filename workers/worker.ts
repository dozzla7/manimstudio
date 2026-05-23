import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { renderManimCode } from '../backend/src/services/render';

const DB_FILE = path.join(process.cwd(), 'projects.json');

function loadDB(): Map<string, any> {
  const projects = new Map<string, any>();
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
  return projects;
}

function saveDB(projects: Map<string, any>) {
  try {
    const obj = Object.fromEntries(projects);
    writeFileSync(DB_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to save DB:', e);
  }
}

async function processQueue() {
  const projects = loadDB();
  
  for (const [projectId, project] of projects.entries()) {
    if (project.status === 'queued') {
      console.log(`\n[Worker] 📥 Found queued project: ${projectId}`);
      console.log(`[Worker] 🚀 Starting Manim render process...`);
      
      const scene = project.scenes[0];
      
      // Update status to rendering
      project.status = 'rendering';
      scene.status = 'rendering';
      project.updatedAt = new Date();
      saveDB(projects);
      
      console.log(`[Worker] Rendering scene for ${projectId}...`);
      
      try {
        const renderResult = await renderManimCode(
          scene.manimCode, 
          scene.id, 
          project.options?.quality || 'low'
        );
        
        // Reload DB before saving to prevent overwriting other concurrent updates
        const freshProjects = loadDB();
        const freshProject = freshProjects.get(projectId);
        
        if (freshProject) {
          if (renderResult.success) {
            freshProject.scenes[0].status = 'completed';
            freshProject.scenes[0].videoUrl = renderResult.videoPath;
            freshProject.status = 'completed';
            console.log(`[Worker] ✅ Project ${projectId} completed successfully!`);
          } else {
            freshProject.scenes[0].status = 'failed';
            freshProject.scenes[0].error = renderResult.error;
            freshProject.status = 'failed';
            freshProject.error = 'Rendering failed';
            console.error(`[Worker] ❌ Project ${projectId} failed:`, renderResult.error);
          }
          
          freshProject.updatedAt = new Date();
          saveDB(freshProjects);
        }
      } catch (error) {
        console.error(`[Worker] Uncaught error during render:`, error);
        const freshProjects = loadDB();
        const freshProject = freshProjects.get(projectId);
        if (freshProject) {
          freshProject.status = 'failed';
          freshProject.error = String(error);
          freshProject.updatedAt = new Date();
          saveDB(freshProjects);
        }
      }
    }
  }
}

// Start polling
console.log('🤖 Manim Render Worker Started');
console.log('Polling for jobs every 5 seconds...');

setInterval(async () => {
  await processQueue();
}, 5000);

// Run immediately on start
processQueue();
