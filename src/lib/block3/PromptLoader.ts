/**
 * Enterprise Prompt Loader Service
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3 - Module 3)
 *
 * Loads, caches, versions, and interpolates prompts from /src/ai/prompts/*.md
 * Supports fallback prompts, variable substitution, and future DB provider expansion.
 */

import fs from 'fs';
import path from 'path';
import { PromptTemplateOptions } from './types';

export class PromptLoader {
  private static cache: Map<string, string> = new Map();
  private static promptsDir = path.join(process.cwd(), 'src', 'ai', 'prompts');

  /**
   * Load prompt template by name with fallback and variable replacement
   */
  public static getPrompt(options: PromptTemplateOptions): string {
    const { promptName, variables = {} } = options;
    const fileName = promptName.endsWith('.md') ? promptName : `${promptName}.md`;
    const filePath = path.join(this.promptsDir, fileName);

    let rawPrompt = this.cache.get(fileName);

    if (!rawPrompt) {
      try {
        if (fs.existsSync(filePath)) {
          rawPrompt = fs.readFileSync(filePath, 'utf-8');
          this.cache.set(fileName, rawPrompt);
        } else {
          // Fallback prompt
          rawPrompt = this.getFallbackPrompt(promptName);
        }
      } catch (err) {
        console.warn(`[PromptLoader] Failed reading ${fileName}, using fallback.`, err);
        rawPrompt = this.getFallbackPrompt(promptName);
      }
    }

    // Interpolate variables {{variableName}}
    let finalPrompt = rawPrompt;
    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      finalPrompt = finalPrompt.replace(regex, String(val));
    });

    return finalPrompt;
  }

  /**
   * Universal Fallback prompt if file is missing
   */
  private static getFallbackPrompt(promptName: string): string {
    return `# Fallback Prompt Template for ${promptName}
You are the AI Sales & Compliance Assistant for Efilingg.
Assist Indian business owners with company registration, GST, trademarks, and tax returns professionally.`;
  }

  /**
   * Clear cache for dynamic reloading
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}
