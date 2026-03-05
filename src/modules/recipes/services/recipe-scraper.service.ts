import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { URL } from 'url';

interface ScrapedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  category?: string;
  cuisine?: string;
  author?: string;
  sourceUrl: string;
}

@Injectable()
export class RecipeScraperService {
  private readonly logger = new Logger(RecipeScraperService.name);

  private readonly RECIPE_SELECTORS = {
    jsonLd: /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  };

  async scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
    this.logger.log(`🔍 Scraping recipe from: ${url}`);

    this.validateUrl(url);

    try {
      const html = await this.fetchHtml(url);

      const jsonLdRecipe = this.extractFromJsonLd(html);
      if (jsonLdRecipe) {
        this.logger.log('✅ Extracted recipe from JSON-LD schema');
        return { ...jsonLdRecipe, sourceUrl: url };
      }

      this.logger.log('📄 Falling back to HTML scraping');
      const scrapedRecipe = this.extractFromHtml(html);

      if (!scrapedRecipe.title || scrapedRecipe.ingredients.length === 0) {
        throw new BadRequestException(
          'Could not extract recipe data. This page might not be a recipe.',
        );
      }

      this.logger.log('✅ Successfully scraped recipe');
      return { ...scrapedRecipe, sourceUrl: url };
    } catch (error: any) {
      this.logger.error(`❌ Scraping failed: ${error.message}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to import recipe: ${error.message}`);
    }
  }

  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol. Only HTTP and HTTPS are supported.');
      }

      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.')
      ) {
        throw new Error('Cannot import recipes from local addresses.');
      }
    } catch (error: any) {
      throw new BadRequestException(`Invalid URL: ${error.message}`);
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'RecipeStash/1.0 (Recipe Importer)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      } as RequestInit);

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. This website blocks automated access.');
        }
        if (response.status === 404) {
          throw new Error('Page not found. Please check the URL.');
        }
        throw new Error(`Failed to fetch the recipe page. Status: ${response.status}`);
      }

      return await response.text();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The website took too long to respond.');
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error('Website not found. Please check the URL.');
      }

      throw new Error('Failed to fetch the recipe page.');
    }
  }

  private extractFromJsonLd(html: string): ScrapedRecipe | null {
    try {
      let match: RegExpExecArray | null;
      const regex = new RegExp(this.RECIPE_SELECTORS.jsonLd);

      // Loop through all JSON-LD script tags
      // eslint-disable-next-line no-cond-assign
      while ((match = regex.exec(html)) !== null) {
        const scriptContent = match[1];
        if (!scriptContent) continue;

        try {
          const data = JSON.parse(scriptContent);

          const recipes = Array.isArray((data as any)['@graph'])
            ? (data as any)['@graph'].filter((item: any) => item['@type'] === 'Recipe')
            : (data as any)['@type'] === 'Recipe'
              ? [data]
              : [];

          if (recipes.length > 0) {
            const recipe = recipes[0];
            return this.parseJsonLdRecipe(recipe);
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to extract JSON-LD:', error as Error);
      return null;
    }
  }

  private parseJsonLdRecipe(recipe: any): ScrapedRecipe {
    return {
      title: recipe.name || '',
      description: recipe.description || '',
      prepTime: this.parseDuration(recipe.prepTime),
      cookTime: this.parseDuration(recipe.cookTime),
      totalTime: this.parseDuration(recipe.totalTime),
      servings: this.parseServings(recipe.recipeYield),
      ingredients: this.parseJsonLdIngredients(recipe.recipeIngredient || []),
      instructions: this.parseJsonLdInstructions(recipe.recipeInstructions || []),
      imageUrl: this.parseImage(recipe.image),
      category: recipe.recipeCategory || '',
      cuisine: recipe.recipeCuisine || '',
      author: recipe.author?.name || '',
      sourceUrl: '',
    };
  }

  private extractFromHtml(html: string): ScrapedRecipe {
    return {
      title: this.extractFirstMatch(html, [
        /<h1[^>]*class=["'][^"']*(recipe-title|entry-title)[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
        /<h1[^>]*>([\s\S]*?)<\/h1>/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]),
      description: this.extractFirstMatch(html, [
        /<div[^>]*class=["'][^"']*(recipe-description|entry-summary)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<p[^>]*class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
      ]),
      prepTime: this.parseTimeFromText(
        this.extractFirstMatch(html, [
          /<time[^>]*itemprop=["']prepTime["'][^>]*datetime=["']([^"']+)["'][^>]*>/i,
          /Prep Time[^<]*<\/[^>]+>[^0-9]*([\s\S]{0,40})/i,
        ]),
      ),
      cookTime: this.parseTimeFromText(
        this.extractFirstMatch(html, [
          /<time[^>]*itemprop=["']cookTime["'][^>]*datetime=["']([^"']+)["'][^>]*>/i,
          /Cook Time[^<]*<\/[^>]+>[^0-9]*([\s\S]{0,40})/i,
        ]),
      ),
      totalTime: this.parseTimeFromText(
        this.extractFirstMatch(html, [
          /<time[^>]*itemprop=["']totalTime["'][^>]*datetime=["']([^"']+)["'][^>]*>/i,
          /Total Time[^<]*<\/[^>]+>[^0-9]*([\s\S]{0,40})/i,
        ]),
      ),
      servings: this.parseServingsFromText(
        this.extractFirstMatch(html, [
          /<span[^>]*itemprop=["']recipeYield["'][^>]*>([\s\S]*?)<\/span>/i,
          /Servings?:[^0-9]*([0-9]+)/i,
        ]),
      ),
      ingredients: this.extractListFromHtml(html, [
        /<ul[^>]*class=["'][^"']*ingredients[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi,
        /<ul[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/ul>/gi,
      ]),
      instructions: this.extractListFromHtml(html, [
        /<ol[^>]*class=["'][^"']*(instructions|steps)[^"']*["'][^>]*>([\s\S]*?)<\/ol>/gi,
        /<div[^>]*itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/div>/gi,
      ]),
      imageUrl: this.extractFirstMatch(html, [
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
        /<img[^>]*itemprop=["']image["'][^>]*src=["']([^"']+)["'][^>]*>/i,
      ]),
      category: this.extractFirstMatch(html, [
        /<span[^>]*itemprop=["']recipeCategory["'][^>]*>([\s\S]*?)<\/span>/i,
      ]),
      cuisine: this.extractFirstMatch(html, [
        /<span[^>]*itemprop=["']recipeCuisine["'][^>]*>([\s\S]*?)<\/span>/i,
      ]),
      author: this.extractFirstMatch(html, [
        /<span[^>]*itemprop=["']author["'][^>]*>([\s\S]*?)<\/span>/i,
        /<a[^>]*rel=["']author["'][^>]*>([\s\S]*?)<\/a>/i,
      ]),
      sourceUrl: '',
    };
  }

  private extractFirstMatch(html: string, patterns: RegExp[]): string {
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) {
        const value = match[2] ?? match[1];
        const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
    }
    return '';
  }

  private extractListFromHtml(html: string, containerPatterns: RegExp[]): string[] {
    const items: string[] = [];

    for (const pattern of containerPatterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern);

      // eslint-disable-next-line no-cond-assign
      while ((match = regex.exec(html)) !== null) {
        const containerHtml = match[1] ?? match[0];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch: RegExpExecArray | null;
        // eslint-disable-next-line no-cond-assign
        while ((liMatch = liRegex.exec(containerHtml)) !== null) {
          const text = liMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (text) items.push(text);
        }
      }

      if (items.length > 0) {
        break;
      }
    }

    return items;
  }

  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      return hours * 60 + minutes;
    }

    return undefined;
  }

  private parseTimeFromText(text: string): number | undefined {
    if (!text) return undefined;

    const hours = text.match(/(\d+)\s*(?:hour|hr|h)/i);
    const minutes = text.match(/(\d+)\s*(?:minute|min|m)/i);

    let total = 0;
    if (hours) total += parseInt(hours[1], 10) * 60;
    if (minutes) total += parseInt(minutes[1], 10);

    return total > 0 ? total : undefined;
  }

  private parseServings(yield_: any): number | undefined {
    if (typeof yield_ === 'number') return yield_;
    if (typeof yield_ === 'string') {
      const match = yield_.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    }
    return undefined;
  }

  private parseServingsFromText(text: string): number | undefined {
    if (!text) return undefined;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private parseJsonLdIngredients(ingredients: any): string[] {
    if (Array.isArray(ingredients)) {
      return ingredients
        .map((i) => (typeof i === 'string' ? i : i.name || ''))
        .filter(Boolean);
    }
    return [];
  }

  private parseJsonLdInstructions(instructions: any): string[] {
    if (Array.isArray(instructions)) {
      return instructions
        .map((step) => {
          if (typeof step === 'string') return step;
          if (step.text) return step.text;
          if (step.name) return step.name;
          return '';
        })
        .filter(Boolean);
    }
    if (typeof instructions === 'string') {
      return [instructions];
    }
    return [];
  }

  private parseImage(image: any): string {
    if (typeof image === 'string') return image;
    if (image?.url) return image.url;
    if (Array.isArray(image) && image.length > 0) {
      return this.parseImage(image[0]);
    }
    return '';
  }
}

