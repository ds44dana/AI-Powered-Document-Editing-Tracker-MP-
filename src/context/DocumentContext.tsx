import React, { useCallback, useEffect, useState, useRef, createContext, useContext, createElement } from 'react';
import { parseDocument, getQualityDescription } from '../utils/documentParsing';
// Types
type Sentence = {
  id: string;
  text: string;
  suggestion: string;
  status: 'unchanged' | 'accepted' | 'rejected' | 'edited';
};
type DocumentVersion = {
  versionId: string;
  versionNumber: number;
  sentences: Sentence[];
  timestamp: Date;
  createdBy: 'user' | 'auto';
  comment?: string;
};
type Document = {
  id: string;
  name: string;
  sentences: Sentence[];
  lastModified: Date;
  version?: number;
  originalFormat?: string;
  fileSize?: number;
  createdAt?: Date;
  versionHistory?: DocumentVersion[];
  isSaving?: boolean;
  lastSaved?: Date;
  extractionQuality?: number;
  extractionSource?: string;
};
type DocumentHistoryState = {
  document: Document;
  timestamp: Date;
};
type ExportFormat = 'docx' | 'txt' | 'md';
type ExportType = 'original' | 'edited';
type DocumentContextType = {
  currentDocument: Document | null;
  documents: Document[];
  setCurrentDocument: (doc: Document | null) => void;
  updateSentence: (sentenceId: string, newText: string, status: Sentence['status']) => void;
  acceptSuggestion: (sentenceId: string) => void;
  rejectSuggestion: (sentenceId: string) => void;
  createNewDocument: (name: string, text?: string) => void;
  generateSuggestions: () => void;
  regenerateSingleSuggestion: (sentenceId: string) => void;
  updateMultipleSentences: (text: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveVersion: (comment?: string) => void;
  deleteDocument: (docId: string) => void;
  acceptAllSuggestions: () => void;
  runConsistencyCheck: () => void;
  runFactCheck: () => void;
  runStyleCheck: (style?: string) => void;
  splitAndAlignSentences: () => void;
  uploadDocument: (file: File) => Promise<void>;
  downloadDocument: (docId: string, format: ExportFormat, type: ExportType) => void;
  renameDocument: (docId: string, newName: string) => void;
  duplicateDocument: (docId: string) => void;
  getDocumentVersions: (docId: string) => DocumentVersion[];
  rollbackToVersion: (docId: string, versionId: string) => void;
  isSaving: boolean;
  lastSaved: Date | null;
};
// Helper function to split text into sentences
const splitIntoSentences = (text: string): Sentence[] => {
  // More sophisticated sentence splitting
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentenceTexts = text.match(sentenceRegex) || [];
  // Handle case where text doesn't end with punctuation
  const lastSentenceWithoutPunctuation = text.replace(sentenceRegex, '').trim();
  if (lastSentenceWithoutPunctuation) {
    sentenceTexts.push(lastSentenceWithoutPunctuation + '.');
  }
  return sentenceTexts.map((text, index) => ({
    id: `sentence-${Date.now()}-${index}`,
    text: text.trim(),
    suggestion: text.trim(),
    status: 'unchanged'
  }));
};
// Create context
const DocumentContext = createContext<DocumentContextType | undefined>(undefined);
// Provider component
export const DocumentProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // Undo/Redo history
  const [history, setHistory] = useState<DocumentHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Autosave timer
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Load documents from localStorage on initial render
  useEffect(() => {
    const savedDocuments = localStorage.getItem('documents');
    if (savedDocuments) {
      try {
        const parsed = JSON.parse(savedDocuments);
        setDocuments(parsed.map((doc: any) => ({
          ...doc,
          lastModified: new Date(doc.lastModified),
          createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          lastSaved: doc.lastSaved ? new Date(doc.lastSaved) : null,
          versionHistory: (doc.versionHistory || []).map((version: any) => ({
            ...version,
            timestamp: new Date(version.timestamp)
          }))
        })));
      } catch (e) {
        console.error('Failed to parse saved documents', e);
      }
    }
  }, []);
  // Save documents to localStorage whenever they change
  useEffect(() => {
    if (documents.length > 0) {
      try {
        // Create a sanitized copy of documents for storage
        const sanitizedDocs = documents.map(doc => ({
          ...doc,
          lastModified: doc.lastModified.toISOString(),
          createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
          lastSaved: doc.lastSaved ? doc.lastSaved.toISOString() : null,
          versionHistory: (doc.versionHistory || []).map(version => ({
            ...version,
            timestamp: version.timestamp.toISOString()
          }))
        }));
        localStorage.setItem('documents', JSON.stringify(sanitizedDocs));
      } catch (e) {
        console.error('Failed to save documents to localStorage:', e);
      }
    }
  }, [documents]);
  // Update undo/redo availability
  useEffect(() => {
    setCanUndo(historyIndex > 0);
    setCanRedo(historyIndex < history.length - 1);
  }, [historyIndex, history.length]);
  // Add current document state to history
  const addToHistory = useCallback((doc: Document) => {
    // Create a clean copy of the document for history
    const historyCopy = {
      ...doc,
      sentences: doc.sentences.map(s => ({
        ...s
      })),
      versionHistory: undefined // Don't store version history in history states
    };
    // Trim history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    // Add new state
    setHistory([...newHistory, {
      document: historyCopy,
      timestamp: new Date()
    }]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);
  // Initialize history when document changes
  useEffect(() => {
    if (currentDocument && history.length === 0) {
      addToHistory(currentDocument);
    }
  }, [currentDocument, history.length, addToHistory]);
  // Simulate saving to cloud storage
  const simulateCloudSave = useCallback((document: Document) => {
    setIsSaving(true);
    // Simulate network delay (500-1500ms)
    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      const now = new Date();
      // Update the document in the documents array
      setDocuments(docs => docs.map(doc => doc.id === document.id ? {
        ...document,
        lastSaved: now
      } : doc));
      // Update the current document if it's the one being saved
      if (currentDocument && currentDocument.id === document.id) {
        setCurrentDocument(prev => prev ? {
          ...prev,
          lastSaved: now
        } : null);
      }
      setIsSaving(false);
      setLastSaved(now);
      console.log(`Document "${document.name}" saved to cloud storage at ${now.toLocaleTimeString()}`);
    }, delay);
  }, [currentDocument]);
  // Autosave functionality
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      if (currentDocument) {
        console.log('Autosaving document...');
        // Update documents array with current document
        setDocuments(docs => docs.map(doc => doc.id === currentDocument.id ? currentDocument : doc));
        // Simulate saving to cloud storage
        simulateCloudSave(currentDocument);
      }
    }, 2000); // Autosave after 2 seconds of inactivity
  }, [currentDocument, simulateCloudSave]);
  // Clean up autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);
  // Create a snapshot of the current document state
  const createSnapshot = useCallback((document: Document, createdBy: 'user' | 'auto', comment?: string) => {
    const currentVersion = document.version || 1;
    const versionHistory = document.versionHistory || [];
    // Create a new version entry
    const newVersion: DocumentVersion = {
      versionId: `v${currentVersion}-${Date.now()}`,
      versionNumber: currentVersion,
      sentences: JSON.parse(JSON.stringify(document.sentences)),
      timestamp: new Date(),
      createdBy,
      comment
    };
    // Add to version history
    const updatedVersionHistory = [...versionHistory, newVersion];
    // Return updated document with new version
    return {
      ...document,
      version: currentVersion + 1,
      versionHistory: updatedVersionHistory,
      lastModified: new Date()
    };
  }, []);
  // Update a sentence in the current document
  const updateSentence = useCallback((sentenceId: string, newText: string, status: Sentence['status']) => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    const updatedSentences = currentDocument.sentences.map(sentence => sentence.id === sentenceId ? {
      ...sentence,
      text: newText,
      status
    } : sentence);
    const updatedDocument = {
      ...currentDocument,
      sentences: updatedSentences,
      lastModified: new Date()
    };
    setCurrentDocument(updatedDocument);
    scheduleAutosave();
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Accept a suggestion
  const acceptSuggestion = useCallback((sentenceId: string) => {
    if (!currentDocument) return;
    const sentence = currentDocument.sentences.find(s => s.id === sentenceId);
    if (sentence) {
      updateSentence(sentenceId, sentence.suggestion, 'accepted');
    }
  }, [currentDocument, updateSentence]);
  // Reject a suggestion
  const rejectSuggestion = useCallback((sentenceId: string) => {
    if (!currentDocument) return;
    const sentence = currentDocument.sentences.find(s => s.id === sentenceId);
    if (sentence) {
      updateSentence(sentenceId, sentence.text, 'rejected');
    }
  }, [currentDocument, updateSentence]);
  // Create a new document
  const createNewDocument = useCallback((name: string, text?: string) => {
    const sentences = text ? splitIntoSentences(text) : [];
    const now = new Date();
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      name,
      sentences,
      lastModified: now,
      createdAt: now,
      lastSaved: now,
      version: 1,
      versionHistory: []
    };
    // Create initial version if there's content
    if (sentences.length > 0) {
      newDoc.versionHistory = [{
        versionId: `v1-${Date.now()}`,
        versionNumber: 1,
        sentences: JSON.parse(JSON.stringify(sentences)),
        timestamp: now,
        createdBy: 'user',
        comment: 'Initial version'
      }];
    }
    setDocuments(docs => [...docs, newDoc]);
    setCurrentDocument(newDoc);
    // Reset history when creating a new document
    setHistory([{
      document: JSON.parse(JSON.stringify(newDoc)),
      timestamp: now
    }]);
    setHistoryIndex(0);
    // Simulate saving to cloud storage
    simulateCloudSave(newDoc);
  }, [simulateCloudSave]);
  // Delete a document
  const deleteDocument = useCallback((docId: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== docId));
    if (currentDocument && currentDocument.id === docId) {
      setCurrentDocument(null);
    }
  }, [currentDocument]);
  // Update multiple sentences at once
  const updateMultipleSentences = useCallback(async (text: string) => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Split the new text into sentences
    const newSentences = splitIntoSentences(text);
    const updatedDocument = {
      ...currentDocument,
      sentences: newSentences,
      lastModified: new Date()
    };
    setCurrentDocument(updatedDocument);
    // Create an automatic snapshot for bulk edit
    const documentWithSnapshot = createSnapshot(updatedDocument, 'auto', 'Bulk edit');
    setCurrentDocument(documentWithSnapshot);
    setIsSaving(true);
    // Generate suggestions for the new sentences using our API
    try {
      const updatedSentences = [...documentWithSnapshot.sentences];
      for (let i = 0; i < updatedSentences.length; i++) {
        const sentence = updatedSentences[i];
        try {
          // Call our server-side API instead of OpenAI directly
          const suggestion = await generateSuggestion(sentence.text);
          // Update the sentence with the new suggestion
          updatedSentences[i] = {
            ...sentence,
            suggestion: suggestion
          };
        } catch (error) {
          console.error(`Error generating suggestion for sentence ${i}:`, error);
          // If API call fails, fall back to the placeholder suggestion
          updatedSentences[i] = {
            ...sentence,
            suggestion: generatePlaceholderSuggestion(sentence.text)
          };
        }
      }
      const docWithSuggestions = {
        ...documentWithSnapshot,
        sentences: updatedSentences
      };
      setCurrentDocument(docWithSuggestions);
      scheduleAutosave();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fall back to placeholder suggestions
      const fallbackSentences = documentWithSnapshot.sentences.map(sentence => ({
        ...sentence,
        suggestion: generatePlaceholderSuggestion(sentence.text)
      }));
      const fallbackDocument = {
        ...documentWithSnapshot,
        sentences: fallbackSentences
      };
      setCurrentDocument(fallbackDocument);
      scheduleAutosave();
    } finally {
      setIsSaving(false);
    }
  }, [currentDocument, addToHistory, scheduleAutosave, createSnapshot]);
  // Generate suggestions for sentences
  const generateSuggestions = useCallback(async () => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Show saving indicator
    setIsSaving(true);
    try {
      // Process each sentence and generate suggestions via API
      const updatedSentences = [...currentDocument.sentences];
      for (let i = 0; i < updatedSentences.length; i++) {
        const sentence = updatedSentences[i];
        try {
          // Call our server-side API instead of using placeholder
          const suggestion = await generateSuggestion(sentence.text);
          // Update the sentence with the new suggestion
          updatedSentences[i] = {
            ...sentence,
            suggestion: suggestion
          };
        } catch (error) {
          console.error(`Error generating suggestion for sentence ${i}:`, error);
          // If API call fails, fall back to the placeholder suggestion
          updatedSentences[i] = {
            ...sentence,
            suggestion: generatePlaceholderSuggestion(sentence.text)
          };
        }
      }
      const updatedDocument = {
        ...currentDocument,
        sentences: updatedSentences,
        lastModified: new Date()
      };
      setCurrentDocument(updatedDocument);
      scheduleAutosave();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fall back to placeholder suggestions if the overall process fails
      const fallbackSentences = currentDocument.sentences.map(sentence => ({
        ...sentence,
        suggestion: generatePlaceholderSuggestion(sentence.text)
      }));
      const fallbackDocument = {
        ...currentDocument,
        sentences: fallbackSentences,
        lastModified: new Date()
      };
      setCurrentDocument(fallbackDocument);
      scheduleAutosave();
    } finally {
      setIsSaving(false);
    }
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Regenerate a suggestion for a single sentence
  const regenerateSingleSuggestion = useCallback(async (sentenceId: string) => {
    if (!currentDocument) return;
    // Find the sentence by ID
    const sentenceIndex = currentDocument.sentences.findIndex(s => s.id === sentenceId);
    if (sentenceIndex === -1) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Show saving indicator for this specific operation
    setIsSaving(true);
    try {
      const updatedSentences = [...currentDocument.sentences];
      const sentence = updatedSentences[sentenceIndex];
      try {
        // Call our secure server-side API to generate a new suggestion
        const suggestion = await generateSuggestion(sentence.text);
        // Update only this specific sentence
        updatedSentences[sentenceIndex] = {
          ...sentence,
          suggestion: suggestion
        };
        const updatedDocument = {
          ...currentDocument,
          sentences: updatedSentences,
          lastModified: new Date()
        };
        setCurrentDocument(updatedDocument);
        scheduleAutosave();
      } catch (error) {
        console.error(`Error regenerating suggestion for sentence: ${sentenceId}`, error);
        // If API call fails, fall back to the placeholder suggestion
        updatedSentences[sentenceIndex] = {
          ...sentence,
          suggestion: generatePlaceholderSuggestion(sentence.text)
        };
        const fallbackDocument = {
          ...currentDocument,
          sentences: updatedSentences,
          lastModified: new Date()
        };
        setCurrentDocument(fallbackDocument);
        scheduleAutosave();
      }
    } catch (error) {
      console.error('Error during single suggestion regeneration:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Undo the last action
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setCurrentDocument(JSON.parse(JSON.stringify(previousState.document)));
      setHistoryIndex(historyIndex - 1);
      scheduleAutosave();
    }
  }, [historyIndex, history, scheduleAutosave]);
  // Redo the last undone action
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setCurrentDocument(JSON.parse(JSON.stringify(nextState.document)));
      setHistoryIndex(historyIndex + 1);
      scheduleAutosave();
    }
  }, [historyIndex, history, scheduleAutosave]);
  // Save a version of the document
  const saveVersion = useCallback((comment?: string) => {
    if (!currentDocument) return;
    // Create a snapshot with the current state
    const updatedDocument = createSnapshot(currentDocument, 'user', comment);
    // Update the current document
    setCurrentDocument(updatedDocument);
    // Update in documents array too
    setDocuments(docs => docs.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc));
    // Simulate saving to cloud storage
    simulateCloudSave(updatedDocument);
    console.log(`Saved version ${updatedDocument.version} of document "${updatedDocument.name}"`);
  }, [currentDocument, createSnapshot, simulateCloudSave]);
  // Helper function to generate more realistic placeholder suggestions
  const generatePlaceholderSuggestion = (text: string): string => {
    // This is just a simple example - in a real app, this would be an LLM call
    const variations = [
    // Passive to active voice
    {
      pattern: /was (.*) by/,
      replacement: '$1'
    },
    // Add transition words
    {
      pattern: /^/,
      replacement: (match, offset) => offset === 0 ? 'Importantly, ' : match
    },
    // Make more concise
    {
      pattern: /in order to/,
      replacement: 'to'
    },
    // Add emphasis
    {
      pattern: /good/,
      replacement: 'excellent'
    },
    // Improve clarity
    {
      pattern: /the (.*) that/,
      replacement: 'the $1 which'
    }];
    // Apply a random variation or just return a slightly modified version
    const randomIndex = Math.floor(Math.random() * (variations.length + 1));
    if (randomIndex < variations.length) {
      const {
        pattern,
        replacement
      } = variations[randomIndex];
      return text.replace(pattern, replacement as string);
    } else {
      // Return slightly reworded version
      const words = text.split(' ');
      if (words.length > 3) {
        const randomWord = words[Math.floor(Math.random() * words.length)];
        return text.replace(randomWord, randomWord + ' really');
      }
      return 'Improved: ' + text;
    }
  };
  // Accept all suggestions at once
  const acceptAllSuggestions = useCallback(() => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    const updatedSentences = currentDocument.sentences.map(sentence => ({
      ...sentence,
      text: sentence.suggestion,
      status: 'accepted' as const
    }));
    const updatedDocument = {
      ...currentDocument,
      sentences: updatedSentences,
      lastModified: new Date()
    };
    // Create an automatic snapshot for accepting all suggestions
    const documentWithSnapshot = createSnapshot(updatedDocument, 'auto', 'Accepted all suggestions');
    setCurrentDocument(documentWithSnapshot);
    scheduleAutosave();
  }, [currentDocument, addToHistory, scheduleAutosave, createSnapshot]);
  // Run consistency check
  const runConsistencyCheck = useCallback(() => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // First, analyze the document for consistency issues
    const terms = new Map<string, number>();
    const datePatterns = new Set<string>();
    const phrases = new Map<string, number>();
    // Collect terms, dates, and phrases
    currentDocument.sentences.forEach(sentence => {
      // Find terminology (simple words with capital letters as a heuristic)
      const termMatches = sentence.text.match(/\b[A-Z][a-z]+\b/g) || [];
      termMatches.forEach(term => {
        terms.set(term, (terms.get(term) || 0) + 1);
      });
      // Find date references
      const dateMatches = sentence.text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{2,4}\b|\b\d{4}\b/g) || [];
      dateMatches.forEach(date => datePatterns.add(date));
      // Find repeated phrases (3+ words)
      const words = sentence.text.split(/\s+/);
      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    });
    // Identify inconsistencies and generate suggestions
    const updatedSentences = currentDocument.sentences.map(sentence => {
      let suggestion = sentence.text;
      let hasChange = false;
      // Check for terminology inconsistencies
      const termMatches = sentence.text.match(/\b[A-Z][a-z]+\b/g) || [];
      for (const term of termMatches) {
        // Find similar terms that might be inconsistent
        for (const [otherTerm, count] of terms.entries()) {
          if (term !== otherTerm && term.toLowerCase() === otherTerm.toLowerCase() && count > terms.get(term)!) {
            suggestion = suggestion.replace(new RegExp(`\\b${term}\\b`, 'g'), otherTerm);
            hasChange = true;
          }
        }
      }
      // Check for date format inconsistencies
      const dateMatches = sentence.text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{2,4}\b|\b\d{4}\b/g) || [];
      if (dateMatches.length > 0) {
        // If we have different date formats, standardize them
        if (datePatterns.size > 1) {
          suggestion += ' (Consider standardizing date formats throughout the document)';
          hasChange = true;
        }
      }
      // Check for repeated phrases
      const words = sentence.text.split(/\s+/);
      for (let i = 0; i <= words.length - 3; i++) {
        const phrase = words.slice(i, i + 3).join(' ').toLowerCase();
        if (phrases.get(phrase)! > 1) {
          suggestion += ' (Consider varying repeated phrases for better readability)';
          hasChange = true;
          break;
        }
      }
      // If no inconsistencies found, return original
      return {
        ...sentence,
        suggestion: hasChange ? suggestion : sentence.suggestion
      };
    });
    const updatedDocument = {
      ...currentDocument,
      sentences: updatedSentences,
      lastModified: new Date()
    };
    setCurrentDocument(updatedDocument);
    scheduleAutosave();
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Run fact check
  const runFactCheck = useCallback(async () => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Show saving indicator
    setIsSaving(true);
    try {
      const updatedSentences = [...currentDocument.sentences];
      // Process each sentence through the AI for fact checking
      for (let i = 0; i < updatedSentences.length; i++) {
        const sentence = updatedSentences[i];
        try {
          // Use our secure server-side API to perform fact checking
          const systemPrompt = "You are a fact-checking assistant. Analyze the provided sentence for factual claims. If you find a claim that might need verification, add '(Consider verifying: [specific claim])' at the end. If you find vague claims that need citation, add '(Consider adding specific citation for this claim)'. If the sentence contains no factual claims or all claims appear reasonable, return the original sentence unchanged.";
          const suggestion = await generateSuggestion(sentence.text, systemPrompt);
          // Only update if the AI actually suggested a change
          updatedSentences[i] = {
            ...sentence,
            suggestion: suggestion !== sentence.text ? suggestion : sentence.suggestion
          };
        } catch (error) {
          console.error(`Error fact checking sentence ${i}:`, error);
          // If API call fails, keep the existing suggestion
          // No change needed here as we're keeping the original object
        }
      }
      const updatedDocument = {
        ...currentDocument,
        sentences: updatedSentences,
        lastModified: new Date()
      };
      setCurrentDocument(updatedDocument);
      scheduleAutosave();
    } catch (error) {
      console.error('Error during fact check:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Run style check
  const runStyleCheck = useCallback(async (style: string = 'professional') => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Show saving indicator
    setIsSaving(true);
    try {
      const updatedSentences = [...currentDocument.sentences];
      // Process each sentence through the AI for style checking
      for (let i = 0; i < updatedSentences.length; i++) {
        const sentence = updatedSentences[i];
        try {
          // Use our secure server-side API to perform style checking
          let systemPrompt = 'You are a writing assistant. Rewrite the provided sentence to improve it.';
          // Customize the system prompt based on the selected style
          if (style === 'professional') {
            systemPrompt = 'You are a professional writing assistant. Rewrite the provided sentence to make it more formal, clear, and business-appropriate. Use precise terminology, avoid contractions, remove filler words, and ensure the tone is authoritative yet respectful. Only respond with the improved sentence, no explanations.';
          } else if (style === 'academic') {
            systemPrompt = 'You are an academic writing assistant. Rewrite the provided sentence to make it suitable for scholarly publications. Use passive voice where appropriate, employ scholarly terminology, maintain a formal tone, and ensure precise language. Only respond with the improved sentence, no explanations.';
          } else if (style === 'casual') {
            systemPrompt = 'You are a casual writing assistant. Rewrite the provided sentence to make it more conversational and approachable. Use simpler terminology, contractions, and a friendly tone. Keep sentences shorter and more direct. Only respond with the improved sentence, no explanations.';
          }
          const suggestion = await generateSuggestion(sentence.text, systemPrompt);
          // Only update if the AI actually suggested a change
          updatedSentences[i] = {
            ...sentence,
            suggestion: suggestion !== sentence.text ? suggestion : sentence.suggestion
          };
        } catch (error) {
          console.error(`Error style checking sentence ${i}:`, error);
          // If API call fails, keep the existing suggestion
        }
      }
      const updatedDocument = {
        ...currentDocument,
        sentences: updatedSentences,
        lastModified: new Date()
      };
      setCurrentDocument(updatedDocument);
      scheduleAutosave();
    } catch (error) {
      console.error('Error during style check:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentDocument, addToHistory, scheduleAutosave]);
  // Split and align sentences
  const splitAndAlignSentences = useCallback(() => {
    if (!currentDocument) return;
    // Add current state to history before making changes
    addToHistory(currentDocument);
    // Get all text from the document
    const fullText = currentDocument.sentences.map(s => s.text).join(' ');
    // Re-split into sentences
    const newSentences = splitIntoSentences(fullText);
    // Generate suggestions for each new sentence
    const sentencesWithSuggestions = newSentences.map(sentence => ({
      ...sentence,
      suggestion: generatePlaceholderSuggestion(sentence.text)
    }));
    const updatedDocument = {
      ...currentDocument,
      sentences: sentencesWithSuggestions,
      lastModified: new Date()
    };
    // Create an automatic snapshot for split and align operation
    const documentWithSnapshot = createSnapshot(updatedDocument, 'auto', 'Split and aligned sentences');
    setCurrentDocument(documentWithSnapshot);
    scheduleAutosave();
  }, [currentDocument, addToHistory, scheduleAutosave, createSnapshot]);
  // Upload a document
  const uploadDocument = useCallback(async (file: File) => {
    try {
      // Validate file format
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const supportedFormats = ['docx', 'doc', 'pdf', 'txt'];
      if (!supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: .${fileExtension}. Please upload .docx, .doc, .pdf, or .txt files.`);
      }
      // Show saving indicator during parsing
      setIsSaving(true);
      // Parse the document using our sequential approach
      const parseResult = await parseDocument(file, {
        enableOcr: true,
        maxPages: 50,
        timeoutMs: 30000
      });
      if (!parseResult.text || parseResult.text.trim() === '') {
        throw new Error(`Could not extract any text from the document. The file may be corrupted, password-protected, or contain only images without OCR processing.`);
      }
      // Create a new document from the extracted text
      const name = file.name.split('.')[0]; // Use filename without extension
      const now = new Date();
      const sentences = splitIntoSentences(parseResult.text);
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        name,
        sentences,
        lastModified: now,
        createdAt: now,
        lastSaved: now,
        version: 1,
        originalFormat: fileExtension,
        fileSize: file.size,
        extractionQuality: parseResult.score,
        extractionSource: parseResult.source,
        versionHistory: [{
          versionId: `v1-${Date.now()}`,
          versionNumber: 1,
          sentences: JSON.parse(JSON.stringify(sentences)),
          timestamp: now,
          createdBy: 'user',
          comment: `Initial upload (Extraction quality: ${getQualityDescription(parseResult.score)})`
        }]
      };
      setDocuments(docs => [...docs, newDoc]);
      setCurrentDocument(newDoc);
      // Reset history when creating a new document
      setHistory([{
        document: JSON.parse(JSON.stringify(newDoc)),
        timestamp: now
      }]);
      setHistoryIndex(0);
      // Simulate saving to cloud storage
      simulateCloudSave(newDoc);
      // Generate suggestions for the new document
      setTimeout(() => {
        generateSuggestions();
      }, 300);
      return {
        success: true,
        quality: parseResult.score,
        source: parseResult.source
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      setIsSaving(false);
      throw error;
    }
  }, [generateSuggestions, simulateCloudSave]);
  // Download a document
  const downloadDocument = useCallback((docId: string, format: ExportFormat, type: ExportType) => {
    try {
      console.log(`Starting download process for document ID: ${docId}, format: ${format}, type: ${type}`);
      const document = documents.find(doc => doc.id === docId);
      if (!document) {
        console.error('Download failed: Document not found');
        alert('Download failed: Document not found');
        return;
      }
      // Prepare content based on type (original or edited)
      let content = '';
      if (type === 'original') {
        content = document.sentences.map(s => s.text).join(' ');
      } else {
        content = document.sentences.map(s => {
          if (s.status === 'accepted') {
            return s.suggestion;
          }
          return s.text;
        }).join(' ');
      }
      // Format the content based on requested format
      let formattedContent = content;
      let mimeType = 'text/plain';
      let extension = 'txt';
      if (format === 'md') {
        formattedContent = `# ${document.name}\n\n${content}`;
        mimeType = 'text/markdown';
        extension = 'md';
      } else if (format === 'docx') {
        // For DOCX, we'll use a generic binary data type
        mimeType = 'application/octet-stream';
        extension = 'docx';
      }
      console.log(`Creating blob with MIME type: ${mimeType}`);
      const blob = new Blob([formattedContent], {
        type: mimeType
      });
      // Use a simpler and more reliable download method
      const filename = `${document.name}.${extension}`;
      try {
        // Create URL and download link
        const url = window.URL.createObjectURL(blob);
        const downloadLink = window.document.createElement('a');
        // Configure the download link
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        // Add to DOM, trigger click, and clean up
        window.document.body.appendChild(downloadLink);
        console.log('Download link created and appended to document');
        downloadLink.click();
        console.log('Download click triggered');
        // Clean up
        window.setTimeout(() => {
          window.document.body.removeChild(downloadLink);
          window.URL.revokeObjectURL(url);
          console.log('Download resources cleaned up');
        }, 1000);
      } catch (err) {
        console.error('Error during download link creation:', err);
        alert(`Download failed: ${err instanceof Error ? err.message : 'Error creating download link'}`);
      }
    } catch (error) {
      console.error('Download failed with error:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [documents]);
  // Rename a document
  const renameDocument = useCallback((docId: string, newName: string) => {
    if (!newName.trim()) return;
    const now = new Date();
    setDocuments(docs => docs.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          name: newName,
          lastModified: now
        };
      }
      return doc;
    }));
    if (currentDocument && currentDocument.id === docId) {
      const updatedDoc = {
        ...currentDocument,
        name: newName,
        lastModified: now
      };
      setCurrentDocument(updatedDoc);
      simulateCloudSave(updatedDoc);
    } else {
      // If the document being renamed is not the current one, still save it
      const docToSave = documents.find(doc => doc.id === docId);
      if (docToSave) {
        const updatedDoc = {
          ...docToSave,
          name: newName,
          lastModified: now
        };
        simulateCloudSave(updatedDoc);
      }
    }
  }, [currentDocument, documents, simulateCloudSave]);
  // Duplicate a document
  const duplicateDocument = useCallback((docId: string) => {
    const document = documents.find(doc => doc.id === docId);
    if (!document) return;
    const now = new Date();
    const newDoc: Document = {
      ...JSON.parse(JSON.stringify(document)),
      id: `doc-${Date.now()}`,
      name: `${document.name} (Copy)`,
      lastModified: now,
      createdAt: now,
      lastSaved: now,
      version: 1,
      versionHistory: document.versionHistory ? [{
        versionId: `v1-${Date.now()}`,
        versionNumber: 1,
        sentences: JSON.parse(JSON.stringify(document.sentences)),
        timestamp: now,
        createdBy: 'user',
        comment: 'Duplicated from ' + document.name
      }] : []
    };
    setDocuments(docs => [...docs, newDoc]);
    simulateCloudSave(newDoc);
  }, [documents, simulateCloudSave]);
  // Get document versions
  const getDocumentVersions = useCallback((docId: string): DocumentVersion[] => {
    const document = documents.find(doc => doc.id === docId);
    if (!document) return [];
    return document.versionHistory || [];
  }, [documents]);
  // Rollback to a specific version
  const rollbackToVersion = useCallback((docId: string, versionId: string) => {
    const document = documents.find(doc => doc.id === docId);
    if (!document || !document.versionHistory) return;
    const version = document.versionHistory.find(v => v.versionId === versionId);
    if (!version) return;
    // Create a new version that's a rollback to the selected version
    const now = new Date();
    const rollbackVersion: DocumentVersion = {
      versionId: `v${document.version || 1}-${Date.now()}`,
      versionNumber: (document.version || 0) + 1,
      sentences: JSON.parse(JSON.stringify(version.sentences)),
      timestamp: now,
      createdBy: 'user',
      comment: `Rollback to version ${version.versionNumber}`
    };
    const updatedVersionHistory = [...(document.versionHistory || []), rollbackVersion];
    const updatedDocument = {
      ...document,
      sentences: JSON.parse(JSON.stringify(version.sentences)),
      version: (document.version || 0) + 1,
      versionHistory: updatedVersionHistory,
      lastModified: now
    };
    // Update documents array
    setDocuments(docs => docs.map(doc => doc.id === docId ? updatedDocument : doc));
    // Update current document if it's the one being rolled back
    if (currentDocument && currentDocument.id === docId) {
      setCurrentDocument(updatedDocument);
    }
    // Simulate saving to cloud storage
    simulateCloudSave(updatedDocument);
    console.log(`Rolled back document "${updatedDocument.name}" to version ${version.versionNumber}`);
  }, [documents, currentDocument, simulateCloudSave]);
  const value = {
    currentDocument,
    documents,
    setCurrentDocument,
    updateSentence,
    acceptSuggestion,
    rejectSuggestion,
    createNewDocument,
    generateSuggestions,
    regenerateSingleSuggestion,
    updateMultipleSentences,
    undo,
    redo,
    canUndo,
    canRedo,
    saveVersion,
    deleteDocument,
    acceptAllSuggestions,
    runConsistencyCheck,
    runFactCheck,
    runStyleCheck,
    splitAndAlignSentences,
    uploadDocument,
    downloadDocument,
    renameDocument,
    duplicateDocument,
    getDocumentVersions,
    rollbackToVersion,
    isSaving,
    lastSaved
  };
  return <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>;
};
// Custom hook to use the document context
export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};