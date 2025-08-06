import React from 'react';
import { Link } from 'react-router-dom';
import { FileTextIcon, UploadIcon, BrainIcon, HistoryIcon, SplitIcon, EditIcon, CheckCircleIcon, ArrowRightIcon } from 'lucide-react';
const HomePage = () => {
  return <div className="w-full bg-gray-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Track, align, and elevate every sentence with AI
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience unprecedented control with our Sentence-Level dual-panel
            AI editor that gives you complete oversight of document editing.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link to="/editor" className="px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-md hover:bg-blue-700 transition shadow-md flex items-center justify-center">
              Start Editing Now
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Link>
            <Link to="/files" className="px-6 py-3 bg-white text-blue-600 border border-blue-600 text-lg font-medium rounded-md hover:bg-blue-50 transition shadow-sm flex items-center justify-center">
              Browse Documents
            </Link>
          </div>
          {/* Visual representation of the dual-panel interface */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-blue-800">Your Document</h3>
                </div>
                <div className="space-y-2">
                  <p className="bg-white p-2 rounded border border-blue-200 text-left text-sm">
                    The company was founded in 2010.
                  </p>
                  <p className="bg-green-50 p-2 rounded border border-green-200 text-left text-sm">
                    Revenue has increased by 25% year over year.
                  </p>
                  <p className="bg-white p-2 rounded border border-blue-200 text-left text-sm">
                    Our team consists of 150 employees worldwide.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800">AI Suggestions</h3>
                </div>
                <div className="space-y-2">
                  <p className="bg-white p-2 rounded border border-gray-200 text-left text-sm">
                    The company was established in 2010.
                  </p>
                  <p className="bg-white p-2 rounded border border-gray-200 text-left text-sm">
                    Year-over-year revenue has grown by 25%.
                  </p>
                  <p className="bg-white p-2 rounded border border-gray-200 text-left text-sm">
                    Our global workforce comprises 150 dedicated employees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Key Features Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Full Control Over Your Document's Evolution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <BrainIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">
                  Intelligent Sentence-Level Revision
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Review and approve AI-suggested changes with granular
                sentence-by-sentence control. Accept, reject, or manually edit
                each suggestion.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Full control over every sentence</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>LLM-powered intelligent suggestions</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <SplitIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">
                  Two-Panel Visual Alignment
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Side-by-side comparison makes it easy to track changes and
                interact directly with AI-generated alternatives.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Visual change tracking</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Direct interaction with suggestions</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <EditIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">
                  Bulk or Precision Editing
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Work how you want - paste entire documents or edit individual
                sentences while maintaining perfect sentence mapping.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Multi-sentence selection and editing</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Preserves sentence relationships</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <UploadIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">
                  Document Lifecycle Control
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Manage your documents with ease - upload, version, rename, and
                download files while maintaining document structure.
              </p>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Upload and download with structure retention</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Version control and document history</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <CheckCircleIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold">
                  Tool-Enhanced Smart Editing
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Leverage powerful AI tools to enhance your editing process with
                automated checks and suggestions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Consistency Check
                  </h4>
                  <p className="text-sm text-gray-600">
                    Ensure terminology, tone, and style remain consistent
                    throughout your document
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">Fact Check</h4>
                  <p className="text-sm text-gray-600">
                    Verify factual information and get suggestions for
                    corrections or clarifications
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Style Check
                  </h4>
                  <p className="text-sm text-gray-600">
                    Refine your writing style with suggestions for clarity,
                    conciseness, and impact
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Call to Action */}
        <div className="max-w-4xl mx-auto text-center bg-blue-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Transform Your Document Editing Experience Today
          </h2>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl mx-auto">
            Join thousands of professionals who have revolutionized their
            writing and editing workflow with our AI-powered document editor.
          </p>
          <Link to="/editor" className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-medium rounded-md hover:bg-blue-50 transition shadow-md">
            Start Editing Now
          </Link>
        </div>
      </div>
    </div>;
};
export default HomePage;