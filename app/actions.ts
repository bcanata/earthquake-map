"use server"

import { z } from "zod"
import { fallbackEarthquakeData } from "./data/fallback-data"

// Type for earthquake data
export type Earthquake = {
  date: string
  time: string
  latitude: number
  longitude: number
  depth: number
  magnitudeMD: number | null
  magnitudeML: number | null
  magnitudeMw: number | null
  location: string
  solutionQuality: string
  id: string // Unique identifier
}

// Schema for earthquake data validation
const EarthquakeSchema = z.object({
  date: z.string(),
  time: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  depth: z.number(),
  magnitudeMD: z.number().nullable(),
  magnitudeML: z.number().nullable(),
  magnitudeMw: z.number().nullable(),
  location: z.string(),
  solutionQuality: z.string(),
  id: z.string()
})

export type EarthquakeData = z.infer<typeof EarthquakeSchema>

/**
 * Fetches earthquake data directly from the KOERI website
 */
export async function fetchEarthquakeData(): Promise<Earthquake[]> {
  try {
    // Skip proxy and try direct fetch immediately
    return fetchDirectFromKoeri();
  } catch (error) {
    console.error("Error fetching earthquake data:", error);
    return useFallbackData();
  }
}

/**
 * Fetch directly from KOERI
 */
async function fetchDirectFromKoeri(): Promise<Earthquake[]> {
  try {
    console.log("Attempting direct fetch from KOERI...");
    
    // Fetch data directly from KOERI website
    const response = await fetch("http://www.koeri.boun.edu.tr/scripts/lst9.asp", {
      cache: "no-store", // Don't cache the response to get fresh data
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      console.warn(`Direct fetch failed with status: ${response.status}. Using fallback data...`);
      return useFallbackData();
    }
    
    const text = await response.text();
    console.log("Received response from KOERI. Content length:", text.length);
    
    // For debugging, log a small part of the response
    console.log("Response excerpt:", text.substring(0, 200));
    
    // Parse the data
    const earthquakes = parseEarthquakeData(text);
    
    // If no earthquakes could be parsed, use fallback data
    if (earthquakes.length === 0) {
      console.warn("No earthquakes parsed from direct fetch. Using fallback data...");
      return useFallbackData();
    }
    
    return earthquakes;
  } catch (error) {
    console.error("Error fetching earthquake data directly:", error);
    return useFallbackData();
  }
}

/**
 * Return fallback earthquake data when all fetch attempts fail
 */
function useFallbackData(): Earthquake[] {
  console.log("Using fallback earthquake data");
  return fallbackEarthquakeData;
}

/**
 * Parses earthquake data from the KOERI website text content
 */
function parseEarthquakeData(rawText: string): Earthquake[] {
  try {
    console.log("Starting to parse earthquake data...");
    
    // First, look for a line containing the date pattern YYYY.MM.DD
    const datePattern = /\d{4}\.\d{2}\.\d{2}/;
    const dateLine = rawText.split('\n').find(line => datePattern.test(line) && line.includes("-.-"));
    
    if (dateLine) {
      console.log("Found a line with earthquake data:", dateLine);
      
      // If we found a line with earthquake data format, extract all similar lines
      const earthquakeLines = rawText.split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => datePattern.test(line) && line.includes("-.-"));
      
      console.log(`Found ${earthquakeLines.length} potential earthquake data lines`);
      return parseEarthquakeLines(earthquakeLines.join('\n'));
    }
    
    // If we didn't find direct data lines, try the structured approach
    // Look for the table with earthquake data
    // This searches for the header line that appears above the earthquake data
    const headerText = "Tarih      Saat      Enlem(N)  Boylam(E) Derinlik(km)  MD   ML   Mw    Yer";
    const headerIndex = rawText.indexOf(headerText);
    
    if (headerIndex === -1) {
      // Try different header formats
      const alternateHeaders = [
        "Tarih",
        "Date",
        "TURKIYE VE YAKIN CEVRESINDEKI SON DEPREMLER",
        "TÜRKİYE VE YAKIN ÇEVRESİNDEKİ SON DEPREMLER"
      ];
      
      for (const headerText of alternateHeaders) {
        const index = rawText.indexOf(headerText);
        if (index !== -1) {
          console.log(`Found alternate header: "${headerText}" at position ${index}`);
          
          // Find the next occurrence of date pattern after this header
          const afterHeader = rawText.substring(index);
          const match = afterHeader.match(datePattern);
          
          if (match) {
            console.log(`Found date pattern ${match[0]} after header`);
            const startIndex = afterHeader.indexOf(match[0]) + index;
            
            // Extract all text from this point until the end of the document
            const dataSection = rawText.substring(startIndex);
            
            // Extract all lines with the date pattern
            const earthquakeLines = dataSection.split('\n')
              .filter(line => line.trim().length > 0)
              .filter(line => datePattern.test(line) && line.includes("-.-"));
            
            console.log(`Found ${earthquakeLines.length} potential earthquake data lines using date pattern`);
            
            if (earthquakeLines.length > 0) {
              return parseEarthquakeLines(earthquakeLines.join('\n'));
            }
          }
        }
      }
      
      console.error("Could not find earthquake data section in the response using any known pattern");
      return [];
    }
    
    // If we found the header, extract the data section
    // Find the separator line with dashes
    const separatorPattern = /[-]+/;
    const afterHeader = rawText.substring(headerIndex + headerText.length);
    const separatorMatch = afterHeader.match(separatorPattern);
    
    if (!separatorMatch) {
      console.error("Could not find separator after header");
      return [];
    }
    
    // Find the first line with data after the separator
    const separatorIndex = separatorMatch.index || 0;
    const afterSeparator = afterHeader.substring(separatorIndex + separatorMatch[0].length);
    
    // Extract all lines with the date pattern
    const earthquakeLines = afterSeparator.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => datePattern.test(line) && line.includes("-.-"));
    
    console.log(`Found ${earthquakeLines.length} potential earthquake data lines after header and separator`);
    
    if (earthquakeLines.length > 0) {
      return parseEarthquakeLines(earthquakeLines.join('\n'));
    }
    
    console.error("Could not extract earthquake data lines even after finding header");
    return [];
  } catch (error) {
    console.error("Error parsing earthquake data:", error);
    return [];
  }
}

