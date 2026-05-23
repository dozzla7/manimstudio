// Render Service - Executes Manim locally (no sandboxing for now)
import { spawn } from 'child_process';
import { mkdir, writeFile, readFile, unlink, rmdir, readdir, stat } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { uploadToS3 } from './s3';

const OUTPUT_DIR = path.join(process.cwd(), 'generations');
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

export interface RenderResult {
  success: boolean;
  videoPath?: string;
  error?: string;
  duration?: number;
}

// Check if manim is installed - use python -m manim
export async function checkManimInstalled(): Promise<{ installed: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    // Use python -m manim instead of direct manim command
    const manim = spawn('python', ['-m', 'manim', '--version']);
    
    let output = '';
    let error = '';
    
    manim.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    manim.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    manim.on('close', (code) => {
      const combinedOutput = output + error;
      if (code === 0 || combinedOutput.includes('Manim Community')) {
        const versionMatch = combinedOutput.match(/v?(\d+\.\d+\.\d+)/);
        resolve({
          installed: true,
          version: versionMatch ? versionMatch[1] : 'unknown',
        });
      } else {
        resolve({
          installed: false,
          error: 'Manim not found. Install with: pip install manim',
        });
      }
    });
    
    manim.on('error', () => {
      resolve({
        installed: false,
        error: 'Manim not found. Install with: pip install manim',
      });
    });
  });
}

export async function renderManimCode(
  code: string,
  sceneId: string,
  quality: 'low' | 'medium' | 'high' = 'low'
): Promise<RenderResult> {
  await ensureDirectories();
  
  // First check if manim is installed
  const manimCheck = await checkManimInstalled();
  if (!manimCheck.installed) {
    return {
      success: false,
      error: manimCheck.error || 'Manim is not installed. Run: pip install manim',
    };
  }
  
  const sceneDir = path.join(TEMP_DIR, sceneId);
  const pythonFile = path.join(sceneDir, 'scene.py');
  
  try {
    // Create scene directory
    await mkdir(sceneDir, { recursive: true });
    
    // Write the Python code to a file
    await writeFile(pythonFile, code, 'utf-8');
    
    console.log(`[Render] Starting render for scene ${sceneId}...`);
    const startTime = Date.now();
    
    // Determine quality flag
    const qualityFlag = quality === 'low' ? '-ql' : quality === 'medium' ? '-qm' : '-qh';
    
    // Run manim command using python -m manim
    const result = await runManim(pythonFile, sceneDir, qualityFlag);
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        duration,
      };
    }
    
    // Find the generated video file
    const videoFile = await findVideoFile(sceneDir);
    
    if (!videoFile) {
      return {
        success: false,
        error: 'Video file not found after render. Check manim output for errors.',
        duration,
      };
    }
    
    // Move to output directory with a simpler name
    const outputFileName = `${sceneId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    // Copy the file to output
    const videoData = await readFile(videoFile);
    await writeFile(outputPath, videoData);
    
    console.log(`[Render] Completed render for scene ${sceneId} in ${duration}s. Uploading to S3...`);
    
    // Upload to S3
    const s3Url = await uploadToS3(outputPath, outputFileName);
    
    // Default to local path if S3 fails, but prefer S3 URL
    const finalVideoPath = s3Url || `/project/video/${outputFileName}`;
    
    if (s3Url) {
      console.log(`[Render] Successfully uploaded to S3: ${s3Url}`);
      // Clean up local temp files to save disk space on Railway since it's now on S3
      try {
         await unlink(outputPath);
      } catch(e) {
         console.warn(`[Render] Failed to clean up local file ${outputPath}`);
      }
    }
    
    return {
      success: true,
      videoPath: finalVideoPath,
      duration,
    };
    
  } catch (error) {
    console.error(`[Render] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runManim(
  pythonFile: string,
  sceneDir: string,
  qualityFlag: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Find the Scene class name from the code
    let sceneName = 'MainScene';
    try {
      const code = readFileSync(pythonFile, 'utf-8');
      const sceneNameMatch = code.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
      if (sceneNameMatch) {
        sceneName = sceneNameMatch[1];
      }
    } catch (e) {
      console.error('Error reading python file:', e);
    }
    
    console.log(`[Render] Running: python -m manim ${qualityFlag} --media_dir ${sceneDir} ${pythonFile} ${sceneName}`);
    
    // Use python -m manim instead of direct manim command
    const manim = spawn('python', [
      '-m', 'manim',
      qualityFlag,
      '--media_dir', sceneDir,
      pythonFile,
      sceneName,
    ], {
      cwd: sceneDir,
      env: {
        ...process.env,
        // Disable auto-opening video
        MANIM_DISABLE_OPENCV: '1',
      },
    });
    
    let stdout = '';
    let stderr = '';
    
    manim.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      console.log(`[Manim] ${str.trim()}`);
    });
    
    manim.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      // Don't log warnings as errors - manim outputs info to stderr
      if (!str.includes('RuntimeWarning') && !str.includes('DeprecationWarning')) {
        console.log(`[Manim] ${str.trim()}`);
      }
    });
    
    manim.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderr || stdout || `Manim exited with code ${code}`,
        });
      }
    });
    
    manim.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to start manim: ${err.message}. Make sure Python and manim are installed.`,
      });
    });
  });
}

async function findVideoFile(dir: string): Promise<string | null> {
  async function search(currentDir: string): Promise<string | null> {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (entry.name === 'partial_movie_files') continue;
          const result = await search(fullPath);
          if (result) return result;
        } else if (entry.name.endsWith('.mp4')) {
          return fullPath;
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return null;
  }
  
  try {
    return await search(dir);
  } catch {
    return null;
  }
}

// Serve video files
export function getVideoPath(filename: string): string {
  return path.join(OUTPUT_DIR, filename);
}
