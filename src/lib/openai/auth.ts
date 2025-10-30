import OpenAI from 'openai';

/**
 * Validates an OpenAI API key by calling the models endpoint.
 * Returns true if the API key is valid, false otherwise.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    await client.models.list();
    return true;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