/**
 * Parse individual earthquake data lines
 */
function parseEarthquakeLines(dataSection: string): Earthquake[] {
  const parsedData: Earthquake[] = []
  
  // Debug - print the data section start
  console.log("Data section start:", dataSection.substring(0, 200))
  
  // Split into lines and filter out empty lines
  const dataLines = dataSection
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
  
  // Debug - Count lines
  console.log(`Found ${dataLines.length} non-empty lines`)
  
  if (dataLines.length > 0) {
    // Debug - print first line
    console.log("First line:", dataLines[0])
  }
  
  dataLines.forEach(line => {
    try {
      // Most earthquake entries have the pattern YYYY.MM.DD HH:MM:SS at the start
      // Use this to identify valid earthquake data lines
      if (!/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}/.test(line)) {
        return // Skip lines that don't start with a date/time pattern
      }
      
      // Split by whitespace, but preserve data structure
      const parts = line.trim().split(/\s+/)
      
      if (parts.length < 10) {
        // Skip invalid lines
        console.warn(`Skipping invalid data line: ${line}`)
        return
      }
      
      // Extract date and time (first two columns)
      const date = parts[0]
      const time = parts[1]

      // Extract coordinates and depth (next three columns)
      const latitude = parseFloat(parts[2])
      const longitude = parseFloat(parts[3])
      const depth = parseFloat(parts[4])

      // Extract magnitudes (next three columns)
      const magnitudeMD = parts[5] === "-.-" ? null : parseFloat(parts[5])
      const magnitudeML = parts[6] === "-.-" ? null : parseFloat(parts[6])
      const magnitudeMw = parts[7] === "-.-" ? null : parseFloat(parts[7])

      // Find where the location starts and ends
      let locationStart = 8
      let locationEnd = parts.length - 1
      
      // Find the solution quality (usually the last column)
      const solutionQuality = parts[locationEnd].trim()
      
      // Check if the solution quality is a REVIZE entry with a timestamp
      let revisedTimestamp = null
      if (solutionQuality.startsWith("REVIZE") && parts[locationEnd - 1].startsWith("(")) {
        revisedTimestamp = parts[locationEnd - 1]
        locationEnd -= 2 // Adjust for the timestamp and parenthesis
      }
      
      // Extract location text (columns between magnitude and solution quality)
      const location = parts.slice(locationStart, locationEnd + 1).join(" ").trim()
      
      // Create a unique ID for this earthquake record
      const id = `${date}_${time}_${latitude}_${longitude}`
      
      parsedData.push({
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
      })
    } catch (error) {
      console.warn(`Error parsing line: ${line}`, error)
    }
  })
  
  console.log(`Successfully parsed ${parsedData.length} earthquake entries`)
  return parsedData
} 