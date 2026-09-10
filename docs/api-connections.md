# API connections

First authenticated use opens a bilingual configuration dialog. A workspace may retain built-in AI or select Gemini, DeepSeek, or OpenAI. Google Places is configured separately for business discovery. Configuration is workspace-wide; blank keys preserve stored values and explicit removal deletes them. Connection tests issue small provider requests and may consume credit. Saved means configured, not verified.

Only authenticated same-origin requests may read settings or submit changes. GET returns presence flags, model names, and provider choice, never keys. AES-GCM encrypted configuration lives in the private KV namespace using the dedicated API_CONFIG_KEY Worker secret. Keep that encryption secret when redeploying; replacing it makes existing configuration unreadable. Do not export keys with customer backups or put them in browser storage. Selected providers receive evidence and private assessment rules during generation; the UI discloses this. No custom endpoint URLs are accepted.

Requests use official endpoints:
- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://ai.google.dev/gemini-api/docs/openai
- https://api-docs.deepseek.com/
- https://developers.openai.com/api/reference/resources/chat

Validated with provider response fixtures, not purchased/live API keys. Real keys must be supplied in the UI and tested for model access, enabled API, and billing. Existing built-in assessments remain available until another AI mode is selected.
