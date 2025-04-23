"use client"

import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, Popup, CircleMarker } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { Earthquake } from "@/app/actions"
import { LoadingState } from "@/components/ui/loading-spinner"

interface EarthquakeMapProps {
  earthquakes: Earthquake[]
}

export default function EarthquakeMap({ earthquakes }: EarthquakeMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  // Fix Leaflet icon issues - this has to be inside the component
  useEffect(() => {
    // Only run on client side
    const L = require("leaflet")
    
    // @ts-ignore - Known issue with Leaflet icons in Next.js
    delete L.Icon.Default.prototype._getIconUrl
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    })
  }, [])
  
  // Center map on earthquakes when data loads
  useEffect(() => {
    if (mapRef.current && earthquakes.length > 0) {
      // Define bounds that encompass all of Turkey
      const turkeyBounds = L.latLngBounds(
        [35.8, 25.6], // Southwest corner (latitude, longitude)
        [42.3, 44.8]  // Northeast corner (latitude, longitude)
      );
      
      // Create bounds from earthquakes
      const earthquakeBounds = L.latLngBounds(earthquakes.map((eq) => [eq.latitude, eq.longitude]));
      
      // Use Turkey bounds if they contain all earthquakes, otherwise use earthquake bounds
      if (turkeyBounds.contains(earthquakeBounds)) {
        mapRef.current.fitBounds(turkeyBounds);
      } else {
        mapRef.current.fitBounds(earthquakeBounds, { padding: [50, 50] });
      }
    }
  }, [earthquakes, mapRef])

  if (earthquakes.length === 0) {
    return <LoadingState text="Deprem verisi bulunamadı" />
  }

  // Find center point of earthquakes for initial map center
  const centerLat = earthquakes.reduce((sum, eq) => sum + eq.latitude, 0) / earthquakes.length
  const centerLng = earthquakes.reduce((sum, eq) => sum + eq.longitude, 0) / earthquakes.length

  return (
    <MapContainer 
      center={[39.0, 35.0]} // Center of Turkey
      zoom={6} // Initial zoom level for Turkey
      style={{ height: "100%", width: "100%" }} 
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {earthquakes.map((earthquake) => {
        const magnitude = earthquake.magnitudeML || 0
        const radius = Math.max(5, magnitude * 3) // Scale circle size based on magnitude
        const color = getColorByMagnitude(magnitude)

        return (
          <CircleMarker
            key={earthquake.id}
            center={[earthquake.latitude, earthquake.longitude]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{earthquake.location}</p>
                <p>Tarih: {earthquake.date}</p>
                <p>Saat: {earthquake.time}</p>
                <p>
                  Büyüklük (ML): <span className="font-semibold">{earthquake.magnitudeML?.toFixed(1) || "-"}</span>
                </p>
                <p>Derinlik: {earthquake.depth.toFixed(1)} km</p>
                <p>
                  Koordinatlar: {earthquake.latitude.toFixed(4)}, {earthquake.longitude.toFixed(4)}
                </p>
                <p>Çözüm: {earthquake.solutionQuality}</p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function getColorByMagnitude(magnitude: number) {
  if (magnitude >= 3.0) return "#ef4444" // Red
  if (magnitude >= 2.5) return "#f97316" // Orange
  if (magnitude >= 2.0) return "#eab308" // Yellow
  return "#22c55e" // Green
}
