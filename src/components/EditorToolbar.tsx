import React, { useState } from 'react';
import { RefreshCwIcon, CheckCircleIcon, BookOpenIcon, PaletteIcon, DownloadIcon, SaveIcon, SplitIcon } from 'lucide-react';
import { useDocument } from '../context/DocumentContext';
import { useNavigate } from 'react-router-dom';
interface EditorToolbarProps {
  onGenerateSuggestions: () => void;
}
const EditorToolbar = ({
  onGenerateSuggestions
}: EditorToolbarProps) => {
  const {
    runConsistencyCheck,
    runFactCheck,
    runStyleCheck,
    saveVersion,
    splitAndAlignSentences,
    currentDocument,
    downloadDocument
  } = useDocument();
  const navigate = useNavigate();
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const showTooltip = (id: string) => setTooltipVisible(id);
  const hideTooltip = () => setTooltipVisible(null);
  const handleDownload = (format: 'docx' | 'txt' | 'md', type: 'original' | 'edited') => {
    if (currentDocument) {
      downloadDocument(currentDocument.id, format, type);
      setDownloadMenuOpen(false);
    }
  };
  return <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-4">
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex space-x-2">
          <div className="relative">
            <button onClick={onGenerateSuggestions} onMouseEnter={() => showTooltip('generate')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">
              <RefreshCwIcon className="h-4 w-4 mr-1.5" />
              Generate Suggestions
            </button>
            {tooltipVisible === 'generate' && <div className="absolute z-10 w-60 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Generate AI-powered suggestions for your entire document
              </div>}
          </div>
          <div className="relative">
            <button onClick={runConsistencyCheck} onMouseEnter={() => showTooltip('consistency')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <CheckCircleIcon className="h-4 w-4 mr-1.5" />
              Consistency Check
            </button>
            {tooltipVisible === 'consistency' && <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Detects inconsistencies in terminology, date formats, and
                repeated phrases
              </div>}
          </div>
          <div className="relative">
            <button onClick={runFactCheck} onMouseEnter={() => showTooltip('fact')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <BookOpenIcon className="h-4 w-4 mr-1.5" />
              Fact Check
            </button>
            {tooltipVisible === 'fact' && <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Cross-verifies statements and suggests corrections for factual
                claims
              </div>}
          </div>
          <div className="relative">
            <button onClick={() => setStyleMenuOpen(!styleMenuOpen)} onMouseEnter={() => showTooltip('style')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <PaletteIcon className="h-4 w-4 mr-1.5" />
              Style Check
            </button>
            {tooltipVisible === 'style' && <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Evaluates tone, clarity, and coherence against a selected style
              </div>}
            {styleMenuOpen && <div className="absolute z-20 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button onClick={() => {
                runStyleCheck('professional');
                setStyleMenuOpen(false);
              }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Professional
                  </button>
                  <button onClick={() => {
                runStyleCheck('academic');
                setStyleMenuOpen(false);
              }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Academic
                  </button>
                  <button onClick={() => {
                runStyleCheck('casual');
                setStyleMenuOpen(false);
              }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Casual
                  </button>
                </div>
              </div>}
          </div>
          <div className="relative">
            <button onClick={splitAndAlignSentences} onMouseEnter={() => showTooltip('split')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <SplitIcon className="h-4 w-4 mr-1.5" />
              Split & Align
            </button>
            {tooltipVisible === 'split' && <div className="absolute z-10 w-64 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Reorganizes the document to ensure one-to-one sentence alignment
                for accurate comparisons
              </div>}
          </div>
        </div>
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <div className="relative">
            <button onClick={saveVersion} onMouseEnter={() => showTooltip('save')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <SaveIcon className="h-4 w-4 mr-1.5" />
              Save Version
            </button>
            {tooltipVisible === 'save' && <div className="absolute right-0 z-10 w-48 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Create a new version snapshot of your document
              </div>}
          </div>
          <div className="relative">
            <button onClick={() => setDownloadMenuOpen(!downloadMenuOpen)} onMouseEnter={() => showTooltip('download')} onMouseLeave={hideTooltip} className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
              <DownloadIcon className="h-4 w-4 mr-1.5" />
              Download
            </button>
            {tooltipVisible === 'download' && <div className="absolute right-0 z-10 w-48 px-3 py-2 mt-1 text-sm font-medium text-white bg-gray-900 rounded-md shadow-sm">
                Download your document in various formats
              </div>}
            {downloadMenuOpen && <div className="absolute right-0 z-20 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <button onClick={() => handleDownload('docx', 'edited')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Word Document (.docx)
                  </button>
                  <button onClick={() => handleDownload('txt', 'edited')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Plain Text (.txt)
                  </button>
                  <button onClick={() => handleDownload('md', 'edited')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Markdown (.md)
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => navigate('/files')} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                    More Export Options...
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </div>
    </div>;
};
export default EditorToolbar;