"use client";
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { LocateFixed, Filter } from 'lucide-react';

export function MapView() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const maplibreRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const statusFilterRef = useRef(statusFilter);
  const severityFilterRef = useRef(severityFilter);
  const userMarkerRef = useRef<any | null>(null);

  // keep refs in sync
  useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);
  useEffect(() => { severityFilterRef.current = severityFilter; }, [severityFilter]);
  // persist filters
  useEffect(() => {
    try { localStorage.setItem('mapStatusFilter', JSON.stringify(Array.from(statusFilter))); } catch {}
  }, [statusFilter]);
  useEffect(() => {
    try { localStorage.setItem('mapSeverityFilter', JSON.stringify(Array.from(severityFilter))); } catch {}
  }, [severityFilter]);
  useEffect(() => {
    // load persisted filters
    try {
      const s = localStorage.getItem('mapStatusFilter');
      const v = localStorage.getItem('mapSeverityFilter');
      if (s) setStatusFilter(new Set(JSON.parse(s)) as any);
      if (v) setSeverityFilter(new Set(JSON.parse(v)) as any);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let map: any;
    let markers: any[] = [];
    (async () => {
      try {
        const maplibregl = await import('maplibre-gl');
        maplibreRef.current = maplibregl;
        // Basic raster style using OSM tiles
        const style: any = {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
        };
        if (!ref.current) return;
        map = new maplibregl.Map({ container: ref.current, style, center: [0,0], zoom: 2 });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { longitude, latitude } = pos.coords;
            map.setCenter([longitude, latitude]);
            map.setZoom(14);
            if (userMarkerRef.current) userMarkerRef.current.setLngLat([longitude, latitude]);
            else userMarkerRef.current = new maplibregl.Marker({ color: '#0ea5e9' }).setLngLat([longitude, latitude]).addTo(map);
          });
        }

        async function refreshMarkers() {
          try {
            setLoading(true);
            const res = await apiFetch('/v1/incidents', { cache: 'no-store' });
            const data = await res.json();
            let list = (data.incidents || []) as any[];
            const sset = statusFilterRef.current; const vset = severityFilterRef.current;
            if (sset.size) list = list.filter((i:any) => sset.has(i.status));
            if (vset.size) list = list.filter((i:any) => vset.has(i.severity));
            // clear
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];
            const colorFor = (sev?: string) => sev === 'LOW' ? '#10b981' : sev === 'MEDIUM' ? '#f59e0b' : '#ef4444';
            list.forEach((i) => {
              if (typeof i.lng === 'number' && typeof i.lat === 'number') {
                const color = colorFor(i.severity);
                const M = maplibreRef.current || maplibregl;
                markersRef.current.push(new M.Marker({ color }).setLngLat([i.lng, i.lat]).setPopup(new M.Popup().setText(i.title)).addTo(map));
              }
            });
          } catch {}
          finally { setLoading(false); }
        }
        await refreshMarkers();
        const handler = () => refreshMarkers();
        window.addEventListener('incidents-updated' as any, handler);
        map.on('remove', () => window.removeEventListener('incidents-updated' as any, handler));
      } catch (e: any) {
        setError(e?.message || 'Map failed');
      }
    })();
    return () => {
      if (map) map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="card card-hover p-0 overflow-hidden relative">
      {/* Toolbar */}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
        <button
          onClick={() => navigator.geolocation?.getCurrentPosition((pos)=>{
            const lng = pos.coords.longitude; const lat = pos.coords.latitude;
            if (mapRef.current?.flyTo) {
              mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
            }
            if (userMarkerRef.current) userMarkerRef.current.setLngLat([lng, lat]);
            else if (mapRef.current && maplibreRef.current) {
              userMarkerRef.current = new maplibreRef.current.Marker({ color: '#0ea5e9' }).setLngLat([lng, lat]).addTo(mapRef.current);
            }
          })}
          className="px-2 py-1 rounded bg-white/90 border shadow-sm hover:shadow inline-flex items-center gap-1"
          title="Geolocate"
        >
          <LocateFixed size={14}/> Locate
        </button>
        <button
          onClick={()=>setFiltersOpen(s=>!s)}
          className="px-2 py-1 rounded bg-white/90 border shadow-sm hover:shadow inline-flex items-center gap-1"
          title="Filters"
        >
          <Filter size={14}/> Filters
        </button>
        {filtersOpen && (
          <div className="px-2 py-1 rounded bg-white/90 border shadow-sm flex items-center gap-2">
            <div className="flex items-center gap-1">
              {['OPEN','IN_PROGRESS','RESOLVED'].map(s => (
                <button
                  key={s}
                  onClick={()=>setStatusFilter(prev=>{ const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                  className={`px-2 py-0.5 rounded-full text-xs border ${statusFilter.has(s)?'bg-blue-600 text-white':'bg-white'}`}
                >{s.replace('_',' ')}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {['LOW','MEDIUM','HIGH'].map(s => (
                <button
                  key={s}
                  onClick={()=>setSeverityFilter(prev=>{ const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; })}
                  className={`px-2 py-0.5 rounded-full text-xs border ${severityFilter.has(s)?'bg-amber-600 text-white':'bg-white'}`}
                >{s}</button>
              ))}
            </div>
            <button className="text-xs underline ml-1" onClick={()=>{ setStatusFilter(new Set()); setSeverityFilter(new Set()); }}>Clear</button>
          </div>
        )}
      </div>
      <div ref={ref} className="w-full h-64 md:h-80" />
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/40 flex items-center justify-center">
          <div className="w-3/4 h-6 bg-slate-200 rounded animate-pulse" />
        </div>
      )}
      {error && <div className="text-sm text-red-600 p-2 border-t">{error}</div>}
    </div>
  );
}
