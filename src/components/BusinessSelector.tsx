import React, { useState } from 'react';
import { useBusiness } from '../contexts/BusinessContext';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function BusinessSelector() {
  const { businesses, currentBusiness, switchBusiness, createBusiness } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  const handleCreateBusiness = async () => {
    if (!newBusinessName.trim()) return;

    try {
      setIsCreatingBusiness(true);
      await createBusiness(newBusinessName);
      setNewBusinessName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create business:', error);
      alert('Failed to create business. Please try again.');
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  if (!currentBusiness) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 w-full bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-neutral-600" />
        <span className="font-medium text-neutral-900 flex-1 truncate">{currentBusiness.name}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
              setNewBusinessName('');
            }}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 z-50">
            <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase">
              Your Businesses
            </div>

            <div className="max-h-64 overflow-y-auto">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  onClick={() => {
                    switchBusiness(business.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-neutral-100 transition-colors flex items-center justify-between ${
                    business.id === currentBusiness.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      business.id === currentBusiness.id ? 'text-blue-700' : 'text-neutral-900'
                    }`}>
                      {business.name}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {business.plan} Plan
                    </div>
                  </div>
                  {business.id === currentBusiness.id && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-neutral-200 mt-2 pt-2">
              {isCreating ? (
                <div className="px-3 py-2 space-y-2">
                  <Input
                    type="text"
                    value={newBusinessName}
                    onChange={(e) => setNewBusinessName(e.target.value)}
                    placeholder="Business name"
                    autoFocus
                    disabled={isCreatingBusiness}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateBusiness();
                      if (e.key === 'Escape') {
                        setIsCreating(false);
                        setNewBusinessName('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateBusiness}
                      size="sm"
                      className="flex-1"
                      disabled={isCreatingBusiness || !newBusinessName.trim()}
                    >
                      {isCreatingBusiness ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreating(false);
                        setNewBusinessName('');
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={isCreatingBusiness}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-100 transition-colors flex items-center gap-2 text-blue-600 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Business</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
