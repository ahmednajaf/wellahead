// Offline test configuration: these reserved example domains are never live endpoints.
process.env.TEXT_PROVIDER = 'openai';
process.env.SPEECH_PROVIDER = 'openai';
process.env.OPENAI_TEXT_MODEL = 'gpt-5.6-luna';
process.env.OPENAI_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
process.env.MEDGEMMA_ENDPOINT_URL = 'https://medgemma.europe-west4.example.test/endpoint:predict';
process.env.MEDASR_ENDPOINT_URL = 'https://medasr.europe-west1.example.test/endpoint:predict';
