# Research: Provider Model Discovery APIs

This document outlines the findings of research into the model discovery APIs of various AI providers. The goal is to determine the feasibility of automatically discovering available models instead of maintaining hardcoded lists.

## Table of Contents

- [Anthropic](#anthropic)
- [OpenAI](#openai)
- [Google](#google)
- [xAI](#xai)
- [OpenRouter](#openrouter)
- [Summary & Recommendation](#summary--recommendation)
- [Draft Implementation Plan](#draft-implementation-plan)

---

## Anthropic

- **API Endpoint:** `GET https://api.anthropic.com/v1/models`
- **Auth Required:** Yes, via `x-api-key` header.
- **Response Format:** The API returns a JSON object with a `data` array. Each model object contains:
    - `id`: (e.g., `claude-3-opus-20240229`)
    - `display_name`: (e.g., "Claude 3 Opus")
    - `created_at`: Release date as a datetime string.
- **Rate Limits:** Rate limits are tiered and depend on the user's account level. They are applied per model class (Opus, Sonnet, Haiku) and are measured in requests per minute (RPM), input tokens per minute (ITPM), and output tokens per minute (OTPM). The specific limits are not returned by the API but can be found in the official documentation. The API response includes headers like `anthropic-ratelimit-requests-remaining` and `anthropic-ratelimit-tokens-remaining` to track current status.
- **Deprecated/Preview Models:** The API appears to return all models, including those marked as deprecated in the pricing documentation. Beta models/features can be accessed via an `anthropic-beta` header.
- **Missing Information:** The API response **does not** include context window size or pricing information. This data must be sourced from the official documentation/pricing pages.
    - **Context Window:** As of early 2026, Claude Opus 4.6, Sonnet 4.5, and Sonnet 4 support a 1M token context window. All other models support 200K+ tokens.
    - **Pricing:** Pricing is available on the official Anthropic pricing page and varies per model for input and output tokens.

### Sample API Response

A sample response could not be located in the official documentation, but based on the documented fields, it would look like this:

```json
{
  "data": [
    {
      "id": "claude-3-opus-20240229",
      "display_name": "Claude 3 Opus",
      "created_at": "2024-02-29T00:00:00Z",
      "type": "model"
    },
    {
      "id": "claude-3-sonnet-20240229",
      "display_name": "Claude 3 Sonnet",
      "created_at": "2024-02-29T00:00:00Z",
      "type": "model"
    }
  ],
  "first_id": "claude-3-opus-20240229",
  "last_id": "claude-3-sonnet-20240229",
  "has_more": false
}
```

---

---

## OpenAI

- **API Endpoint:** `GET https://api.openai.com/v1/models`
- **Auth Required:** Yes, via `Authorization: Bearer <token>` header.
- **Response Format:** The API returns a JSON object with a `data` array. Each model object is very basic and contains:
    - `id`: (e.g., `gpt-4-0125-preview`)
    - `created`: Unix timestamp.
    - `owned_by`: (e.g., `openai`)
    - `object`: Always `model`.
- **Rate Limits:** Similar to Anthropic, rate limits are based on usage tiers. They are measured in RPM (requests per minute), RPD (requests per day), TPM (tokens per minute), and TPD (tokens per day). The `/v1/models` endpoint itself is not explicitly rate-limited, but general API usage is. The limits are returned in API response headers (e.g., `x-ratelimit-limit-requests`).
- **Deprecated/Preview Models:** The endpoint lists all models available to the API key, which can include models that are deprecated or in preview. There is no flag to distinguish them in the response.
- **Missing Information:** The API response is minimal and **does not** include:
    - A human-readable model name (`display_name`).
    - Context window size.
    - Pricing information.
    - This data must be sourced from the OpenAI documentation, specifically the "Model comparison" table.

### Sample API Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4-0125-preview",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    },
    {
      "id": "dall-e-3",
      "object": "model",
      "created": 1698785189,
      "owned_by": "system"
    },
    {
      "id": "gpt-3.5-turbo-instruct",
      "object": "model",
      "created": 1692901427,
      "owned_by": "system"
    }
  ]
}
```

---

---

## Google

- **API Endpoint:** `GET https://generativelace.googleapis.com/v1beta/models`
- **Auth Required:** Yes, via `?key=<token>` query parameter.
- **Response Format:** The API returns a JSON object with a `models` array. Each model object is quite detailed and includes:
    - `name`: (e.g., `models/gemini-1.5-pro-latest`)
    - `displayName`: (e.g., "Gemini 1.5 Pro")
    - `description`: A detailed description.
    - `version`: The model version number.
    - `inputTokenLimit`: The context window size.
    - `outputTokenLimit`: The maximum number of output tokens.
    - Other metadata like `supportedGenerationMethods`, `temperature`, `topP`, and `topK`.
- **Rate Limits:** Rate limits are tiered and based on total spending on Google Cloud services. The official documentation pages were inaccessible during this research, but community sources indicate the limits are measured in requests per minute and can be restrictive on the free tier.
- **Deprecated/Preview Models:** The endpoint is a `v1beta` endpoint, which implies it may return preview or beta models. The response format does not have an explicit field to indicate this.
- **Missing Information:** The API response **does not** include pricing information. This must be sourced from the official pricing pages.

### Sample API Response

A sample response was not available from official documentation, but based on community examples, the structure is as follows:

```json
{
  "models": [
    {
      "name": "models/gemini-1.5-pro-latest",
      "version": "1.0.0",
      "displayName": "Gemini 1.5 Pro",
      "description": "The most capable model for general purpose tasks.",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192,
      "supportedGenerationMethods": [
        "generateContent",
        "embedContent"
      ],
      "temperature": 0.9,
      "topP": 1,
      "topK": 1
    },
    {
      "name": "models/gemini-1.5-flash-latest",
      "version": "1.0.0",
      "displayName": "Gemini 1.5 Flash",
      "description": "A fast and versatile model for general purpose tasks.",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192,
      "supportedGenerationMethods": [
        "generateContent",
        "embedContent"
      ],
      "temperature": 0.9,
      "topP": 1,
      "topK": 1
    }
  ]
}
```

---

---

## xAI

- **API Endpoint:** As of this research, xAI **does not appear to have a public API endpoint** for listing available models.
- **Auth Required:** N/A
- **Response Format:** N/A
- **Discovery Method:** Model information must be sourced from the official documentation. The "Models and Pricing" page provides a comprehensive table that includes:
    - Model name (e.g., `grok-4-1-fast-reasoning`)
    - Context window size
    - Rate limits (TPM and RPM)
    - Pricing for input and output tokens.
- **Rate Limits:** The documentation specifies rate limits for each model in Tokens Per Minute (TPM) and Requests Per Minute (RPM). For example, `grok-4-1-fast-reasoning` is listed with a 4M TPM and 480 RPM limit.
- **Deprecated/Preview Models:** The documentation page includes model aliases (e.g., `<modelname>-latest`) which point to the most recent version, suggesting older versions might be implicitly deprecated but still accessible via specific version names. There is no explicit "deprecated" flag.

### Sample Information (from Documentation Table)

| Model | Context | Rate Limits | Pricing [in (cached in) / out] |
| --- | --- | --- | --- |
| grok-4-1-fast-reasoning | 2,000,000 | 4M TPM, 480 RPM | $0.20 ($0.05) / $0.50 |
| grok-3-mini | 131,072 | 480 RPM | $0.30 ($0.07) / $0.50 |

---

---

## OpenRouter

- **API Endpoint:** `GET https://openrouter.ai/api/v1/models`
- **Auth Required:** Yes, via `Authorization: Bearer <token>` header.
- **Response Format:** This is the most comprehensive model discovery endpoint found in this research. It returns a JSON object with a `data` array, where each model object contains nearly all the required information:
    - `id`: The model identifier (e.g., `openai/gpt-4o`).
    - `name`: Human-readable name.
    - `description`: Detailed description.
    - `pricing`: An object with `prompt`, `completion`, `request`, and `image` costs.
    - `context_length`: The context window size.
    - `architecture`: Details like `modality` and `tokenizer`.
    - `top_provider`: Information on the upstream provider.
    - `per_request_limits`: Max prompt and completion tokens allowed.
    - `expiration_date`: A clear indicator for potentially deprecated models.
- **Rate Limits:** The documentation for the `/models` endpoint does not specify rate limits, but general API usage is subject to user-specific rate limits. This information is not part of the model object itself.
- **Deprecated/Preview Models:** The `expiration_date` field provides a programmatic way to identify models that are planned for deprecation.

### Sample API Response Snippet

```json
{
  "data": [
    {
      "id": "google/gemini-pro",
      "name": "Google: Gemini Pro",
      "description": "Google's best model for scaling across a wide range of tasks. Features a 1M context window and cutting-edge multimodal capabilities.",
      "pricing": {
        "prompt": "0.0000025",
        "completion": "0.0000075"
      },
      "context_length": 1048576,
      "architecture": {
        "modality": "text",
        "tokenizer": "Gemini",
        "instruct_type": "claude"
      },
      "top_provider": {
        "max_completion": 8192
      },
      "per_request_limits": {
        "prompt_tokens": 1048576,
        "completion_tokens": 8192
      },
      "expiration_date": null
    }
  ]
}
```

---

---

## Summary & Recommendation

This research shows a significant variance in the availability and quality of model discovery APIs across different AI providers.

| Provider | Discovery API? | Returns Pricing? | Returns Context Window? |
| :--- | :---: | :---: | :---: |
| **Anthropic** | ✅ Yes | ❌ No | ❌ No |
| **OpenAI** | ✅ Yes | ❌ No | ❌ No |
| **Google** | ✅ Yes | ❌ No | ✅ Yes |
| **xAI** | ❌ No | N/A | N/A |
| **OpenRouter** | ✅ Yes | ✅ Yes | ✅ Yes |

**Key Findings:**

*   **OpenRouter** provides a best-in-class discovery API. It returns a comprehensive list of models with all the necessary metadata, including pricing, context windows, and even an `expiration_date` for deprecation planning. This is the ideal implementation.
*   **Google's** API is also quite good, providing context window information directly in the API response, which is a significant advantage over Anthropic and OpenAI.
*   **Anthropic and OpenAI** offer very basic discovery endpoints. While they programmatically provide a list of model IDs, they omit crucial information like pricing and context windows, requiring this data to be sourced from their documentation pages manually.
*   **xAI** does not appear to offer a model discovery API at all, requiring a fully manual approach of consulting their documentation.

**Recommendation:**

Automating model discovery is **highly feasible and recommended**, but it will require a hybrid approach.

1.  **Prioritize API-first:** For providers like **OpenRouter** and **Google**, the discovery process can be fully automated. The application can periodically fetch the model list and update a local database or cache with the latest information.
2.  **Implement Hybrid Scrapers/Manual Updates:** For **Anthropic** and **OpenAI**, the model IDs can be discovered automatically, but the missing metadata (pricing, context window) will need to be supplemented. This could be done via a web scraper that targets their pricing/model documentation pages, or through a manual process where a human updates a configuration file when new models are released. Given the fragility of web scraping, a semi-automated process with manual oversight is likely the most robust solution.
3.  **Manual Configuration for xAI:** For **xAI**, a manual approach is the only option until a discovery API is provided. Model information will need to be maintained in a configuration file.

Adopting this hybrid strategy will significantly reduce the burden of manually maintaining model lists and allow the system to adapt to new models from most providers automatically. The implementation should be designed with a clear interface that allows for these different data sources (API, scraped data, manual config) to be consolidated into a single, unified model catalog.

---

## Draft Implementation Plan

This plan outlines a 3-step approach to building a robust, hybrid model discovery service.

### Step 1: Core Service & OpenRouter Integration

1.  **Database Schema:** Design a `models` table in the database to store a unified catalog of models from all providers. Key fields should include:
    *   `provider` (e.g., 'openai', 'openrouter')
    *   `model_id` (e.g., 'gpt-4o')
    *   `display_name`
    *   `context_window`
    *   `input_token_price`
    *   `output_token_price`
    *   `supports_vision` (boolean)
    *   `is_deprecated` (boolean)
    *   `raw_api_response` (JSONB for storing the original data)
    *   `last_updated` (timestamp)

2.  **Cron Job:** Create a scheduled job (e.g., runs every 6 hours) that is responsible for updating the model catalog.

3.  **OpenRouter Client:** Implement the first provider client for OpenRouter.
    *   It should fetch data from `GET https://openrouter.ai/api/v1/models`.
    *   It will then parse the response and perform an "upsert" operation into the `models` table for each model, matching on `provider` and `model_id`.
    *   This will serve as the template for other provider integrations.

### Step 2: Add Google, Anthropic, and OpenAI Clients

1.  **Google Client:** Implement a client for Google's `v1beta/models` endpoint.
    *   Fetch the model list and upsert into the database.
    *   Since pricing is missing, the job should flag these models as "pricing_missing".

2.  **Anthropic & OpenAI Clients:** Implement clients for their respective `/v1/models` endpoints.
    *   Fetch the basic model lists and upsert.
    *   Flag these models as "metadata_missing" (since both pricing and context window are absent).

3.  **Manual Override/Supplementation Table:** Create a second table, `model_overrides`, with the same structure as the `models` table.
    *   This table will hold manually entered data for the missing fields from Google, Anthropic, and OpenAI (and all data for xAI).
    *   Create a simple admin interface or CLI tool to manage entries in this table.

4.  **Consolidated View:** Create a database view or a query function that joins the `models` table with the `model_overrides` table, where data from `model_overrides` takes precedence. This will provide the application with a complete, unified view of all models.

### Step 3: Add xAI and Finalize

1.  **xAI Manual Entry:** Use the admin tool from Step 2 to add the xAI models from their documentation into the `model_overrides` table. Since there is no API, these will be fully manual entries.

2.  **API Endpoint:** Expose an internal API endpoint (e.g., `GET /api/v1/models/catalog`) that returns the consolidated list of models from the view created in Step 2.

3.  **Monitoring & Alerting:** Add basic monitoring to the cron job. If a provider's API fails to respond or returns an empty list, it should send an alert (e.g., to a Slack channel or logging service) so the issue can be investigated. It should *not* delete the existing models in the database on a failed run.
