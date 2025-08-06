import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileTextIcon, FolderIcon, HomeIcon } from 'lucide-react';
const Header = () => {
  const location = useLocation();
  return <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <FileTextIcon className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-800">
              PaperTrack
            </span>
          </div>
          <nav className="flex space-x-6">
            <Link to="/" className={`flex items-center space-x-1 px-3 py-2 rounded-md transition ${location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <HomeIcon className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link to="/editor" className={`flex items-center space-x-1 px-3 py-2 rounded-md transition ${location.pathname === '/editor' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <FileTextIcon className="h-4 w-4" />
              <span>Editor</span>
            </Link>
            <Link to="/files" className={`flex items-center space-x-1 px-3 py-2 rounded-md transition ${location.pathname === '/files' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <FolderIcon className="h-4 w-4" />
              <span>File Center</span>
            </Link>
          </nav>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Upgrade
          </button>
        </div>
      </div>
    </header>;
};
export default Header;