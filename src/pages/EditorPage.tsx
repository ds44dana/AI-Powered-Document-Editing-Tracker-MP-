import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDocument } from '../context/DocumentContext';
import { PlusIcon, RefreshCwIcon, CheckIcon, XIcon, PenIcon, RotateCwIcon, CheckCircleIcon, UndoIcon, RedoIcon, SaveIcon, CloudIcon, ClockIcon } from 'lucide-react';
import EditorToolbar from '../components/EditorToolbar';
import { getQualityDescription } from '../utils/documentParsing';
const EditorPage = () => {
  const {
    currentDocument,
    createNewDocument,
    updateSentence,
    acceptSuggestion,
    rejectSuggestion,
    generateSuggestions,
    regenerateSingleSuggestion,
    updateMultipleSentences,
    undo,
    redo,
    canUndo,
    canRedo,
    saveVersion,
    acceptAllSuggestions,
    isSaving,
    lastSaved
  } = useDocument();
  const [newDocName, setNewDocName] = useState('');
  const [rawText, setRawText] = useState('');
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);
  const [isEditingMultiple, setIsEditingMultiple] = useState(false);
  const [multiEditText, setMultiEditText] = useState('');
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [versionComment, setVersionComment] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const multiEditInputRef = useRef<HTMLTextAreaElement>(null);
  // Focus on edit input when editing a sentence
  useEffect(() => {
    if (editingSentenceId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSentenceId]);
  // Focus on multi-edit input when editing multiple sentences
  useEffect(() => {
    if (isEditingMultiple && multiEditInputRef.current) {
      multiEditInputRef.current.focus();
    }
  }, [isEditingMultiple]);
  // Handle keyboard shortcuts for undo/redo
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if Ctrl/Cmd key is pressed
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
        if (canRedo) redo();
      } else {
        // Ctrl+Z or Cmd+Z for Undo
        if (canUndo) undo();
      }
    } else if (isCtrlOrCmd && e.key === 's') {
      // Ctrl+S or Cmd+S for Save Version
      e.preventDefault();
      setShowSaveVersionModal(true);
    }
  }, [undo, redo, canUndo, canRedo]);
  // Add event listener for keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  // Create a new document from raw text
  const handleCreateFromText = () => {
    if (!newDocName.trim() || !rawText.trim()) return;
    // Create a new document
    createNewDocument(newDocName, rawText);
    // Clear the inputs
    setNewDocName('');
    setRawText('');
  };
  // Start editing a sentence
  const handleStartEditing = (sentenceId: string, text: string) => {
    setEditingSentenceId(sentenceId);
    setEditText(text);
  };
  // Save edited sentence
  const handleSaveEdit = () => {
    if (editingSentenceId) {
      updateSentence(editingSentenceId, editText, 'edited');
      setEditingSentenceId(null);
      setEditText('');
    }
  };
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingSentenceId(null);
    setEditText('');
  };
  // Start editing multiple sentences
  const handleStartMultiEdit = () => {
    if (!currentDocument) return;
    // Combine all sentences into a single text
    const combinedText = currentDocument.sentences.map(sentence => sentence.text).join(' ');
    setMultiEditText(combinedText);
    setIsEditingMultiple(true);
  };
  // Save multiple edited sentences
  const handleSaveMultiEdit = () => {
    updateMultipleSentences(multiEditText);
    setIsEditingMultiple(false);
    setMultiEditText('');
  };
  // Cancel multiple editing
  const handleCancelMultiEdit = () => {
    setIsEditingMultiple(false);
    setMultiEditText('');
  };
  // Regenerate a specific sentence suggestion
  const handleRegenerateSentence = (sentenceId: string) => {
    console.log(`Regenerating suggestion for sentence ${sentenceId}`);
    // Call our new function to regenerate just this specific sentence
    regenerateSingleSuggestion(sentenceId);
  };
  // Handle save version
  const handleSaveVersion = () => {
    saveVersion(versionComment);
    setShowSaveVersionModal(false);
    setVersionComment('');
  };
  // Get sentence color based on status
  const getSentenceColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      case 'edited':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white border-gray-200';
    }
  };
  // Get highlight color for hover effect
  const getHighlightColor = (sentenceId: string, status: string) => {
    if (hoveredSentenceId === sentenceId) {
      return 'bg-blue-100 border-blue-300';
    }
    return getSentenceColor(status);
  };
  // Format the last saved time
  const formatLastSaved = (date: Date | null | undefined) => {
    if (!date) return 'Not saved yet';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return date.toLocaleString();
  };
  if (!currentDocument) {
    return <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Create New Document
          </h2>
          <div className="mb-4">
            <label htmlFor="docName" className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input id="docName" type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter document name" />
          </div>
          <div className="mb-6">
            <label htmlFor="rawText" className="block text-sm font-medium text-gray-700 mb-1">
              Paste Your Text
            </label>
            <textarea id="rawText" value={rawText} onChange={e => setRawText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]" placeholder="Paste your document text here..." />
          </div>
          <button onClick={handleCreateFromText} disabled={!newDocName.trim() || !rawText.trim()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Document
          </button>
        </div>
      </div>;
  }
  return <div className="container mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          {currentDocument.name}
          {currentDocument.version && <span className="text-sm text-gray-500 ml-2">
              v{currentDocument.version}
            </span>}
        </h1>
        <div className="flex items-center text-sm text-gray-500">
          <span className="mr-4">
            Last modified: {currentDocument.lastModified.toLocaleString()}
          </span>
          <div className="flex items-center">
            {isSaving ? <div className="flex items-center text-blue-600">
                <CloudIcon className="h-4 w-4 mr-1 animate-pulse" />
                <span>Saving...</span>
              </div> : <div className="flex items-center text-green-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>Saved {formatLastSaved(currentDocument.lastSaved)}</span>
              </div>}
          </div>
          {currentDocument.extractionQuality !== undefined && <div className="ml-4 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${currentDocument.extractionQuality >= 0.75 ? 'bg-green-500' : currentDocument.extractionQuality >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span>
                Extraction quality:{' '}
                {getQualityDescription(currentDocument.extractionQuality)}
              </span>
            </div>}
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <button onClick={undo} disabled={!canUndo} className={`p-2 rounded ${canUndo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'}`} title="Undo (Ctrl+Z)">
          <UndoIcon className="h-5 w-5" />
        </button>
        <button onClick={redo} disabled={!canRedo} className={`p-2 rounded ${canRedo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'}`} title="Redo (Ctrl+Shift+Z)">
          <RedoIcon className="h-5 w-5" />
        </button>
        <button onClick={() => setShowSaveVersionModal(true)} className="p-2 rounded text-green-600 hover:bg-green-50" title="Save Version (Ctrl+S)">
          <SaveIcon className="h-5 w-5" />
        </button>
        <div className="flex-1"></div>
        <EditorToolbar onGenerateSuggestions={generateSuggestions} />
      </div>

      {/* Save Version Modal */}
      {showSaveVersionModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Save Document Version
            </h3>
            <p className="text-gray-600 mb-4">
              Create a snapshot of your document that you can return to later.
            </p>
            <div className="mb-4">
              <label htmlFor="versionComment" className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <input id="versionComment" type="text" value={versionComment} onChange={e => setVersionComment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 'After client feedback'" />
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSaveVersionModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleSaveVersion} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Save Version
              </button>
            </div>
          </div>
        </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Left Panel - Your Document */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-800">Your Document</h2>
            <div className="flex space-x-2">
              <button onClick={handleStartMultiEdit} className="p-1 text-gray-500 hover:text-gray-700" title="Edit entire document">
                <PenIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="prose max-w-none">
            {isEditingMultiple ? <div className="border-2 border-blue-400 rounded p-2">
                <textarea ref={multiEditInputRef} value={multiEditText} onChange={e => setMultiEditText(e.target.value)} className="w-full p-2 focus:outline-none resize-y min-h-[400px]" placeholder="Edit your document here..." />
                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={handleCancelMultiEdit} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    Cancel
                  </button>
                  <button onClick={handleSaveMultiEdit} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </div> : currentDocument.sentences.length === 0 ? <p className="text-gray-500 italic">
                No content yet. Add text or generate suggestions.
              </p> : <div className="space-y-2">
                {currentDocument.sentences.map(sentence => <div key={sentence.id}>
                    {editingSentenceId === sentence.id ? <div className="border-2 border-blue-400 rounded p-1">
                        <textarea ref={editInputRef} value={editText} onChange={e => setEditText(e.target.value)} className="w-full p-1 focus:outline-none resize-y min-h-[60px]" />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button onClick={handleCancelEdit} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                            Cancel
                          </button>
                          <button onClick={handleSaveEdit} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                            Save
                          </button>
                        </div>
                      </div> : <div className={`relative p-2 border rounded transition-colors duration-150 ${getHighlightColor(sentence.id, sentence.status)}`} onMouseEnter={() => setHoveredSentenceId(sentence.id)} onMouseLeave={() => setHoveredSentenceId(null)}>
                        <p className="text-gray-800">{sentence.text}</p>
                        {/* Interactive actions that appear on hover */}
                        <div className={`absolute top-1 right-1 transition-opacity duration-150 ${hoveredSentenceId === sentence.id ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="flex bg-white border border-gray-200 rounded shadow-sm">
                            <button onClick={() => acceptSuggestion(sentence.id)} className="p-1 text-green-600 hover:bg-green-50" title="Accept suggestion">
                              <CheckIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => rejectSuggestion(sentence.id)} className="p-1 text-red-600 hover:bg-red-50" title="Reject suggestion">
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleRegenerateSentence(sentence.id)} className="p-1 text-blue-600 hover:bg-blue-50" title="Re-edit with LLM">
                              <RotateCwIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleStartEditing(sentence.id, sentence.text)} className="p-1 text-gray-600 hover:bg-gray-50" title="Manual edit">
                              <PenIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>}
                  </div>)}
              </div>}
          </div>
        </div>

        {/* Right Panel - Suggested Changes */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 min-h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-800">
              Suggested Changes
            </h2>
            <div className="flex space-x-2">
              <button onClick={generateSuggestions} className="flex items-center px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition" title="Generate new suggestions for all sentences">
                <RefreshCwIcon className="h-3 w-3 mr-1" />
                Regenerate
              </button>
              <button onClick={acceptAllSuggestions} className="flex items-center px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition" title="Apply all suggested changes at once">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Accept All
              </button>
            </div>
          </div>
          <div className="prose max-w-none">
            {isEditingMultiple ? <div className="bg-gray-50 border border-gray-200 rounded p-4 min-h-[400px] flex items-center justify-center">
                <p className="text-gray-500 italic">
                  Editing document... Suggestions will appear when you save your
                  changes.
                </p>
              </div> : currentDocument.sentences.length === 0 ? <p className="text-gray-500 italic">
                No suggestions yet. Generate suggestions first.
              </p> : <div className="space-y-2">
                {currentDocument.sentences.map(sentence => <div key={sentence.id} className={`relative p-2 border rounded transition-colors duration-150 ${hoveredSentenceId === sentence.id ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200'}`} onMouseEnter={() => setHoveredSentenceId(sentence.id)} onMouseLeave={() => setHoveredSentenceId(null)}>
                    <p className="text-gray-800">{sentence.suggestion}</p>
                    {/* Action buttons */}
                    <div className={`absolute top-1 right-1 transition-opacity duration-150 ${hoveredSentenceId === sentence.id ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="flex bg-white border border-gray-200 rounded shadow-sm">
                        <button onClick={() => acceptSuggestion(sentence.id)} className="p-1 text-green-600 hover:bg-green-50" title="Accept suggestion">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => rejectSuggestion(sentence.id)} className="p-1 text-red-600 hover:bg-red-50" title="Reject suggestion">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>
        </div>
      </div>
    </div>;
};
export default EditorPage;