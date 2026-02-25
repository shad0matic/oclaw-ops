'use client';

import React, { useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Label } from '@/components/ui/label';
 import { Input } from '@/components/ui/input';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Progress } from '@/components/ui/progress';
 import { Checkbox } from '@/components/ui/checkbox';

interface BookmarkSuggestion {
  bookmark_id: string;
  title: string;
  suggested_category_id: number;
  suggested_category_name: string;
  confidence: number;
  reasoning: string;
}

interface AutoCategorizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uncategorizedCount: number;
  selectedBookmarkIds: string[];
  onApply: () => void;
}

const AutoCategorizeModal = ({ open, onOpenChange, uncategorizedCount, selectedBookmarkIds, onApply }: AutoCategorizeModalProps) => {
  const [step, setStep] = useState<'configure' | 'processing' | 'review'>('configure');
  const [processOption, setProcessOption] = useState<'all' | 'selected' | 'firstN'>('all');
  const [firstN, setFirstN] = useState<number>(20);
  const [model, setModel] = useState<string>('gemini-2.0-flash');
  const [progress, setProgress] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<BookmarkSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (step === 'processing') {
      // Simulate API call to process bookmarks
      const total = processOption === 'all' ? uncategorizedCount : processOption === 'selected' ? selectedBookmarkIds.length : firstN;
      let processed = 0;
      const interval = setInterval(() => {
        processed += Math.floor(Math.random() * 5) + 1;
        if (processed >= total) {
          setProgress(100);
          setStep('review');
          // Mock data for review step
          const mockSuggestions: BookmarkSuggestion[] = Array.from({ length: total }, (_, i) => ({
            bookmark_id: `bm-${i}`,
            title: `Bookmark ${i + 1}`,
            suggested_category_id: Math.floor(Math.random() * 10) + 1,
            suggested_category_name: `Category ${Math.floor(Math.random() * 10) + 1}`,
            confidence: Math.random(),
            reasoning: `Reasoning for bookmark ${i + 1}`,
          }));
          setSuggestions(mockSuggestions);
          setSelectedSuggestions(mockSuggestions.map(s => s.bookmark_id));
          clearInterval(interval);
        } else {
          setProgress((processed / total) * 100);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [step, processOption, uncategorizedCount, selectedBookmarkIds.length, firstN]);

  const handleStartAnalysis = () => {
    setStep('processing');
    setProgress(0);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep('configure');
    setProgress(0);
    setSuggestions([]);
    setSelectedSuggestions([]);
  };

  const handleApplySelected = () => {
    // Here, send the selected suggestions to the API to apply categories
    console.log('Applying categories for:', selectedSuggestions);
    onApply();
    handleCancel();
  };

  const toggleSuggestionSelection = (bookmarkId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(bookmarkId) 
        ? prev.filter(id => id !== bookmarkId) 
        : [...prev, bookmarkId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(suggestions.map(s => s.bookmark_id));
    } else {
      setSelectedSuggestions([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>🤖 Auto-Categorize Bookmarks</DialogTitle>
        </DialogHeader>
        {step === 'configure' && (
          <div className="space-y-4">
            <p>Found {uncategorizedCount} uncategorized bookmarks</p>
            <div>
              <Label>Process:</Label>
              <RadioGroup value={processOption} onValueChange={(value) => setProcessOption(value as 'all' | 'selected' | 'firstN')} className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All uncategorized ({uncategorizedCount})</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" disabled={selectedBookmarkIds.length === 0} />
                  <Label htmlFor="selected">Selected only ({selectedBookmarkIds.length})</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="firstN" id="firstN" />
                  <Label htmlFor="firstN">First N:</Label>
                  <Input 
                    type="number" 
                    value={firstN} 
                    onChange={(e) => setFirstN(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-20" 
                    disabled={processOption !== 'firstN'} 
                  />
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="model">Model:</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                  <SelectItem value="gemini-2.0-pro">Gemini 2.0 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p>Estimated cost: ~$0.02</p>
          </div>
        )}
        {step === 'processing' && (
          <div className="space-y-4">
            <p>Processing bookmarks...</p>
            <Progress value={progress} className="w-full" />
            <p>{Math.round(progress)}% complete</p>
          </div>
        )}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p>Review Suggestions</p>
              <Button variant="outline" onClick={() => handleSelectAll(selectedSuggestions.length !== suggestions.length)}>Select All</Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded p-2">
              {suggestions.map(suggestion => (
                <div key={suggestion.bookmark_id} className={`flex items-center justify-between p-2 border rounded ${suggestion.confidence < 0.5 ? 'bg-yellow-50' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={selectedSuggestions.includes(suggestion.bookmark_id)} 
                      onCheckedChange={() => toggleSuggestionSelection(suggestion.bookmark_id)} 
                    />
                    <div>
                      <p>{suggestion.title}</p>
                      <p className="text-sm">→ {suggestion.confidence < 0.5 ? '❓ Uncategorized (low confidence)' : `${suggestion.suggested_category_name}`}</p>
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="text-sm w-auto">
                      <SelectValue placeholder="Change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Category 1</SelectItem>
                      <SelectItem value="2">Category 2</SelectItem>
                      {/* Dynamic list of categories would be here */}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <p>{selectedSuggestions.length}/{suggestions.length} will be categorized</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          {step === 'configure' && <Button onClick={handleStartAnalysis}>Start Analysis</Button>}
          {step === 'review' && <Button onClick={handleApplySelected} disabled={selectedSuggestions.length === 0}>Apply Selected ({selectedSuggestions.length})</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoCategorizeModal;
