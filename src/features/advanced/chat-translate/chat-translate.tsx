import { Translation as TranslationResponse } from '@src/features/advanced/chat-translate/backend/handler.ts';

interface Translation {
  original: string;
  context?: string;
  from: string;
  to: string;
  translated: Promise<string>;
  status:
    | 'TRANSLATED'
    | 'TRANSLATION_ERROR'
    | 'TRANSLATION_NOT_NEEDED'
    | 'UNKNOWN_LANGUAGE'
    | 'PENDING';
}

async function translate({
  input,
  to,
  from,
  context,
}: {
  input: string;
  to: string;
  from?: string;
  context?: string;
}): Promise<string> {
  const queryParams = new URLSearchParams();
  queryParams.append('q', input);
  queryParams.append('to', to);
  if (context) {
    queryParams.append('ctx', context);
  }
  if (from) {
    queryParams.append('from', from);
  }
  const res = await fetch(`https://dev.api.noship.net/translate?${queryParams}`);
  const translationResponse = (await res.json()) as TranslationResponse;
  return translationResponse.translation;
}

const toLang = 'en';
const translationCache = new Map<string, Translation>();

function onTileReady(tile: PrunTile) {
  subscribe($$(tile.anchor, C.MessageList.messages), messageList => {
    subscribe($$(messageList, C.Message.message), async message => {
      const text = _$(message, C.Message.text);
      const system = _$(message, C.Message.system);
      if (text && !system) {
        const messageText = text.innerText;
        const translation = translateMessage(messageText);
        translation.translated.then(translated => {
          switch (translation.status) {
            case 'TRANSLATED':
              text.style.color = 'green';
              text.innerText = translated;
              break;
            case 'TRANSLATION_ERROR':
              text.style.color = 'red';
              break;
            case 'TRANSLATION_NOT_NEEDED':
              text.style.color = 'yellow';
              text.classList.add('translation-not-needed');
              break;
            case 'UNKNOWN_LANGUAGE':
              text.style.color = 'orange';
              break;
            case 'PENDING':
              text.style.color = 'purple';
              break;
          }
        });
      }
    });
  });
}

function translateMessage(text: string): Translation {
  const cached = translationCache.get(text);
  if (cached) {
    return cached;
  }
  const translation = {
    original: text,
    to: toLang,
    status: 'PENDING',
  } as Translation;
  translationCache.set(translation.original, translation);
  if (translation.from == translation.to) {
    if (translation.from == toLang) {
      translation.status = 'TRANSLATION_NOT_NEEDED';
    }
    translation.translated = Promise.resolve(translation.original);
    return translation;
  } else {
    translation.translated = translate({
      input: translation.original,
      from: translation.from,
      to: translation.to,
    })
      .then(res => {
        translation.status = 'TRANSLATED';
        return res;
      })
      .catch(() => {
        translation.status = 'TRANSLATION_ERROR';
        return translation.original;
      });
    return translation;
  }
}

function init() {
  tiles.observe(['COMG', 'COMP', 'COMU'], onTileReady);
}

features.add(import.meta.url, init, 'Translates chat messages to a specified language.');
