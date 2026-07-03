import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuditReport } from '../types';

export interface UserSettings {
  embeddingModel: string;
  llmSelection: string;
  similarityThreshold: number;
  confidenceThreshold: number;
  topK: number;
  theme: 'dark' | 'light' | 'system';
  developerMode: boolean;
}

const defaultSettings: UserSettings = {
  embeddingModel: 'all-MiniLM-L6-v2',
  llmSelection: 'llama-3.1-8b-instant',
  similarityThreshold: 0.4,
  confidenceThreshold: 0.7,
  topK: 5,
  theme: 'dark',
  developerMode: false,
};

interface WorkspaceContextType {
  analyses: AuditReport[];
  addAnalysis: (report: AuditReport) => void;
  deleteAnalysis: (id: string) => void;
  getAnalysis: (id: string) => AuditReport | undefined;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [analyses, setAnalyses] = useState<AuditReport[]>(() => {
    const saved = localStorage.getItem('auditor_analyses');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('auditor_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('auditor_analyses', JSON.stringify(analyses));
  }, [analyses]);

  useEffect(() => {
    localStorage.setItem('auditor_settings', JSON.stringify(settings));
    
    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const addAnalysis = (report: AuditReport) => {
    setAnalyses(prev => {
      // Avoid duplicates
      if (prev.some(a => a.audit_id === report.audit_id)) return prev;
      return [{
        ...report,
        timestamp: report.timestamp || new Date().toISOString(),
      }, ...prev];
    });
  };

  const deleteAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.audit_id !== id));
  };
  
  const getAnalysis = (id: string) => {
    return analyses.find(a => a.audit_id === id);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <WorkspaceContext.Provider value={{ analyses, addAnalysis, deleteAnalysis, getAnalysis, settings, updateSettings }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
