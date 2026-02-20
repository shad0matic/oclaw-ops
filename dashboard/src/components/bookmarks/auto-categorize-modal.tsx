"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Suggestion {
  bookmark_id: string;
  suggested_category_id: number | null;
  suggested_category_name: string | null;
  suggested_category_slug: string | null;
  confidence: number;
  reasoning: string;
  text?: string;
  author_handle?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  emoji: string;
}

interface AutoCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  uncategorizedCount: number;
  onComplete: () => void;
}

type Step = "configure" | "processing" | "review";
type ProcessMode = "all" | "first-n";

export function AutoCategorizeModal({
  isOpen,
  onClose,
  uncategorizedCount,
  onComplete,
}: AutoCategorizeModalProps) {
  const [step, setStep] = useState<Step>("configure");
  const [processMode, setProcessMode] = useState<ProcessMode>("all");
  const [firstN, setFirstN] = useState<number>(20);
  const [model, setModel] = useState<string>("gemini-2.0-flash-exp");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string>("");

  const handleStartAnalysis = async () => {
    try {
      setIsProcessing(true);
      setStep("processing");
      setError("");

      // Fetch categories for dropdown in review step
      const categoriesRes = await fetch("/api/bookmark-categories");
      const categoriesData = await categoriesRes.json();
      // Flatten categories (handle nested structure)
      const flatCategories: Category[] = [];
      const flattenCategories = (cats: any[]) => {
        cats.forEach((cat) => {
          flatCategories.push({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            emoji: cat.emoji,
          });
          if (cat.children && cat.children.length > 0) {
            flattenCategories(cat.children);
          }
        });
      };
      flattenCategories(categoriesData);
      setCategories(flatCategories);

      // Call auto-categorize API
      const limit = processMode === "all" ? uncategorizedCount : firstN;
      const response = await fetch("/api/x-bookmarks/auto-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to categorize");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setActualCost(data.cost_usd || 0);

      // Pre-select high-confidence suggestions
      const highConfidence = new Set(
        data.suggestions
          .filter((s: Suggestion) => s.confidence >= 0.5 && s.suggested_category_id)
          .map((s: Suggestion) => s.bookmark_id as string)
      );
      setSelectedSuggestions(highConfidence as Set<string>);

      setStep("review");
    } catch (err: any) {
      setError(err.message);
      setStep("configure");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    try {
      setIsProcessing(true);
      setError("");

      const assignments = Array.from(selectedSuggestions)
        .map((id) => {
          const suggestion = suggestions.find((s) => s.bookmark_id === id);
          if (!suggestion || !suggestion.suggested_category_slug) return null;
          return {
            bookmark_id: id,
            category_slug: suggestion.suggested_category_slug,
          };
        })
        .filter(Boolean);

      const response = await fetch("/api/x-bookmarks/auto-categorize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to apply");
      }

      onComplete();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("configure");
    setProcessMode("all");
    setFirstN(20);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setError("");
    onClose();
  };

  const toggleSuggestion = (bookmarkId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(bookmarkId)) {
      newSelected.delete(bookmarkId);
    } else {
      newSelected.add(bookmarkId);
    }
    setSelectedSuggestions(newSelected);
  };

  const updateSuggestionCategory = (bookmarkId: string, categorySlug: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.bookmark_id === bookmarkId
          ? {
              ...s,
              suggested_category_slug: categorySlug,
              suggested_category_name:
                categories.find((c) => c.slug === categorySlug)?.name || null,
              suggested_category_id:
                categories.find((c) => c.slug === categorySlug)?.id || null,
            }
          : s
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🤖 Auto-Categorize Bookmarks</DialogTitle>
          <DialogDescription>
            Use AI to automatically suggest categories for uncategorized bookmarks
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Configure */}
        {step === "configure" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Found {uncategorizedCount} uncategorized bookmark(s)
              </p>

              <RadioGroup value={processMode} onValueChange={(v) => setProcessMode(v as ProcessMode)}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All uncategorized</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first-n" id="first-n" />
                  <Label htmlFor="first-n" className="flex items-center gap-2">
                    First
                    <Input
                      type="number"
                      value={firstN}
                      onChange={(e) => setFirstN(parseInt(e.target.value) || 20)}
                      className="w-20 h-8"
                      min={1}
                      max={uncategorizedCount}
                    />
                    bookmarks
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Recommended)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Estimated cost: ~$0.01 - $0.05
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStartAnalysis} disabled={isProcessing}>
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="space-y-4">
            <Progress value={50} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              Analyzing bookmarks with AI...
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {selectedSuggestions.size} of {suggestions.length} will be categorized
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedSuggestions(
                    new Set(suggestions.map((s) => s.bookmark_id))
                  )
                }
              >
                Select All
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-2">
              {suggestions.map((suggestion) => {
                const isSelected = selectedSuggestions.has(suggestion.bookmark_id);
                const isLowConfidence = suggestion.confidence < 0.5;

                return (
                  <div
                    key={suggestion.bookmark_id}
                    className={`p-3 border rounded ${
                      isLowConfidence ? "bg-yellow-50 border-yellow-200" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSuggestion(suggestion.bookmark_id)}
                        disabled={!suggestion.suggested_category_slug}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {suggestion.text || `Bookmark ${suggestion.bookmark_id.slice(0, 8)}...`}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">→</span>
                          <Select
                            value={suggestion.suggested_category_slug || "none"}
                            onValueChange={(value) =>
                              updateSuggestionCategory(suggestion.bookmark_id, value)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {suggestion.suggested_category_slug && (
                                <SelectItem value={suggestion.suggested_category_slug}>
                                  {categories.find((c) => c.slug === suggestion.suggested_category_slug)?.emoji}{" "}
                                  {suggestion.suggested_category_name}
                                </SelectItem>
                              )}
                              {categories
                                .filter((c) => c.slug !== suggestion.suggested_category_slug)
                                .map((cat) => (
                                  <SelectItem key={cat.slug} value={cat.slug}>
                                    {cat.emoji} {cat.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">
                            {(suggestion.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {suggestion.reasoning && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {suggestion.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground">
              Actual cost: ${actualCost.toFixed(4)}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={isProcessing || selectedSuggestions.size === 0}
              >
                Apply Selected ({selectedSuggestions.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
