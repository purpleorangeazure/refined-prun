type Engine = 'google' | 'deepl';

export interface Translation {
  key?: string;
  original: string;
  context?: string;
  from: string;
  to: string;
  translation: string;
}

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

interface MinimalGatewayProxyEvent {
  requestContext: {
    http: {
      method: string;
    };
  };
  body: string;
  queryStringParameters?: Record<string, string | undefined>;
}

interface MinimalResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
}

interface MinimalDeeplRequest {
  text: string[];
  target_lang: string;
  source_lang?: string;
  context?: string;
  show_billed_characters?: boolean;
  model_type?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized ';
  glossary_id?: string;
}

interface DeeplTranslation {
  detected_source_language: string;
  text: string;
  billed_characters?: number;
  model_type_used?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized ';
}

interface DeeplResponse {
  translations: DeeplTranslation[];
}

export async function handler(event: MinimalGatewayProxyEvent): Promise<MinimalResponse> {
  const response: MinimalResponse = {
    statusCode: 500,
    headers: {
      'content-type': 'application/json',
    },
  };
  switch (event.requestContext.http.method) {
    case 'GET': {
      const q = event.queryStringParameters?.q;
      const to = event.queryStringParameters?.to;
      const from = event.queryStringParameters?.from;
      const context = event.queryStringParameters?.ctx;
      if (!q) {
        response.statusCode = 400;
        response.body = JSON.stringify({ error: 'Missing parameter "q"' });
        return response;
      }
      if (!to) {
        response.statusCode = 400;
        response.body = JSON.stringify({ error: 'Missing parameter "to"' });
        return response;
      }
      try {
        console.log(`Translating "${q}" from "${from}" to "${to}"`);
        const translation = await translate({
          text: q,
          from,
          to,
          context,
        });
        console.log(`Translated "${q}" from "${from}" to "${to}": "${translation.translation}"`);
        response.statusCode = 200;
        response.body = JSON.stringify(translation);
        return response;
      } catch (e) {
        response.statusCode = 500;
        response.body = JSON.stringify(e);
        return response;
      }
    }
    default:
      response.statusCode = 405;
      response.body = JSON.stringify({ error: 'Method not allowed' });
      return response;
  }
}

function translate({
  text,
  context,
  from,
  to,
  engine = 'deepl',
}: {
  text: string;
  context?: string;
  from?: string;
  to: string;
  engine?: Engine;
}): Promise<Translation> {
  switch (engine) {
    case 'google':
      throw "Google Translate is not supported yet. Please use 'deepl' instead.";
    case 'deepl':
      return deeplTranslate({ text, to, from, context });
  }
}

async function deeplTranslate({
  text,
  to,
  from,
  context,
}: {
  text: string;
  to: string;
  from?: string;
  context?: string;
}): Promise<Translation> {
  const request: MinimalDeeplRequest = {
    text: [text],
    context: context,
    target_lang: to,
    source_lang: from,
  };
  const headers = {
    Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
    'Content-Type': 'application/json',
  };
  return fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  }).then(async res => {
    const json = (await res.json()) as DeeplResponse;
    const translation = json.translations[0];
    return {
      original: text,
      from: translation.detected_source_language,
      to,
      translation: translation.text,
    };
  });
}
