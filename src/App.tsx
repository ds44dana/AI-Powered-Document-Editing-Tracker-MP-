import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import FileCenterPage from './pages/FileCenterPage';
import Header from './components/Header';
import { DocumentProvider } from './context/DocumentContext';
export function App() {
  return <BrowserRouter>
      <DocumentProvider>
        <div className="flex flex-col w-full min-h-screen bg-gray-50">
          <Header />
          <main className="flex-1 w-full">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/files" element={<FileCenterPage />} />
            </Routes>
          </main>
        </div>
      </DocumentProvider>
    </BrowserRouter>;
}