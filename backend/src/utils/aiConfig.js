export function shouldUseMockAI(apiKey) {
  const useMock = !apiKey || apiKey.startsWith('your_openai_api_key') || apiKey.startsWith('change_this') || apiKey === 'mock';

  if (useMock && process.env.NODE_ENV === 'production' && process.env.STRICT_AI === 'true') {
    const error = new Error('AI service is not configured.');
    error.statusCode = 503;
    error.errorCode = 'AI_UNAVAILABLE';
    throw error;
  }

  return useMock;
}
