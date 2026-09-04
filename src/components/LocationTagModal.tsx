import React, { useState } from 'react';
import { LocationTag } from '../types';
import {
  MapPin,
  Compass,
  Search,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Navigation
} from 'lucide-react';
import { reverseGeocodeLocation, searchLocations } from '../lib/api';

interface LocationTagModalProps {
  currentLocation?: LocationTag;
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (location: LocationTag | null) => Promise<void>;
}

export const LocationTagModal: React.FC<LocationTagModalProps> = ({
  currentLocation,
  isOpen,
  onClose,
  onSaveLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<LocationTag | null>(currentLocation || null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Use browser geolocation -> Backend Reverse Geocoding with coordinate sanitization
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setStatusMessage('Acquiring sanctuary coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setStatusMessage('Fuzzing coordinates & resolving through backend proxy...');
          const loc = await reverseGeocodeLocation(pos.coords.latitude, pos.coords.longitude);
          setSelectedTag(loc);
          setStatusMessage('Location acquired safely.');
        } catch (err: any) {
          console.error('Failed to reverse geocode location:', err);
          setErrorMessage(err?.message || 'Could not resolve location.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setStatusMessage(null);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. You can select a sanctuary manually below.');
        } else {
          setErrorMessage('Unable to retrieve current coordinates.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchLocations(searchQuery.trim());
      setSearchResults(res.places);
    } catch (err: any) {
      console.error('Search locations error:', err);
      setErrorMessage(err?.message || 'Failed to search places.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    try {
      await onSaveLocation(selectedTag);
      onClose();
    } catch (err: any) {
      setErrorMessage('Failed to save location tag.');
    }
  };

  const handleClear = async () => {
    try {
      await onSaveLocation(null);
      setSelectedTag(null);
      onClose();
    } catch (err: any) {
      setErrorMessage('Failed to clear location tag.');
    }
  };

  const quickSanctuaries: LocationTag[] = [
    { placeName: 'Home Sanctuary', neighborhood: 'Private Studio', city: 'Home Space', isFuzzed: true, taggedAt: Date.now() },
    { placeName: 'Botanical Garden', neighborhood: 'Pavilion Park', city: 'Nature Retreat', isFuzzed: true, taggedAt: Date.now() },
    { placeName: 'Quiet Coffee House', neighborhood: 'Downtown Cafe', city: 'Urban Haven', isFuzzed: true, taggedAt: Date.now() },
    { placeName: 'Public Library Reading Room', neighborhood: 'City Center', city: 'Knowledge Alcove', isFuzzed: true, taggedAt: Date.now() },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-7 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <MapPin className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Location-Aware Tagging
              </h3>
              <p className="text-xs text-stone-500">
                Ground your reflections in their geographical context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security / Privacy Banner (Fuzzing Directive Compliance) */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Zero-Tracking Privacy Standard:</span> Coordinates are fuzzed to 2 decimal places (~1.1 km radius) on our server before persistence. Precise coordinates are never saved or leaked.
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
            {statusMessage}
          </p>
        )}

        {/* Current / Selected Location preview */}
        {selectedTag && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-amber-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-stone-900">{selectedTag.placeName}</p>
                <p className="text-xs text-stone-600">
                  {[selectedTag.neighborhood, selectedTag.city, selectedTag.country].filter(Boolean).join(' • ')}
                  {selectedTag.fuzzedLat && ` (Fuzzed: ${selectedTag.fuzzedLat}, ${selectedTag.fuzzedLng})`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="text-xs text-stone-500 hover:text-rose-600 underline"
            >
              Change
            </button>
          </div>
        )}

        {/* Action 1: Use Current Location */}
        <div>
          <button
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-stone-50 py-3 px-4 text-xs font-semibold text-stone-800 transition hover:bg-stone-100 disabled:opacity-50"
          >
            <Navigation className={`h-4 w-4 text-amber-700 ${isLocating ? 'animate-pulse' : ''}`} />
            <span>{isLocating ? 'Determining sanctuary...' : 'Pin Current Sanctuary (Safe Geolocation)'}</span>
          </button>
        </div>

        {/* Action 2: Search Sanctuaries */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="block text-xs font-semibold text-stone-700">
            Or Search Venue / Sanctuary
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Kyoto Zen Garden, Central Park, Home"
                className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <span className="text-[11px] font-semibold uppercase text-stone-500 block">
              Search Results
            </span>
            {searchResults.map((place, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedTag(place)}
                className="w-full text-left rounded-xl p-2.5 border border-stone-200 hover:bg-amber-50 hover:border-amber-300 text-xs flex items-center justify-between transition"
              >
                <div>
                  <p className="font-medium text-stone-900">{place.placeName}</p>
                  <p className="text-[11px] text-stone-500">{place.city || place.neighborhood}</p>
                </div>
                {selectedTag?.placeName === place.placeName && (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quick Sanctuary Suggestions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-stone-500 block">
            Suggested Sanctuaries
          </span>
          <div className="grid grid-cols-2 gap-2">
            {quickSanctuaries.map((qs, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedTag(qs)}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  selectedTag?.placeName === qs.placeName
                    ? 'border-amber-400 bg-amber-50 text-amber-950 font-medium'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                }`}
              >
                <span className="block font-medium truncate">{qs.placeName}</span>
                <span className="text-[10px] text-stone-500 block truncate">{qs.neighborhood}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          {currentLocation ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-600 hover:underline"
            >
              Remove Tag
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800"
            >
              Save Location Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
