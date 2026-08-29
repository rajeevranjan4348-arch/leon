import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  Coffee,
  Utensils,
  Fuel,
  TreePine,
  AlertCircle,
  LocateFixed,
  RefreshCw,
  ExternalLink,
  Car,
  Footprints,
  Bus,
  Bike,
  Sun,
  Moon,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Filter,
  Compass,
  Plus,
  Minus,
  Check,
  Star,
  Bookmark,
  Share2,
  Phone,
  Clock,
  Menu,
  Bell,
  Radio,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MapPlace,
  LiveIncident,
  RouteDetail,
  searchRealPlaces,
  getLiveIncidentsAround,
  parseMapAgentCommand,
  calculateDistanceMeters,
  formatDistance,
} from '@/lib/mapsAgentService';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export type MapTheme = 'standard' | 'dark' | 'satellite';
export type TabMode = 'map' | 'live' | 'list';
export type RadiusOption = 100 | 500 | 1000 | 5000 | 10000;

interface LocationState {
  lat: number;
  lng: number;
  accuracy?: number;
}

const DEFAULT_CENTER: LocationState = {
  lat: 37.7749,
  lng: -122.4194,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#131b2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#131b2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8c9fb8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#162b32' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#22324f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#162238' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#31476d' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#09101d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
];

