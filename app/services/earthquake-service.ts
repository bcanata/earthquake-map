import { Earthquake } from "@/app/actions";
import { fallbackEarthquakeData } from "@/app/data/fallback-data";

// Client-side service for fetching earthquake data
export async function fetchEarthquakeData(): Promise<Earthquake[]> {
  try {
    console.log("Client-side: Fetching earthquake data directly...");
    
    // Try to fetch directly from KOERI
    const response = await fetch("http://www.koeri.boun.edu.tr/scripts/lst9.asp", {
      method: "GET",
      cache: "no-store",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      console.warn(`Client-side: Direct fetch failed with status: ${response.status}`);
      
      // Try using our proxy API instead
      return fetchWithProxy();
    }
    
    // Parse the response
    const text = await response.text();
    console.log("Client-side: Received response. Content length:", text.length);
    
    // Parse the raw text to extract earthquake data
    const earthquakes = parseEarthquakeData(text);
    
    if (earthquakes.length === 0) {
      console.warn("Client-side: No earthquakes parsed from direct response");
      return fetchWithProxy();
    }
    
    return earthquakes;
  } catch (error) {
    console.error("Client-side: Error fetching earthquake data directly:", error);
    return fetchWithProxy();
  }
}

// Try fetching via proxy
async function fetchWithProxy(): Promise<Earthquake[]> {
  try {
    console.log("Client-side: Trying to fetch with local proxy...");
    
    // Try our proxy API
    const response = await fetch("/api/proxy", {
      method: "GET",
      cache: "no-store"
    });
    
    if (!response.ok) {
      console.warn(`Client-side: Local proxy fetch failed with status: ${response.status}`);
      return fetchWithPublicProxy();
    }
    
    const text = await response.text();
    console.log("Client-side: Received proxy response. Content length:", text.length);
    
    // Parse the raw text to extract earthquake data
    const earthquakes = parseEarthquakeData(text);
    
    if (earthquakes.length === 0) {
      console.warn("Client-side: No earthquakes parsed from proxy response");
      return fetchWithPublicProxy();
    }
    
    return earthquakes;
  } catch (error) {
    console.error("Client-side: Error fetching with local proxy:", error);
    return fetchWithPublicProxy();
  }
}

// Try fetching via a public CORS proxy as a last resort
async function fetchWithPublicProxy(): Promise<Earthquake[]> {
  try {
    console.log("Client-side: Trying to fetch with public CORS proxy...");
    
    // Use a public CORS proxy 
    const targetUrl = encodeURIComponent("http://www.koeri.boun.edu.tr/scripts/lst9.asp");
    const corsProxyUrl = `https://corsproxy.io/?${targetUrl}`;
    
    const response = await fetch(corsProxyUrl, {
      method: "GET",
      cache: "no-store"
    });
    
    if (!response.ok) {
      console.warn(`Client-side: Public proxy fetch failed with status: ${response.status}`);
      return fallbackEarthquakeData;
    }
    
    const text = await response.text();
    console.log("Client-side: Received public proxy response. Content length:", text.length);
    
    // Parse the raw text to extract earthquake data
    const earthquakes = parseEarthquakeData(text);
    
    if (earthquakes.length === 0) {
      console.warn("Client-side: No earthquakes parsed from public proxy response");
      return fallbackEarthquakeData;
    }
    
    return earthquakes;
  } catch (error) {
    console.error("Client-side: Error fetching with public proxy:", error);
    return fallbackEarthquakeData;
  }
}

// Parse earthquake data from raw text
function parseEarthquakeData(rawText: string): Earthquake[] {
  try {
    console.log("Client-side: Parsing earthquake data...");
    
    // Look for lines matching the date pattern YYYY.MM.DD
    const datePattern = /\d{4}\.\d{2}\.\d{2}/;
    
    // Split the text into lines and find those with earthquake data
    const lines = rawText.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => datePattern.test(line) && line.includes("-.-"));
    
    console.log(`Client-side: Found ${lines.length} potential earthquake data lines`);
    
    if (lines.length === 0) {
      return [];
    }
    
    // Parse each line into an earthquake object
    const earthquakes: Earthquake[] = [];
    
    lines.forEach(line => {
      try {
        // Split by whitespace
        const parts = line.trim().split(/\s+/);
        
        if (parts.length < 10) {
          console.warn(`Client-side: Skipping invalid line: ${line}`);
          return;
        }
        
        // Extract date and time
        const date = parts[0];
        const time = parts[1];
        
        // Extract coordinates and depth
        const latitude = parseFloat(parts[2]);
        const longitude = parseFloat(parts[3]);
        const depth = parseFloat(parts[4]);
        
        // Extract magnitudes
        const magnitudeMD = parts[5] === "-.-" ? null : parseFloat(parts[5]);
        const magnitudeML = parts[6] === "-.-" ? null : parseFloat(parts[6]);
        const magnitudeMw = parts[7] === "-.-" ? null : parseFloat(parts[7]);
        
        // Find the end of the line, which should be the solution quality
        const solutionQuality = parts[parts.length - 1].trim();
        
        // Extract location (everything between magnitudes and solution quality)
        let locationStart = 8;
        let locationEnd = parts.length - 2;
        
        // Adjust if REVIZE with timestamp
        if (solutionQuality.startsWith("REVIZE") && parts[parts.length - 2].startsWith("(")) {
          locationEnd -= 1;
        }
        
        const location = parts.slice(locationStart, locationEnd + 1).join(" ").trim();
        
        // Create unique ID
        const id = `${date}_${time}_${latitude}_${longitude}`;
        
        earthquakes.push({
          date,
          time,
          latitude,
          longitude,
          depth,
          magnitudeMD,
          magnitudeML,
          magnitudeMw,
          location,
          solutionQuality,
          id
        });
      } catch (error) {
        console.warn(`Client-side: Error parsing line: ${line}`, error);
      }
    });
    
    console.log(`Client-side: Successfully parsed ${earthquakes.length} earthquakes`);
    return earthquakes;
  } catch (error) {
    console.error("Client-side: Error parsing earthquake data:", error);
    return [];
  }
} 