import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinkClass = (path) => {
    const active = location.pathname === path;
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      active
        ? 'text-amber-500 bg-navy-700'
        : 'text-gray-300 hover:text-white hover:bg-navy-700'
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-800 border-b border-navy-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-xl font-bold text-white">
              Recover<span className="text-amber-500">Watch</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={() => navLinkClass('/')}>
              My Items
            </NavLink>
            <NavLink to="/settings" className={() => navLinkClass('/settings')}>
              Settings
            </NavLink>
            <Link
              to="/items/new"
              className="ml-2 btn-amber inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-navy-700 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          mobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 space-y-2 bg-navy-800 border-t border-navy-700">
          <NavLink
            to="/"
            className={() => `block ${navLinkClass('/')}`}
            onClick={() => setMobileOpen(false)}
          >
            My Items
          </NavLink>
          <NavLink
            to="/settings"
            className={() => `block ${navLinkClass('/settings')}`}
            onClick={() => setMobileOpen(false)}
          >
            Settings
          </NavLink>
          <Link
            to="/items/new"
            className="block btn-amber text-center"
            onClick={() => setMobileOpen(false)}
          >
            + Add Item
          </Link>
        </div>
      </div>
    </nav>
  );
}
