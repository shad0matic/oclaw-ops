
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const modelCatalogData = {
  Anthropic: {
    name: "Anthropic",
    type: "subscription",
    cost: "Claude Max $100/mo",
    models: [
      { name: "claude-opus-4-6" },
      { name: "claude-opus-4-5" },
      { name: "claude-sonnet-4-5" },
      { name: "claude-haiku-4-5" },
    ],
  },
  OpenAI: {
    name: "OpenAI",
    type: "subscription",
    cost: "ChatGPT Plus ~$20/mo",
    models: [{ name: "gpt-5.2" }, { name: "gpt-5.3-codex" }],
  },
  Google: {
    name: "Google",
    type: "subscription",
    cost: "AI Pro ~$20/mo",
    models: [{ name: "gemini-2.5-pro" }, { name: "gemini-2.5-flash" }],
  },
  xAI: {
    name: "xAI",
    type: "metered",
    cost: "Pay-per-use",
    models: [{ name: "grok-3" }, { name: "grok-4-fast" }],
  },
};

export function ModelCatalog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Catalog</CardTitle>
        <CardDescription>
          Available models grouped by provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(modelCatalogData).map((provider) => (
            <div key={provider.name}>
              <h3 className="text-lg font-semibold">{provider.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{provider.cost}</p>
              <div className="flex flex-wrap gap-2">
                {provider.models.map((model) => (
                  <div key={model.name} className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <Badge
                      variant={
                        provider.type === "subscription" ? "default" : "secondary"
                      }
                      className={`${
                        provider.type === "subscription"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      }`}
                    >
                      {provider.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
