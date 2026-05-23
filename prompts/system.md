# Manim Video Generation Prompts

## Overview

This directory contains prompt templates and few-shot examples for generating Manim code.

## Structure

- `system.md` - This file, general guidelines
- `scenes/` - Few-shot examples organized by category

## Prompt Engineering Strategy

### Two-Stage Generation

1. **Storyboard Generation** (Planner LLM)
   - Breaks down user prompt into logical scenes
   - Estimates timing and key elements
   - Uses higher temperature for creativity

2. **Code Generation** (Scene LLM)
   - Generates actual Manim code per scene
   - Uses lower temperature for accuracy
   - Style-injected prompts

### Style Injection

Different visual styles have different prompt prefixes:

#### 3Blue1Brown Style
- Dark background (#1a1a2e)
- Bold, saturated colors
- Smooth transformations
- LaTeX for mathematical notation
- Geometric constructions
- Emphasis on visual intuition

#### Minimal Style
- Clean, white background
- Limited color palette (2-3 colors)
- Simple animations
- Focus on clarity over aesthetics
- Minimal text

#### Dark Mode
- Black background
- Neon color accents
- Glow effects where appropriate
- High contrast

### Few-Shot Examples

Each example in `scenes/` follows this format:

```
# Input
User's description of the visualization

# Output
Complete Manim Python code

# Notes
What makes this a good example
```

## Model Selection

- **Primary**: Claude 3.5 Sonnet (best for code generation)
- **Fallback**: GPT-4o (good, slightly less capable at complex Manim)
- **Budget**: Claude 3 Haiku or GPT-4o-mini (for simple scenes)

## Temperature Settings

| Task | Temperature | Reason |
|------|-------------|--------|
| Storyboard | 0.8 | Creative, varied outputs |
| Code Generation | 0.7 | Balance of accuracy and flexibility |
| Code Fixing | 0.3 | Precise, deterministic fixes |

## Validation Checklist

Before rendering, validate:

1. [ ] Import statement present: `from manim import *`
2. [ ] Single Scene class defined
3. [ ] `construct(self)` method exists
4. [ ] No syntax errors (parse with Python AST)
5. [ ] No forbidden imports (os, sys, subprocess, etc.)
6. [ ] No infinite loops
7. [ ] Reasonable animation count (< 50 per scene)
