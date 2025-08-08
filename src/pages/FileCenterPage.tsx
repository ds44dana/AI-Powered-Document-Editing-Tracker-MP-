import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocument } from '../context/DocumentContext';
import { FileTextIcon, PlusIcon, TrashIcon, EditIcon, UploadIcon, DownloadIcon, CopyIcon, CheckIcon, XIcon, HistoryIcon, ClockIcon, CloudIcon, RotateCcwIcon } from 'lucide-react';
import { getQualityDescription } from '../utils/documentParsing';
const FileCenterPage = () => {
  const {
    documents,
    setCurrentDocument,
    createNewDocument,
    deleteDocument,
    uploadDocument,
    downloadDocument,
    renameDocument,
    duplicateDocument,
    getDocumentVersions,
    rollbackToVersion
  } = useDocument();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorDetails, setUploadErrorDetails] = useState<{
    code?: string;
    actionable?: boolean;
    suggestedAction?: string;
  } | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [viewingVersionsDocId, setViewingVersionsDocId] = useState<string | null>(null);
  const [confirmRollbackVersionId, setConfirmRollbackVersionId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean;
    progress: number;
    quality?: number;
    source?: string;
  }>({
    isUploading: false,
    progress: 0
  });
  const handleCreateNew = () => {
    const name = `New Document ${documents.length + 1}`;
    createNewDocument(name);
    navigate('/editor');
  };
  const handleOpenDocument = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setCurrentDocument(doc);
      navigate('/editor');
    }
  };
  const handleDeleteDocument = (docId: string) => {
    setDeletingDocId(docId);
  };
  const confirmDelete = () => {
    if (deletingDocId) {
      deleteDocument(deletingDocId);
      setDeletingDocId(null);
    }
  };
  const cancelDelete = () => {
    setDeletingDocId(null);
  };
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadError(null);
    setUploadErrorDetails(null);
    setUploadStatus({
      isUploading: true,
      progress: 10
    });
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadStatus(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 500);
      const result = await uploadDocument(file);
      clearInterval(progressInterval);
      setUploadStatus({
        isUploading: false,
        progress: 100,
        quality: result.quality,
        source: result.source
      });
      navigate('/editor');
    } catch (error) {
      const errorMessage = (error as Error).message;
      setUploadError(errorMessage);
      // Try to extract error code and actionable status
      if (errorMessage.includes('PDF is password-protected')) {
        setUploadErrorDetails({
          code: 'PDF_ENCRYPTED',
          actionable: true,
          suggestedAction: 'Upload an unprotected version of this document'
        });
      } else if (errorMessage.includes('no text layer')) {
        setUploadErrorDetails({
          code: 'PDF_NO_TEXT_LAYER',
          actionable: true,
          suggestedAction: 'Process with OCR'
        });
      } else if (errorMessage.includes('Unsupported file format')) {
        setUploadErrorDetails({
          code: 'UNSUPPORTED_FORMAT',
          actionable: true,
          suggestedAction: 'Upload a supported file format'
        });
      }
      setUploadStatus({
        isUploading: false,
        progress: 0
      });
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const handleStartRename = (docId: string, currentName: string) => {
    setRenamingDocId(docId);
    setNewDocName(currentName);
  };
  const handleSaveRename = () => {
    if (renamingDocId && newDocName.trim()) {
      renameDocument(renamingDocId, newDocName);
      setRenamingDocId(null);
      setNewDocName('');
    }
  };
  const handleCancelRename = () => {
    setRenamingDocId(null);
    setNewDocName('');
  };
  const handleDuplicate = (docId: string) => {
    duplicateDocument(docId);
  };
  const handleDownload = (docId: string) => {
    setDownloadingDocId(docId);
  };
  const handleDownloadFormat = (docId: string, format: 'docx' | 'txt' | 'md', type: 'original' | 'edited') => {
    downloadDocument(docId, format, type);
    setDownloadingDocId(null);
  };
  const handleViewVersions = (docId: string) => {
    setViewingVersionsDocId(docId);
  };
  const handleRollbackConfirm = (versionId: string) => {
    setConfirmRollbackVersionId(versionId);
  };
  const handleRollback = () => {
    if (viewingVersionsDocId && confirmRollbackVersionId) {
      rollbackToVersion(viewingVersionsDocId, confirmRollbackVersionId);
      setConfirmRollbackVersionId(null);
      setViewingVersionsDocId(null);
    }
  };
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };
  // Get document versions when viewing history
  const documentVersions = viewingVersionsDocId ? getDocumentVersions(viewingVersionsDocId) : [];
  // Get document name for the version history modal
  const versionHistoryDocName = viewingVersionsDocId ? documents.find(d => d.id === viewingVersionsDocId)?.name || 'Document' : '';
  return <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">File Center</h1>
        <div className="flex space-x-3">
          <button onClick={handleUploadClick} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload Document
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".docx,.doc,.pdf,.txt" className="hidden" />
          <button onClick={handleCreateNew} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Document
          </button>
        </div>
      </div>

      {uploadStatus.isUploading && <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <div className="flex items-center justify-between mb-1">
            <span>Processing document...</span>
            <span>{uploadStatus.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{
          width: `${uploadStatus.progress}%`
        }}></div>
          </div>
        </div>}

      {uploadError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{uploadError}</p>
              {uploadErrorDetails?.actionable && <p className="text-sm mt-1">
                  Suggestion: {uploadErrorDetails.suggestedAction}
                </p>}
            </div>
            <button onClick={() => {
          setUploadError(null);
          setUploadErrorDetails(null);
        }} className="text-red-500">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>}

      {/* Delete confirmation modal */}
      {deletingDocId && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelDelete} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>}

      {/* Download format modal */}
      {downloadingDocId && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Download Document
            </h3>
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Export Type</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => handleDownloadFormat(downloadingDocId, 'docx', 'original')} className="flex flex-col items-center p-3 border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200">
                  <FileTextIcon className="h-8 w-8 text-blue-500 mb-2" />
                  <span className="text-sm font-medium">Original (.docx)</span>
                </button>
                <button onClick={() => handleDownloadFormat(downloadingDocId, 'docx', 'edited')} className="flex flex-col items-center p-3 border border-gray-200 rounded-md hover:bg-green-50 hover:border-green-200">
                  <FileTextIcon className="h-8 w-8 text-green-500 mb-2" />
                  <span className="text-sm font-medium">Edited (.docx)</span>
                </button>
              </div>
              <h4 className="font-medium text-gray-700 mb-2">Other Formats</h4>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleDownloadFormat(downloadingDocId, 'txt', 'edited')} className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                  <FileTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm">Plain Text (.txt)</span>
                </button>
                <button onClick={() => handleDownloadFormat(downloadingDocId, 'md', 'edited')} className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                  <FileTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm">Markdown (.md)</span>
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setDownloadingDocId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>}

      {/* Version history modal */}
      {viewingVersionsDocId && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Version History: {versionHistoryDocName}
              </h3>
              <button onClick={() => setViewingVersionsDocId(null)} className="text-gray-500 hover:text-gray-700">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-grow">
              {documentVersions.length === 0 ? <p className="text-gray-500 text-center py-8">
                  No version history available for this document.
                </p> : <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
                  {documentVersions.map((version, index) => <div key={version.versionId} className={`p-4 ${confirmRollbackVersionId === version.versionId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-gray-900">
                              Version {version.versionNumber}
                            </span>
                            {version.createdBy === 'auto' && <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Auto-saved
                              </span>}
                            {version.createdBy === 'user' && <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Manual save
                              </span>}
                          </div>
                          <div className="text-sm text-gray-500 mb-1">
                            <ClockIcon className="inline-block h-3.5 w-3.5 mr-1" />
                            {formatDate(version.timestamp)}
                          </div>
                          {version.comment && <p className="text-sm text-gray-700 mt-1">
                              "{version.comment}"
                            </p>}
                        </div>
                        {index !== documentVersions.length - 1 && <div>
                            {confirmRollbackVersionId === version.versionId ? <div className="flex space-x-2">
                                <button onClick={() => setConfirmRollbackVersionId(null)} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                                  Cancel
                                </button>
                                <button onClick={handleRollback} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                                  Confirm Rollback
                                </button>
                              </div> : <button onClick={() => handleRollbackConfirm(version.versionId)} className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition">
                                <RotateCcwIcon className="h-3.5 w-3.5 mr-1.5" />
                                Restore
                              </button>}
                          </div>}
                      </div>
                    </div>)}
                </div>}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setViewingVersionsDocId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>}

      {documents.length === 0 ? <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
          <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            No documents yet
          </h2>
          <p className="text-gray-500 mb-6">
            Create your first document to get started
          </p>
          <div className="flex justify-center space-x-4">
            <button onClick={handleUploadClick} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload Document
            </button>
            <button onClick={handleCreateNew} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Document
            </button>
          </div>
        </div> : <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="grid grid-cols-12 text-sm font-medium text-gray-500 border-b border-gray-200 px-6 py-3">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Last Modified</div>
            <div className="col-span-2">Version</div>
            <div className="col-span-2">Extraction Quality</div>
            <div className="col-span-2">Actions</div>
          </div>
          {documents.map(doc => <div key={doc.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition">
              <div className="col-span-5">
                {renamingDocId === doc.id ? <div className="flex items-center space-x-2">
                    <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                    <button onClick={handleSaveRename} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button onClick={handleCancelRename} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div> : <div className="flex items-center cursor-pointer" onClick={() => handleOpenDocument(doc.id)}>
                    <FileTextIcon className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="font-medium text-gray-800">
                      {doc.name}
                    </span>
                  </div>}
              </div>
              <div className="col-span-2 text-gray-600">
                {new Date(doc.lastModified).toLocaleString()}
              </div>
              <div className="col-span-2 flex items-center">
                <span className="font-medium text-gray-700">
                  v{doc.version || 1}
                </span>
                {doc.versionHistory && doc.versionHistory.length > 0 && <button onClick={() => handleViewVersions(doc.id)} className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded" title="View version history">
                    <HistoryIcon className="h-4 w-4" />
                  </button>}
              </div>
              <div className="col-span-2">
                {doc.extractionQuality !== undefined ? <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${doc.extractionQuality >= 0.75 ? 'bg-green-500' : doc.extractionQuality >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm">
                      {getQualityDescription(doc.extractionQuality)}
                      {doc.extractionSource && ` (${doc.extractionSource})`}
                    </span>
                  </div> : <span className="text-gray-400">Not available</span>}
              </div>
              <div className="col-span-2 flex space-x-1">
                <button className="p-1 text-gray-500 hover:text-blue-600 transition" title="Edit document" onClick={() => handleOpenDocument(doc.id)}>
                  <EditIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-500 hover:text-blue-600 transition" title="Download document" onClick={() => handleDownload(doc.id)}>
                  <DownloadIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-500 hover:text-blue-600 transition" title="Duplicate document" onClick={() => handleDuplicate(doc.id)}>
                  <CopyIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-500 hover:text-blue-600 transition" title="Rename document" onClick={() => handleStartRename(doc.id, doc.name)}>
                  <EditIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-500 hover:text-red-600 transition" title="Delete document" onClick={() => handleDeleteDocument(doc.id)}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>)}
        </div>}
    </div>;
};
export default FileCenterPage;