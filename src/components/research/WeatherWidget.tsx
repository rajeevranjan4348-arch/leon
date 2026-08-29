import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Wind, ChevronDown, ChevronUp, Calendar, RefreshCw, Search, Pencil, Check, X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  WeatherData,
  getWeatherByCoords,
  getIpLocationAndWeather,
  getWeatherForCity
} from '@/lib/weatherService';

interface WeatherWidgetProps {
  location?: string;
  country?: string;
  date?: string;
  temp?: string;
  scale?: string;
  initialCity?: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  location: propLocation,
  country: propCountry,
  date: propDate,
  temp: propTemp,
  scale: propScale = 'Celsius',
  initialCity
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // City editing states
  const [isEditingCity, setIsEditingCity] = useState<boolean>(false);
  const [cityInput, setCityInput] = useState<string>('');
  const [isSearchingCity, setIsSearchingCity] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveWeather() {
      setLoading(true);
      let data: WeatherData | null = null;

      // 1. If explicit initialCity passed or propLocation passed
      if (initialCity) {
        data = await getWeatherForCity(initialCity);
      } else if (propLocation && propLocation !== 'Current Location') {
        data = await getWeatherForCity(propLocation);
      }

      // 2. Browser Geolocation API if available
      if (!data && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { timeout: 4000 }
            );
          });

          if (position) {
            data = await getWeatherByCoords(
              position.coords.latitude,
              position.coords.longitude,
              'Your Location'
            );
          }
        } catch (e) {
          console.warn('Geolocation fallback:', e);
        }
      }

      // 3. Fallback to IP location weather
      if (!data) {
        data = await getIpLocationAndWeather();
      }

      if (isMounted) {
        setWeatherData(data);
        setLoading(false);
      }
    }

    fetchLiveWeather();

    return () => {
      isMounted = false;
    };
  }, [initialCity, propLocation]);

  useEffect(() => {
    if (isEditingCity) {
      setCityInput(weatherData?.city || propLocation || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditingCity, weatherData?.city, propLocation]);

  const handleSearchCity = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const cleanCity = cityInput.trim();
    if (!cleanCity) return;

    setIsSearchingCity(true);
    try {
      const data = await getWeatherForCity(cleanCity);
      if (data) {
        setWeatherData(data);
        setIsEditingCity(false);
        toast.success(`Updated weather for ${data.city}${data.country ? `, ${data.country}` : ''}`);
      } else {
        toast.error(`Could not find weather for "${cleanCity}". Please try another city name.`);
      }
    } catch (err) {
      console.warn('Error searching city weather:', err);
      toast.error('Failed to search city weather. Please check your internet connection.');
    } finally {
      setIsSearchingCity(false);
    }
  };

  const formattedDate = propDate || new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const displayCity = weatherData?.city || propLocation || 'Your Location';
  const displayCountry = weatherData?.country || propCountry || '';
  
  const displayTempC = weatherData ? `${weatherData.temperatureC}°` : propTemp || '22°';
  const displayTempF = weatherData ? `${weatherData.temperatureF}°` : '72°';
  const currentTemp = useFahrenheit ? displayTempF : displayTempC;
  const currentScale = useFahrenheit ? 'Fahrenheit' : propScale;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.93, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.45, 
        ease: [0.16, 1, 0.3, 1],
        layout: { type: "spring", stiffness: 320, damping: 28, mass: 0.75 }
      }}
      className="weather-card shadow-2xl my-3 select-none hover:shadow-cyan-950/20"
      title={isExpanded ? "Click to collapse forecast" : "Click to expand 3-day forecast and details"}
    >
      {/* Top weather animation container */}
      <div 
        className="weather-container cursor-pointer"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        {/* Front Cloud with entry slide & scale animation */}
        <motion.div
          initial={{ x: -28, y: 12, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="cloud front"
        >
          <span className="left-front"></span>
          <span className="right-front"></span>
        </motion.div>

        {/* Sunshine ambient pulse halo with radial entry expansion */}
        <motion.span
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
          className="sun sunshine"
        />

        {/* Core Sun disk with smooth pop & spin entry */}
        <motion.span
          initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.12 }}
          className="sun"
        />

        {/* Back Cloud with entry slide from upper-right */}
        <motion.div
          initial={{ x: 24, y: -10, opacity: 0, scale: 0.85 }}
          animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="cloud back"
        >
          <span className="left-back"></span>
          <span className="right-back"></span>
        </motion.div>
      </div>

      {/* Header Info with Location Edit / Search */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="weather-card-header cursor-pointer"
        onClick={() => {
          if (!isEditingCity) {
            setIsExpanded(prev => !prev);
          }
        }}
      >
        <div className="flex-1 min-w-0 pr-2">
          {isEditingCity ? (
            <form 
              onSubmit={handleSearchCity} 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-cyan-400/40 shadow-inner"
            >
              <Search size={13} className="text-cyan-400 shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Enter city..."
                disabled={isSearchingCity}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setIsEditingCity(false);
                  }
                }}
                className="w-full bg-transparent text-white text-xs font-semibold placeholder-white/40 focus:outline-none px-1"
              />
              {isSearchingCity ? (
                <Loader2 size={13} className="text-cyan-400 animate-spin shrink-0 mr-1" />
              ) : (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="submit"
                    title="Search city"
                    className="p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    title="Cancel"
                    onClick={() => setIsEditingCity(false)}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div 
              className="group/city flex items-start gap-1.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingCity(true);
              }}
              title="Click to edit location and search other cities"
            >
              <div>
                <span className="font-semibold text-white/95 flex items-center gap-1.5 hover:text-cyan-300 transition-colors">
                  <MapPin size={12} className="text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[140px]">
                    {loading ? 'Detecting Location...' : displayCity}
                  </span>
                  <Pencil size={11} className="text-white/40 group-hover/city:text-cyan-300 opacity-60 group-hover/city:opacity-100 transition-all shrink-0" />
                </span>
                {displayCountry ? (
                  <span className="block text-[11px] text-white/60 font-normal pl-4 truncate max-w-[140px]">
                    {displayCountry}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <span className="text-white/70 text-xs font-medium shrink-0 pt-0.5">{formattedDate}</span>
      </motion.div>

      {/* Main Temperature & Unit Switcher */}
      <div className="flex items-baseline justify-between mt-1 mb-1">
        <motion.span
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          className="weather-temp cursor-pointer"
          onClick={() => setUseFahrenheit(prev => !prev)}
          title="Click to toggle °C / °F"
        >
          {loading ? '--°' : currentTemp}
        </motion.span>

        {/* Quick °C / °F Switch pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUseFahrenheit(prev => !prev);
          }}
          className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
          title="Switch temperature unit"
        >
          {useFahrenheit ? 'Switch to °C' : 'Switch to °F'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.38 }}
        className="weather-temp-scale flex items-center justify-between"
      >
        <span className="text-white/80 font-medium">
          {weatherData?.condition ? `${weatherData.condition} • ` : ''}{currentScale}
        </span>

        {/* Expand / Collapse toggle trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
          className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium cursor-pointer py-0.5 px-1 rounded-md hover:bg-white/5"
        >
          <span>{isExpanded ? 'Less' : 'Details'}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="flex items-center justify-center"
          >
            <ChevronDown size={13} />
          </motion.div>
        </button>
      </motion.div>

      {/* Expandable Details Section: Humidity, Wind Speed & 3-Day Forecast with Spring Physics */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="weather-expanded-forecast"
            initial={{ opacity: 0, height: 0, scale: 0.97, y: -6 }}
            animate={{ 
              opacity: 1, 
              height: 'auto', 
              scale: 1, 
              y: 0,
              transition: {
                height: { type: "spring", stiffness: 320, damping: 28, mass: 0.7 },
                opacity: { duration: 0.22, delay: 0.04 },
                scale: { type: "spring", stiffness: 340, damping: 24, delay: 0.04 },
                y: { type: "spring", stiffness: 340, damping: 24, delay: 0.04 }
              }
            }}
            exit={{ 
              opacity: 0, 
              height: 0, 
              scale: 0.97, 
              y: -6,
              transition: {
                height: { type: "spring", stiffness: 380, damping: 32, mass: 0.6 },
                opacity: { duration: 0.16 },
                scale: { duration: 0.16 },
                y: { duration: 0.16 }
              }
            }}
            className="overflow-hidden border-t border-white/10 pt-3 mt-3.5"
          >
            {/* Quick Metrics: Humidity and Wind Speed */}
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 26, delay: 0.08 }}
              className="grid grid-cols-2 gap-2 mb-3"
            >
              {/* Humidity */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Droplets size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-white/50 block font-medium">Humidity</span>
                  <span className="text-xs font-semibold text-white/90">
                    {weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : '58%'}
                  </span>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5 shadow-sm">
                <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                  <Wind size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-white/50 block font-medium">Wind Speed</span>
                  <span className="text-xs font-semibold text-white/90">
                    {weatherData?.windSpeedKmH !== undefined ? `${weatherData.windSpeedKmH} km/h` : '14 km/h'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 3-Day Trend Forecast */}
            <div className="space-y-1.5">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="flex items-center justify-between text-[11px] font-semibold text-white/70 px-1 mb-1"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-cyan-400" />
                  3-Day Forecast Trend
                </span>
              </motion.div>

              {weatherData?.forecast3Day && weatherData.forecast3Day.length > 0 ? (
                weatherData.forecast3Day.map((day, idx) => (
                  <motion.div
                    key={day.date + idx}
                    initial={{ opacity: 0, x: -12, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 360, 
                      damping: 24, 
                      delay: 0.12 + idx * 0.06 
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-colors text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white/90 block text-[11px]">{day.dayName}</span>
                      <span className="text-[10px] text-white/40">{day.condition}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-white/95">
                        {useFahrenheit ? `${day.tempMaxF}°` : `${day.tempMaxC}°`}
                      </span>
                      <span className="text-white/40 text-[10px] ml-1.5">
                        {useFahrenheit ? `${day.tempMinF}°` : `${day.tempMinC}°`}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-2 text-white/40 text-xs">
                  Forecast data available
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WeatherWidget;
