import type { APIRoute } from 'astro';
import { PromptService } from '../services/PromptService';
import { jsonResponse, jsonError } from './_utils';

const service = new PromptService();

// GET /api/prompts - Get all prompts and settings
export const GET: APIRoute = async () => {
  try {
    const [prompts, settings] = await Promise.all([
      service.getAllPrompts(),
      service.getAllSettings(),
    ]);

    return jsonResponse({
      prompts,
      settings,
    });
  } catch (error) {
    console.error('Get prompts error:', error);
    return jsonError(error);
  }
};

// POST /api/prompts - Create or update a prompt or setting
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Create a new prompt
    if (data.action === 'create' && data.name && data.category && data.promptText) {
      const id = `${data.category}_${Date.now()}`;
      await service.createPrompt(id, data.name, data.category, data.promptText);
      return jsonResponse({ success: true, type: 'prompt', id });
    }

    // Update an existing prompt
    if (data.type === 'prompt' && data.id && data.promptText !== undefined) {
      await service.updatePrompt(data.id, data.promptText);
      return jsonResponse({ success: true, type: 'prompt', id: data.id });
    }

    // Update a setting
    if (data.type === 'setting' && data.key && data.value !== undefined) {
      await service.updateSetting(data.key, data.value);
      return jsonResponse({ success: true, type: 'setting', key: data.key });
    }

    return jsonError('Invalid request: missing required fields', 400);
  } catch (error) {
    console.error('Update prompt error:', error);
    return jsonError(error);
  }
};

// DELETE /api/prompts - Delete a prompt
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    if (!data.id) {
      return jsonError('Missing prompt id', 400);
    }

    await service.deletePrompt(data.id);
    return jsonResponse({ success: true, id: data.id });
  } catch (error) {
    console.error('Delete prompt error:', error);
    return jsonError(error);
  }
};
