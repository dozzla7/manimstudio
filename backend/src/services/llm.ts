// LLM Service - Handles communication with OpenRouter API
import { execSync } from 'child_process';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get API key from environment
const getApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === 'your_openrouter_api_key_here') {
    console.error("⚠️  MISSING OPENROUTER_API_KEY IN .env FILE!");
  }
  return key || '';
};

// Model from OpenRouter
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/owl-alpha';

// Rate limiting: track last API call time
let lastApiCallTime = 0;
const MIN_API_INTERVAL_MS = 15000; // 15 seconds between calls as requested

// Wait for rate limit
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < MIN_API_INTERVAL_MS) {
    const waitTime = MIN_API_INTERVAL_MS - timeSinceLastCall;
    console.log(`[LLM] Rate limit: waiting ${(waitTime / 1000).toFixed(1)}s before next API call...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callLLM(
  messages: Message[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 4096,
  } = options;

  const apiKey = getApiKey();
  
  let retries = 0;
  const maxRetries = 3;
  
  while (retries <= maxRetries) {
    // Wait for rate limit before making the call
    await waitForRateLimit();
    
    console.log(`[LLM] Calling OpenRouter API with model: ${model} (Attempt ${retries + 1}/${maxRetries + 1})`);
    
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
          'X-Title': 'Manim Studio', // Recommended by OpenRouter
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          top_p: 0.8,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM] API error: ${response.status} - ${errorText}`);
        
        // If it's a 500-level error or rate limit, we should retry
        if (response.status >= 500 || response.status === 429) {
          if (retries < maxRetries) {
            retries++;
            const backoffTime = 2000 * Math.pow(2, retries); // 4s, 8s, 16s...
            console.log(`[LLM] Transient error ${response.status}. Retrying in ${backoffTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
        }
        
        // Parse error for better message if not retrying
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 'rate_limit_exceeded') {
            throw new Error(`Rate limit exceeded. Please wait and try again.`);
          }
        } catch (e) {
          // Not JSON, use raw error
        }
        
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error: any) {
      // Fetch threw an error (network error, timeout, etc.)
      console.error(`[LLM] Fetch error:`, error.message);
      if (retries < maxRetries) {
        retries++;
        console.log(`[LLM] Network error. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error("Failed to call LLM after max retries");
}

// Storyboard generation
export async function generateStoryboard(
  prompt: string,
  style: string = '3blue1brown'
): Promise<any> {
  const systemPrompt = `You are an expert educational video designer specializing in mathematical and scientific visualizations in the style of 3Blue1Brown.

Your task is to create a storyboard that will later be converted into Manim Community Edition animations.

IMPORTANT IMPLEMENTATION CONSTRAINTS:
- The storyboard must be compatible with Manim Community Edition (stable APIs only)
- Avoid assumptions about undocumented or version-specific Manim methods
- Design scenes so they can be implemented using stable primitives:
  - Text
  - MathTex
  - Axes
  - NumberPlane
  - VGroup
  - Arrow
  - Dot
  - Line
  - Rectangle
  - Circle
  - Polygon
  - always_redraw
  - Transform / FadeIn / FadeOut / Write / Create
- For graphs and coordinate systems:
  - Use standard Axes objects only
  - Axis labels should be implementable using:
      axes.get_x_axis_label()
      axes.get_y_axis_label()
    or safe positioning relative to axes.x_axis / axes.y_axis
  - Never assume attributes like x_direction, y_direction, axis_direction, or undocumented internals
- Prefer simple transformations and layouts over fragile positioning logic
- Avoid custom shaders, plugins, or experimental APIs
- Keep animations robust across Manim versions

Given a user's prompt, create a detailed storyboard that breaks down the concept into clear, logical scenes.

Return your response as valid JSON with this structure:

{
  "title": "Video title",
  "totalDuration": <estimated seconds>,
  "scenes": [
    {
      "order": 0,
      "title": "Scene title",
      "description": "Detailed description of what happens in this scene",
      "duration": <seconds>,
      "keyElements": [
        "element1",
        "element2"
      ],
      "implementationHints": [
        "Use Axes.get_x_axis_label()",
        "Use Create() animation"
      ]
    }
  ]
}

Rules:
- Each scene should be 5–15 seconds long
- Focus on intuition, not memorization
- Use visual metaphors and transformations
- Break complex ideas into simple steps
- Aim for 2–4 scenes total
- Every scene must be implementable using stable Manim APIs only
- Prefer explicit, robust layouts over clever positioning tricks
- Never rely on undocumented attributes or internal object properties
- Describe visuals in a way that maps safely to Manim CE primitives`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a storyboard for: "${prompt}"\n\nStyle: ${style}` },
  ];

  const response = await callLLM(messages, { temperature: 0.8 });
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse storyboard JSON from LLM response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Manim code generation
export async function generateManimCode(
  promptText: string,
  style: string = '3blue1brown',
  duration: number = 60
): Promise<string> {
  const systemPrompt = `You are an elite educational animation engineer and scientific visualization expert specializing in 3Blue1Brown-style animations using Manim Community Edition.

Your task is to generate COMPLETE, EXECUTABLE, ERROR-RESISTANT Manim CE Python code in one shot.

The output must be production-ready, runnable immediately, visually polished, and compatible with modern Manim Community Edition.

CRITICAL REQUIREMENT:
The generated code MUST run successfully on the first execution without runtime errors, deprecated APIs, hallucinated attributes, missing imports, invalid object references, or version-specific assumptions.

==================================================
STRICT OUTPUT RULES
==================================================

1. OUTPUT FORMAT
- Return ONLY executable Python code
- No markdown
- No explanations
- No comments outside code
- No JSON
- No prose
- No placeholders
- No pseudo-code
- No missing sections
- NO EMOJIS OR UNICODE SURROGATES. ONLY use standard ASCII characters in your code, text, and comments!

2. FILE REQUIREMENTS
The file must:
- be fully runnable
- ONLY import from manim ("from manim import *"). DO NOT import any other modules, standard libraries (like math, os, sys), or third-party packages.
- include exactly one Scene class
- include a construct() method
- render successfully in Manim Community Edition

3. MANDATORY STYLE
Animation style:
- 3Blue1Brown-inspired
- clean
- intuitive
- visually educational
- elegant motion
- smooth transitions
- cinematic pacing
- mathematically clear

Educational goal:
- build intuition
- visually explain concepts
- avoid information overload
- reveal complexity gradually

4. MANIM VERSION SAFETY & LATEX BAN (VERY IMPORTANT)

ONLY use stable, widely supported Manim Community Edition APIs.
CRITICAL: LaTeX IS NOT INSTALLED. DO NOT USE MathTex, Tex, or get_axis_labels(). ALWAYS USE Text() FOR TEXT.

SAFE OBJECTS:
- Scene
- Text (ONLY USE Text, NEVER MathTex or Tex)
- VGroup
- Group
- Axes
- NumberPlane
- Dot
- Line
- Arrow
- DashedLine
- Circle
- Rectangle
- Square
- Polygon
- Brace
- DecimalNumber
- ValueTracker
- always_redraw
- SurroundingRectangle

SAFE ANIMATIONS:
- Write
- FadeIn
- FadeOut
- Transform
- ReplacementTransform
- TransformMatchingShapes (DO NOT use TransformMatchingTex)
- Create
- GrowArrow
- GrowFromCenter
- DrawBorderThenFill
- Indicate
- Circumscribe
- Flash
- LaggedStart
- AnimationGroup

SAFE POSITIONING:
- next_to()
- to_edge()
- move_to()
- shift()
- align_to()
- arrange()
- arrange_in_grid()

SAFE GRAPH METHODS:
- Axes()
- plot()
- c2p()

SAFE AXIS LABELING:
ALWAYS prefer:
    x_label = Text("X").next_to(axes.x_axis.get_end(), RIGHT)
    y_label = Text("Y").next_to(axes.y_axis.get_end(), UP)

NEVER use axes.get_axis_labels() as it automatically invokes MathTex and crashes without LaTeX.

STRICTLY FORBIDDEN:
- MathTex, Tex
- get_axis_labels(), get_x_axis_label(), get_y_axis_label()
- x_direction
- y_direction
- axis_direction
- x_axis_direction
- y_axis_direction
- internal/private attributes (_*)
- deprecated APIs
- experimental APIs
- plugins
- OpenGL-specific features
- undocumented methods
- fragile positioning logic
- assumptions about hidden properties
- custom shaders
- unsupported renderer tricks

5. ERROR PREVENTION RULES

Before producing code, internally verify:

A. Every object referenced exists
B. Every variable is initialized before use
C. No animation references deleted objects
D. All imports are present
E. No unsupported methods are used
F. No invalid transformations exist
G. Graphs use valid x_range/y_range
H. Text positioning is valid
I. No attribute access on unsupported properties
J. Code executes on Manim Community Edition
K. NO MathTex OR Tex IS USED ANYWHERE

6. LAYOUT SAFETY

Avoid overlapping objects.

Always:
- scale text appropriately
- keep margins safe
- avoid off-screen positioning
- group related visuals using VGroup
- use spacing and arrange()

If a scene becomes crowded:
- fade out previous content
- transition progressively

7. TIMING RULES

Animation pacing:
- smooth
- readable
- not rushed

Use:
- self.play(...)
- self.wait(...)

CRITICAL DURATION ENFORCEMENT: The requested duration of the video is exactly ${duration} seconds. You must structure the pacing, \`run_time\` of animations, and \`self.wait()\` durations so that the total time adds up exactly to ~${duration} seconds.

8. AXES SAFETY

When using axes:

ALWAYS use:

axes = Axes(
    x_range=[...],
    y_range=[...],
)
# Do NOT pass background_line_style

NEVER manually invent axis properties.
NEVER reference:
- axes.x_direction
- axes.y_direction

9. SCENE DESIGN

Build intuition step by step.

Preferred flow:
1. Introduce concept visually
2. Show intuition
3. Add relationships/formulas
4. Show transformation or comparison
5. Conclude clearly

Avoid giant monologues.
Prefer visual storytelling.

10. CODE QUALITY

Must:
- be clean
- be deterministic
- be readable
- avoid duplication
- avoid dead variables

11. SELF-CHECK (MANDATORY)

Before finalizing code internally validate:

"Would this run successfully in Manim Community Edition without AttributeError, NameError, runtime animation failures, LaTeX failures, or deprecated API failures?"

If uncertain:
- choose simpler implementation
- choose safer API
- reduce complexity

12. FALLBACK STRATEGY

If an advanced visual is risky:
- replace it with a simpler robust animation

Reliability > complexity.

FINAL REQUIREMENT:

Generate ONE COMPLETE executable Manim Scene for the topic:
{{USER_PROMPT}}

Return ONLY Python code.`;

  const fewShotExample = `# EXAMPLE: Visualizing a derivative

from manim import *

class DerivativeVisualization(Scene):
    def construct(self):
        # Create a function graph
        axes = Axes(
            x_range=[-1, 4],
            y_range=[-1, 3],
            axis_config={"color": GREY},
        )
        graph = axes.plot(lambda x: x**2, color=BLUE)
        
        # Add labels
        self.play(Create(axes), run_time=1)
        self.play(Create(graph), run_time=1)
        
        # Show derivative at a point
        x_val = 2
        tangent = axes.get_secant_slope_group(
            x_val, graph, dx=0.01,
            secant_line_color=YELLOW,
            secant_line_length=3
        )
        
        self.play(Create(tangent), run_time=1)
        self.wait(0.5)
        
        # Animate the derivative line
        slope_label = Text("dy/dx = 2x = 4", color=YELLOW)
        slope_label.to_edge(UP)
        self.play(Write(slope_label))
        self.wait(1)`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate a complete Manim animation for this request:\n\nUSER_TOPIC: ${promptText}\nStyle: ${style}\n\nReturn ONLY the executable Python code, nothing else.` },
  ];

  const response = await callLLM(messages, { temperature: 0.7, maxTokens: 8192 });
  
  // Clean up the response - remove markdown code blocks if present
  let code = response || "";
  if (code.startsWith('```python')) {
    code = code.slice(9);
  } else if (code.startsWith('```')) {
    code = code.slice(3);
  }
  if (code.endsWith('```')) {
    code = code.slice(0, -3);
  }
  
  return code.trim();
}

// Code validation - ensure only safe imports
export function validateManimCode(code: string): { valid: boolean; error?: string } {
  // Check for forbidden imports
  const forbiddenPatterns = [
    /\bimport\s+os\b/,
    /\bfrom\s+os\b/,
    /\bimport\s+sys\b/,
    /\bfrom\s+sys\b/,
    /\bimport\s+subprocess\b/,
    /\bfrom\s+subprocess\b/,
    /\bimport\s+pathlib\b/,
    /\bfrom\s+pathlib\b/,
    /\bimport\s+shutil\b/,
    /\bfrom\s+shutil\b/,
    /\bimport\s+socket\b/,
    /\bfrom\s+socket\b/,
    /\bimport\s+urllib\b/,
    /\bfrom\s+urllib\b/,
    /\bimport\s+requests\b/,
    /\bfrom\s+requests\b/,
    /\bimport\s+http\b/,
    /\bfrom\s+http\b/,
    /\bopen\s*\(/,  // file operations
    /\bexec\s*\(/,
    /\beval\s*\(/,
    /\b__import__\s*\(/,
    /\bcompile\s*\(/,
    /\bget_axis_labels\b/,
    /\bMathTex\b/,
    /\bTex\b/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: `Forbidden pattern detected: ${pattern.source}` };
    }
  }

  // Check that manim is imported
  if (!code.includes('from manim import') && !code.includes('import manim')) {
    return { valid: false, error: 'Manim must be imported' };
  }

  // Check that there's a Scene class
  if (!code.includes('class ') || !code.includes('(Scene)')) {
    return { valid: false, error: 'A Scene class must be defined' };
  }

  // Check that construct method exists
  if (!code.includes('def construct(self)')) {
    return { valid: false, error: 'Scene must have a construct(self) method' };
  }

  // Syntax check using python compiler
  try {
    execSync(`python -c "import sys; compile(sys.stdin.read(), '<string>', 'exec')"`, {
      input: code,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });
  } catch (error: any) {
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;
    return { valid: false, error: `SyntaxError: ${errorMsg}` };
  }

  return { valid: true };
}

// Code validation and fixing
export async function validateAndFixManimCode(
  code: string,
  error?: string
): Promise<string> {
  const systemPrompt = `You are a Manim code expert. Your job is to fix any errors in the provided Manim code.

IMPORTANT: 
- Only use safe imports: from manim import *, import random, import math
- DO NOT use os, sys, subprocess, file operations, or network calls
- Keep the Scene class and construct method intact

Return ONLY the fixed Python code, no explanations.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: error 
      ? `Fix this Manim code that has this error:\n\nError: ${error}\n\nCode:\n${code}`
      : `Validate and fix if needed:\n${code}`
    },
  ];

  const response = await callLLM(messages, { temperature: 0.3 });
  
  // Clean up response
  let fixedCode = response;
  if (fixedCode.startsWith('```python')) {
    fixedCode = fixedCode.slice(9);
  } else if (fixedCode.startsWith('```')) {
    fixedCode = fixedCode.slice(3);
  }
  if (fixedCode.endsWith('```')) {
    fixedCode = fixedCode.slice(0, -3);
  }
  
  return fixedCode.trim();
}