/* ── Interactive Fallback & Overlay Vector Map Component ── */
function FallbackInteractiveVectorMap({
  center,
  userLocation,
  radiusMeters,
  places,
  incidents,
  selectedPlace,
  route,
  onSelectPlace,
  onDragCenter,
}: {
  center: LocationState;
  userLocation: LocationState;
  radiusMeters: number;
  places: MapPlace[];
  incidents: LiveIncident[];
  selectedPlace: MapPlace | null;
  route: RouteDetail | null;
  onSelectPlace: (place: MapPlace | null) => void;
  onDragCenter: (newCenter: LocationState) => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPin, setIsDraggingPin] = useState(false);

  // Convert lat/lng to container pixel percentage based on center & zoom
  const latLngToPercent = (lat: number, lng: number) => {
    const latSpan = 0.03 / (zoomLevel / 15);
    const lngSpan = (0.03 * 1.5) / (zoomLevel / 15);

    const x = 50 + ((lng - center.lng) / lngSpan) * 50;
    const y = 50 - ((lat - center.lat) / latSpan) * 50;

    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const radiusPixels = Math.min(360, Math.max(70, (radiusMeters / 1000) * 120 * (zoomLevel / 15)));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0b1329] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        // Tap to relocate center pin
        if (containerRef.current && !isDraggingPin) {
          const rect = containerRef.current.getBoundingClientRect();
          const clickX = ((e.clientX - rect.left) / rect.width) * 100;
          const clickY = ((e.clientY - rect.top) / rect.height) * 100;

          const latSpan = 0.03 / (zoomLevel / 15);
          const lngSpan = (0.03 * 1.5) / (zoomLevel / 15);

          const newLng = center.lng + ((clickX - 50) / 50) * lngSpan;
          const newLat = center.lat - ((clickY - 50) / 50) * latSpan;

          onDragCenter({ lat: newLat, lng: newLng });
        }
      }}
    >
      {/* Background Vector Stylized Grid & Topography Roads */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e293b" strokeWidth="1" />
          </pattern>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />
        
        {/* Curving decorative roads / water channels */}
        <path d="M -50,180 Q 250,90 500,240 T 1000,160" fill="none" stroke="#1e3a8a" strokeWidth="16" opacity="0.2" />
        <path d="M 120,-50 Q 220,300 180,600 T 300,900" fill="none" stroke="#1e293b" strokeWidth="8" />
        <path d="M -30,400 Q 300,450 650,380 T 1100,500" fill="none" stroke="#334155" strokeWidth="6" />
        <path d="M 400,-20 Q 450,280 600,420 T 800,800" fill="none" stroke="#334155" strokeWidth="4" />
      </svg>

      {/* Radius Halo Circle centered on active position (matches reference screenshot) */}
      {(() => {
        const userPos = latLngToPercent(userLocation.lat, userLocation.lng);
        return (
          <div
            className="absolute rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
            style={{
              left: `${userPos.x}%`,
              top: `${userPos.y}%`,
              width: `${radiusPixels * 2}px`,
              height: `${radiusPixels * 2}px`,
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.04) 65%, transparent 100%)',
              border: '1.5px dashed rgba(56, 189, 248, 0.45)',
              boxShadow: '0 0 40px rgba(56, 189, 248, 0.15), inset 0 0 25px rgba(56, 189, 248, 0.08)',
            }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-400/40 text-[10px] font-mono text-sky-300 font-bold backdrop-blur-md">
              {formatDistance(radiusMeters)}
            </div>
          </div>
        );
      })()}

      {/* Active Route Polyline (if directions are active) */}
      {route && selectedPlace && (() => {
        const p1 = latLngToPercent(userLocation.lat, userLocation.lng);
        const p2 = latLngToPercent(selectedPlace.lat, selectedPlace.lng);
        const midX = (p1.x + p2.x) / 2 + 4;
        const midY = (p1.y + p2.y) / 2 - 4;

        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <path
              d={`M ${p1.x}% ${p1.y}% Q ${midX}% ${midY}% ${p2.x}% ${p2.y}%`}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="5"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
          </svg>
        );
      })()}

      {/* Real Place Markers (Glowing beacons matching reference image) */}
      {places.map((place) => {
        const pos = latLngToPercent(place.lat, place.lng);
        const isSelected = selectedPlace?.id === place.id;
        const color = place.color || (place.severity === 'High' ? '#ef4444' : place.severity === 'Medium' ? '#f59e0b' : '#06b6d4');

        return (
          <div
            key={place.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlace(isSelected ? null : place);
            }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-all duration-300 hover:scale-125"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {/* Glowing animated halo */}
            <div
              className="absolute -inset-3 rounded-full opacity-60 animate-ping pointer-events-none"
              style={{ backgroundColor: color }}
            />
            <div
              className={`relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-transform ${
                isSelected ? 'scale-125 ring-4 ring-white/50' : ''
              }`}
              style={{
                backgroundColor: color,
                borderColor: '#ffffff',
                boxShadow: `0 0 16px ${color}`,
              }}
            >
              {place.category.toLowerCase().includes('restaurant') || place.category.toLowerCase().includes('food') ? (
                <Utensils className="w-3.5 h-3.5 text-white" />
              ) : place.category.toLowerCase().includes('hospital') || place.category.toLowerCase().includes('medical') ? (
                <AlertCircle className="w-3.5 h-3.5 text-white" />
              ) : place.category.toLowerCase().includes('cafe') || place.category.toLowerCase().includes('coffee') ? (
                <Coffee className="w-3.5 h-3.5 text-white" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-white" />
              )}
            </div>

            {/* Tooltip Tag */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-white/20 text-white text-[11px] font-semibold whitespace-nowrap shadow-2xl backdrop-blur-xl z-30 pointer-events-none">
              <span>{place.name}</span>
              <span className="text-amber-300 font-bold">★ {place.rating}</span>
            </div>
          </div>
        );
      })}

      {/* User Current Live GPS Indicator / Draggable Focus Pin */}
      {(() => {
        const userPos = latLngToPercent(userLocation.lat, userLocation.lng);
        return (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-25 cursor-grab active:cursor-grabbing"
            style={{ left: `${userPos.x}%`, top: `${userPos.y}%` }}
            title="Draggable GPS Pin"
          >
            <div className="relative flex flex-col items-center">
              {/* Reference "DRAG ME" indicator pill */}
              <div className="mb-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md animate-bounce">
                DRAG ME
              </div>
              <div className="relative flex items-center justify-center">
                <span className="absolute w-10 h-10 bg-blue-500/40 rounded-full animate-ping" />
                <div className="w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-xl">
                  <Navigation className="w-3.5 h-3.5 text-white transform -rotate-45" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Map Zoom & Recenter Controls */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomLevel((z) => Math.min(z + 1, 20));
          }}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-xl backdrop-blur-xl transition-transform active:scale-95 cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomLevel((z) => Math.max(z - 1, 10));
          }}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-xl backdrop-blur-xl transition-transform active:scale-95 cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Main Google Maps Agent View Component ── */
export function GoogleMapsView({
  className = '',
  initialLat,
  initialLng,
  title = 'GOOGLE MAPS AGENT',
  onBackToHub,
}: {
  className?: string;
  initialLat?: number;
  initialLng?: number;
  title?: string;
  onBackToHub?: () => void;
}) {
  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<TabMode>('map');
  const [radiusMeters, setRadiusMeters] = useState<RadiusOption>(1000);
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Map Coordinates & GPS
  const [userLocation, setUserLocation] = useState<LocationState>(() => ({
    lat: initialLat || DEFAULT_CENTER.lat,
    lng: initialLng || DEFAULT_CENTER.lng,
  }));
  const [mapCenter, setMapCenter] = useState<LocationState>(userLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');

  // Search Results, Live Incidents & Route
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteDetail | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);

  // Search & AI Voice Agent State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Finding nearby places...');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [lastAiResponse, setLastAiResponse] = useState<string>('');

  // Speech Recognition Reference
  const recognitionRef = useRef<any>(null);

  // Perform Real Place & Incident Search
  const performSearch = useCallback(
    async (queryText: string = '', radiusVal: number = radiusMeters) => {
      setIsSearching(true);
      setStatusMessage('Finding nearby places and live data...');
      try {
        const foundPlaces = await searchRealPlaces(mapCenter, queryText || 'popular places', radiusVal);
        setPlaces(foundPlaces);

        const foundIncidents = getLiveIncidentsAround(mapCenter, radiusVal);
        setIncidents(foundIncidents);

        if (foundPlaces.length > 0) {
          setStatusMessage(`Found ${foundPlaces.length} places around you (${formatDistance(radiusVal)})`);
        } else {
          setStatusMessage(`No direct places found within ${formatDistance(radiusVal)}`);
        }
      } catch (err) {
        console.error('Error fetching places:', err);
        toast.error('Could not refresh map data. Using cached coordinates.');
      } finally {
        setIsSearching(false);
      }
    },
    [mapCenter, radiusMeters]
  );

  // Initial GPS & search fetch
  useEffect(() => {
    performSearch('places', radiusMeters);
  }, [performSearch, radiusMeters]);

  // Voice Read-Aloud (TTS) helper
  const speakText = useCallback(
    (textToSpeak: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      try {
        window.speechSynthesis.cancel();
        const clean = textToSpeak.replace(/[*#_`]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsVoiceSpeaking(true);
        utterance.onend = () => setIsVoiceSpeaking(false);
        utterance.onerror = () => setIsVoiceSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('TTS error:', e);
      }
    },
    [ttsEnabled]
  );

  // Process AI Natural Language & Voice Agent Commands
  const handleProcessAiCommand = async (inputStr: string) => {
    if (!inputStr.trim()) return;

    setIsSearching(true);
    setStatusMessage('AI analyzing spatial request...');

    try {
      const action = await parseMapAgentCommand(
        inputStr,
        userLocation,
        places,
        radiusMeters,
        selectedPlace
      );

      setLastAiResponse(action.voiceResponse);

      if (action.radiusMeters && action.radiusMeters !== radiusMeters) {
        const matched = [100, 500, 1000, 5000, 10000].includes(action.radiusMeters)
          ? (action.radiusMeters as RadiusOption)
          : radiusMeters;
        setRadiusMeters(matched);
      }

      if (action.places && action.places.length > 0) {
        setPlaces(action.places);
        if (action.places[0]) {
          setSelectedPlace(action.places[0]);
          setMapCenter({ lat: action.places[0].lat, lng: action.places[0].lng });
        }
      }

      if (action.route) {
        setActiveRoute(action.route);
        setActiveTab('map');
      }

      toast.success(action.voiceResponse);
      speakText(action.voiceResponse);
      setStatusMessage(action.voiceResponse);
    } catch (err: any) {
      console.error('AI Command execution error:', err);
      toast.error('Could not complete map action: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  // Start / Stop Microphone Flow
  const toggleVoiceRecording = () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Please type your request.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsVoiceListening(true);
        toast.info('Listening for map command (e.g. "Find vegetarian restaurants", "Show hospitals within 2 km")...');
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setSearchQuery(transcript);

        if (event.results[0].isFinal) {
          rec.stop();
          setIsVoiceListening(false);
          handleProcessAiCommand(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsVoiceListening(false);
        toast.error('Voice recognition stopped: ' + event.error);
      };

      rec.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Speech setup error:', err);
      setIsVoiceListening(false);
    }
  };

  // Locate Current User GPS
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported in browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LocationState = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        setMapCenter(coords);
        setIsLocating(false);
        toast.success('Live GPS location verified');
        performSearch('places', radiusMeters);
      },
      (err) => {
        console.warn('Geolocation permission notice:', err);
        setIsLocating(false);
        toast.info('Location access restricted. Centered on district coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [performSearch, radiusMeters]);

  // Handle Calculate Directions
  const handleCalculateDirections = (place: MapPlace) => {
    setSelectedPlace(place);
    const dist = calculateDistanceMeters(userLocation.lat, userLocation.lng, place.lat, place.lng);
    const estMins = Math.max(2, Math.round(dist / 400));

    const route: RouteDetail = {
      origin: { lat: userLocation.lat, lng: userLocation.lng, name: 'Current Location' },
      destination: { lat: place.lat, lng: place.lng, name: place.name },
      distance: formatDistance(dist),
      duration: `${estMins} mins`,
      travelMode: 'DRIVING',
      steps: [
        { instruction: `Head towards ${place.address}`, distance: `${Math.round(dist * 0.4)} m`, duration: `${Math.ceil(estMins * 0.4)} mins` },
        { instruction: `Continue on direct route towards ${place.name}`, distance: `${Math.round(dist * 0.6)} m`, duration: `${Math.floor(estMins * 0.6)} mins` },
        { instruction: `Arrive at destination: ${place.name}`, distance: 'Destination', duration: '0 min' },
      ],
    };

    setActiveRoute(route);
    setActiveTab('map');
    toast.success(`Route calculated to ${place.name} (${route.distance}, ~${route.duration})`);
    speakText(`Routing to ${place.name}. Estimated travel time is ${route.duration}.`);
  };

  // Toggle Save Place
  const toggleSavePlace = (placeId: string) => {
    setSavedPlaces((prev) => {
      const isSaved = prev.includes(placeId);
      const updated = isSaved ? prev.filter((id) => id !== placeId) : [...prev, placeId];
      toast.success(isSaved ? 'Removed from saved places' : 'Saved to favorites');
      return updated;
    });
  };

  return (
    <div
      className={`relative w-full h-[650px] min-h-[550px] rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-[#090d16] font-sans flex flex-col ${className}`}
    >
      {/* ── TOP HEADER BAR (Matching Reference Screenshot) ── */}
      <div className="relative z-30 px-4 py-3 bg-[#0d1424]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Menu / Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-black tracking-widest text-white uppercase">
            {title}
          </span>
        </div>

        {/* Action icons on top right */}
        <div className="flex items-center gap-2">
          {/* TTS Audio toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              ttsEnabled
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-white/5 text-white/40 border-white/10'
            }`}
            title={ttsEnabled ? 'Voice Agent Audio ON' : 'Voice Agent Muted'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => {
              setActiveTab('live');
              toast.info(`You have ${incidents.length} active live incidents around your radius`);
            }}
            className="relative p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Live Incident Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>
        </div>
      </div>

      {/* ── SEGMENTED NAVIGATION TABS (MAP / LIVE / LIST) ── */}
      <div className="relative z-30 px-4 py-2 bg-[#0a0f1d] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            MAP
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'live'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
            LIVE ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            LIST ({places.length})
          </button>
        </div>

        {/* Google Maps Key Status Indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/50 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
          <span className={`w-2 h-2 rounded-full ${hasValidKey ? 'bg-emerald-400' : 'bg-sky-400 animate-pulse'}`} />
          <span>{hasValidKey ? 'Google Maps Live API' : 'Interactive Geospatial Engine'}</span>
        </div>
      </div>

      {/* ── MAP / CONTROLS OVERLAY ROW (FILTER & RADIUS SELECTOR) ── */}
      <div className="relative z-25 px-4 py-2 bg-transparent flex items-center justify-between pointer-events-none">
        {/* Filter Dropdown */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/70 hover:bg-black text-white text-xs font-semibold border border-white/15 backdrop-blur-xl shadow-lg transition-all cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>FILTER</span>
            <ChevronDown className="w-3 h-3 text-white/60" />
          </button>

          {isFilterOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-slate-900/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 space-y-1">
              <button
                onClick={() => {
                  setFilterType('all');
                  setIsFilterOpen(false);
                  performSearch('places', radiusMeters);
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-white hover:bg-white/10 font-medium"
              >
                All Categories
              </button>
              <button
                onClick={() => {
                  setFilterType('restaurant');
                  setIsFilterOpen(false);
                  handleProcessAiCommand('Find restaurants');
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-white hover:bg-white/10 font-medium"
              >
                🍽️ Restaurants & Dining
              </button>
              <button
                onClick={() => {
                  setFilterType('vegetarian');
                  setIsFilterOpen(false);
                  handleProcessAiCommand('Only vegetarian');
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-emerald-300 hover:bg-white/10 font-medium"
              >
                🌱 Vegetarian & Vegan
              </button>
              <button
                onClick={() => {
                  setFilterType('hospital');
                  setIsFilterOpen(false);
                  handleProcessAiCommand('Show hospitals');
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:bg-white/10 font-medium"
              >
                🏥 Hospitals & Health
              </button>
              <button
                onClick={() => {
                  setFilterType('pharmacy');
                  setIsFilterOpen(false);
                  handleProcessAiCommand('Take me to the nearest pharmacy');
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-sky-300 hover:bg-white/10 font-medium"
              >
                💊 Pharmacy
              </button>
            </div>
          )}
        </div>

        {/* Severity / Category Legend (High / Medium / Low from Reference Image) */}
        <div className="hidden md:flex items-center gap-3 bg-black/60 backdrop-blur-xl px-3 py-1 rounded-2xl border border-white/10 pointer-events-auto">
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            <span>Low</span>
          </div>
        </div>

        {/* Radius Selector Button (100m, 500m, 1km, 5km, 10km) */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setIsRadiusOpen(!isRadiusOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/70 hover:bg-black text-white text-xs font-bold border border-white/15 backdrop-blur-xl shadow-lg transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>RADIUS: {formatDistance(radiusMeters)}</span>
            <ChevronDown className="w-3 h-3 text-white/60" />
          </button>

          {isRadiusOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-slate-900/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 space-y-1">
              {([100, 500, 1000, 5000, 10000] as RadiusOption[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRadiusMeters(r);
                    setIsRadiusOpen(false);
                    performSearch(searchQuery, r);
                    toast.info(`Updated search radius to ${formatDistance(r)}`);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    radiusMeters === r
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span>{formatDistance(r)}</span>
                  {radiusMeters === r && <Check className="w-3.5 h-3.5 text-slate-950 font-black" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TAB CONTENT AREA (MAP / LIVE / LIST) ── */}
      <div className="relative flex-1 w-full overflow-hidden">
        {activeTab === 'map' && (
          <FallbackInteractiveVectorMap
            center={mapCenter}
            userLocation={userLocation}
            radiusMeters={radiusMeters}
            places={places}
            incidents={incidents}
            selectedPlace={selectedPlace}
            route={activeRoute}
            onSelectPlace={(p) => {
              setSelectedPlace(p);
              if (p) {
                setMapCenter({ lat: p.lat, lng: p.lng });
              }
            }}
            onDragCenter={(newCenter) => {
              setUserLocation(newCenter);
              setMapCenter(newCenter);
              performSearch('places', radiusMeters);
              toast.success('Centered on new coordinate pin');
            }}
          />
        )}

        {activeTab === 'live' && (
          <div className="w-full h-full bg-[#0b1329] p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-sm font-bold text-white">Live Incident & Traffic Feed</span>
              </div>
              <span className="text-xs text-white/50">{incidents.length} active updates within {formatDistance(radiusMeters)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-black/50 border border-white/10 rounded-2xl p-3.5 space-y-2 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        inc.severity === 'High'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : inc.severity === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {inc.severity} Severity
                    </span>
                    <span className="text-[11px] text-white/40">{inc.reportedAt}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{inc.title}</h4>
                  <p className="text-xs text-white/70">{inc.description}</p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-blue-300 font-mono">📍 {inc.distanceText} away</span>
                    <button
                      onClick={() => {
                        setMapCenter({ lat: inc.lat, lng: inc.lng });
                        setActiveTab('map');
                        toast.info(`Focused on incident: ${inc.title}`);
                      }}
                      className="text-xs text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      View on Map →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="w-full h-full bg-[#0b1329] p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-sm font-bold text-white">Discovered Places & Amenities</span>
              <span className="text-xs text-white/50">{places.length} results</span>
            </div>

            <div className="space-y-2.5">
              {places.map((place) => (
                <div
                  key={place.id}
                  onClick={() => {
                    setSelectedPlace(place);
                    setMapCenter({ lat: place.lat, lng: place.lng });
                    setActiveTab('map');
                  }}
                  className="bg-black/50 hover:bg-black/80 border border-white/10 hover:border-white/20 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                        {place.name}
                      </h4>
                      {place.isVegetarian && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          🌱 Veg
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 line-clamp-1">{place.address}</p>
                    <div className="flex items-center gap-3 text-xs text-white/70">
                      <span className="text-amber-300 font-bold">★ {place.rating} ({place.userRatingsTotal})</span>
                      <span>•</span>
                      <span className="text-blue-300 font-mono">{place.distanceText}</span>
                      <span>•</span>
                      <span className={place.isOpen ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {place.isOpen ? 'Open Now' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCalculateDirections(place);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                    >
                      Route
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SELECTED PLACE DETAILS CARD / BOTTOM SHEET ── */}
        {selectedPlace && activeTab === 'map' && (
          <div className="absolute bottom-20 left-4 right-4 z-40 bg-slate-950/95 border border-white/20 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedPlace.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                    {selectedPlace.category}
                  </span>
                  {selectedPlace.isVegetarian && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      🌱 Veg
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{selectedPlace.address}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="text-amber-300 font-bold">★ {selectedPlace.rating} ({selectedPlace.userRatingsTotal})</span>
                  <span>•</span>
                  <span className="text-blue-400 font-mono">📍 {selectedPlace.distanceText} away</span>
                  <span>•</span>
                  <span className={selectedPlace.isOpen ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {selectedPlace.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlace(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Summary */}
            {selectedPlace.aiSummary && (
              <p className="text-xs text-slate-300 mt-2 p-2 rounded-xl bg-white/5 border border-white/10">
                ✨ {selectedPlace.aiSummary}
              </p>
            )}

            {/* Actions: Directions & Save */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCalculateDirections(selectedPlace)}
                  className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </button>
                <button
                  onClick={() => toggleSavePlace(selectedPlace.id)}
                  className={`px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    savedPlaces.includes(selectedPlace.id)
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{savedPlaces.includes(selectedPlace.id) ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {selectedPlace.website && (
                <a
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs flex items-center gap-1 border border-white/10"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM STATUS BAR & AI VOICE SEARCH BAR (Matching Reference) ── */}
      <div className="relative z-30 p-3 bg-[#0d1424]/95 backdrop-blur-2xl border-t border-white/10 space-y-2">
        {/* Status Line */}
        <div className="flex items-center justify-between text-[11px] text-white/70 px-1">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">
              📍 Current Location: {statusMessage}
            </span>
          </div>
          {isLocating && <span className="text-blue-400 animate-pulse font-mono">GPS Syncing...</span>}
        </div>

        {/* AI Voice & Text Command Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessAiCommand(searchQuery);
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Microphone Trigger */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-2xl border transition-all transform active:scale-95 cursor-pointer shrink-0 ${
              isVoiceListening
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_20px_#f43f5e]'
                : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/15'
            }`}
            title={isVoiceListening ? 'Listening... Speak your request' : 'Click to Speak (Voice Agent)'}
          >
            {isVoiceListening ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-blue-400" />}
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask Maps AI: 'Find vegetarian restaurants', 'Show hospitals within 2 km'..."
              className="w-full bg-black/60 border border-white/15 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Suggestion Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-none">
          <button
            type="button"
            onClick={() => handleProcessAiCommand('Find restaurants near me')}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            🍽️ Restaurants
          </button>
          <button
            type="button"
            onClick={() => handleProcessAiCommand('Only vegetarian')}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 whitespace-nowrap transition-colors"
          >
            🌱 Vegetarian
          </button>
          <button
            type="button"
            onClick={() => handleProcessAiCommand('Show hospitals within 2 km')}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            🏥 Hospitals (2km)
          </button>
          <button
            type="button"
            onClick={() => handleProcessAiCommand('Take me to the nearest pharmacy')}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            💊 Nearest Pharmacy
          </button>
          <button
            type="button"
            onClick={() => handleProcessAiCommand("What's around me?")}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 whitespace-nowrap transition-colors"
          >
            📍 What's around me?
          </button>
        </div>
      </div>
    </div>
  );
}
