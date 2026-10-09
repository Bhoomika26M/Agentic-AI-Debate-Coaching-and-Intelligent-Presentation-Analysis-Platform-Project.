'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AIModelDefinition } from './types';
import { AI_MODELS } from './ai-models';

interface ModelContextType {
  selectedModel: AIModelDefinition;
  setSelectedModelId: (id: string) => void;
  apiKeys: Record<string, string>;
  setProviderApiKey: (provider: string, key: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<AIModelDefinition>(AI_MODELS[0]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKeys = localStorage.getItem('verbal_arena_api_keys');
      if (storedKeys) {
        try {
          setApiKeys(JSON.parse(storedKeys));
        } catch (e) {}
      }
      const storedModelId = localStorage.getItem('verbal_arena_selected_model');
      if (storedModelId) {
        const found = AI_MODELS.find(m => m.id === storedModelId);
        if (found) setSelectedModel(found);
      }
    }
  }, []);

  const setSelectedModelId = (id: string) => {
    const found = AI_MODELS.find(m => m.id === id);
    if (found) {
      setSelectedModel(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem('verbal_arena_selected_model', id);
      }
    }
  };

  const setProviderApiKey = (provider: string, key: string) => {
    const updated = { ...apiKeys, [provider.toLowerCase()]: key };
    setApiKeys(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('verbal_arena_api_keys', JSON.stringify(updated));
    }
  };

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        setSelectedModelId,
        apiKeys,
        setProviderApiKey,
        isSettingsOpen,
        setIsSettingsOpen
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) throw new Error('useModel must be used within a ModelProvider');
  return context;
}
