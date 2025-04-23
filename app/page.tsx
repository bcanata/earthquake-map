"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Earthquake } from "@/app/actions"
import { fetchEarthquakeData } from "@/app/services/earthquake-service" // Import client-side service
import { LoadingState } from "@/components/ui/loading-spinner"
import { RefreshButton } from "@/components/ui/refresh-button"
import { Info, AlertTriangle, ExternalLink } from "lucide-react"
import Link from "next/link"

// Import Map component dynamically to avoid SSR issues with Leaflet
const EarthquakeMap = dynamic(() => import("@/components/earthquake-map"), {
  ssr: false,
  loading: () => <LoadingState text="Harita yükleniyor..." />,
})

export default function Home() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"live" | "fallback">("live")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(60)
  const AUTO_REFRESH_INTERVAL = 60 // seconds

  // Function to fetch earthquake data
  const getEarthquakeData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCountdown(AUTO_REFRESH_INTERVAL)
    
    try {
      const data = await fetchEarthquakeData()
      
      // Check if we're using fallback data (by checking for the specific date format)
      const isFallbackData = data.length > 0 && data[0].date.startsWith("2023.05.01")
      setDataSource(isFallbackData ? "fallback" : "live")
      
      setEarthquakes(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching earthquake data:", err)
      setError("Deprem verilerini yüklerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch data on initial load
  useEffect(() => {
    getEarthquakeData()
  }, [getEarthquakeData])

  // Set up auto-refresh
  useEffect(() => {
    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown(prevCount => {
        // When countdown reaches 0, trigger a refresh
        if (prevCount <= 1) {
          getEarthquakeData()
          return AUTO_REFRESH_INTERVAL
        }
        return prevCount - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [getEarthquakeData])

  // Format the last updated time
  const formattedUpdateTime = lastUpdated
    ? lastUpdated.toLocaleTimeString() + ", " + lastUpdated.toLocaleDateString()
    : "—"

  // Format countdown for display
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Türkiye'deki Son Depremler</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Otomatik yenileme: <span className="font-medium">{formatCountdown(countdown)}</span>
          </div>
          <RefreshButton onClick={getEarthquakeData} isLoading={loading} />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 text-sm text-muted-foreground">
        {dataSource === "fallback" && (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-800 rounded-md">
            <Info className="h-4 w-4" />
            <span>Örnek veri kullanılıyor (canlı veri kaynağına bağlanılamadı)</span>
          </div>
        )}
      </div>

      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
          <p>
            Bu uygulama <Link href="http://www.koeri.boun.edu.tr/scripts/lst5.asp" target="_blank" className="text-blue-600 hover:text-blue-800 underline inline-flex items-center">
              Boğaziçi Üniversitesi Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü (KRDAE) 
              <ExternalLink className="h-3 w-3 ml-0.5" />
            </Link> 
            tarafından sağlanan verileri kullanmaktadır. 
            Tüm deprem verilerinin telif hakları Boğaziçi Üniversitesi Rektörlüğü'ne aittir. 
            Bu veri bilimsel ve bilgilendirme amaçlı kullanılabilir ancak ticari amaçla kullanılamaz.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deprem Haritası</CardTitle>
            <CardDescription>Türkiye ve çevresindeki son depremlerin konumlarını gösteren harita</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[500px]">
            <div className="h-[500px] w-full rounded-md overflow-hidden border">
              {loading ? (
                <LoadingState text="Deprem verileri yükleniyor..." />
              ) : (
                <EarthquakeMap earthquakes={earthquakes} />
              )}
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Son güncelleme: {formattedUpdateTime}
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Deprem Verileri</CardTitle>
              <CardDescription className="mt-1">
                Kronolojik sırayla {earthquakes.length} adet deprem listelendi
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <span className="inline-block w-3 h-3 rounded-full bg-red-600"></span> 
                <span>ML ≥ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <span className="inline-block w-3 h-3 rounded-full bg-orange-600"></span> 
                <span>ML ≥ 3.0</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-600"></span> 
                <span>ML ≥ 2.0</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState text="Deprem verileri yükleniyor..." />
            ) : earthquakes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Deprem verisi bulunamadı</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Saat</TableHead>
                      <TableHead>Enlem</TableHead>
                      <TableHead>Boylam</TableHead>
                      <TableHead>Derinlik (km)</TableHead>
                      <TableHead>Büyüklük (ML)</TableHead>
                      <TableHead>Yer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earthquakes.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell>{eq.date}</TableCell>
                        <TableCell>{eq.time}</TableCell>
                        <TableCell>{eq.latitude.toFixed(4)}</TableCell>
                        <TableCell>{eq.longitude.toFixed(4)}</TableCell>
                        <TableCell>{eq.depth.toFixed(1)}</TableCell>
                        <TableCell className={getMagnitudeClass(eq.magnitudeML)}>
                          {eq.magnitudeML ? eq.magnitudeML.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell>{eq.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Son güncelleme: {formattedUpdateTime}
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

function getMagnitudeClass(magnitude: number | null) {
  if (!magnitude) return ""

  if (magnitude >= 5.0) return "text-red-600 font-bold"
  if (magnitude >= 3.0) return "text-orange-600 font-semibold"
  if (magnitude >= 2.0) return "text-yellow-600"
  return "text-green-600"
}
