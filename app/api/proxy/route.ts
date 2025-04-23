import { NextResponse } from 'next/server';

// API endpoint for proxying requests to the KOERI website
export async function GET() {
  console.log("Proxy API: Handling GET request");
  
  try {
    console.log("Proxy API: Fetching data from KOERI website...");
    
    // Fetch data from KOERI website
    const response = await fetch('http://www.koeri.boun.edu.tr/scripts/lst9.asp', {
      cache: 'no-store', // Don't cache the response
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.error(`Proxy API: Failed to fetch from KOERI: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch from KOERI: ${response.status} ${response.statusText}`);
    }

    // Get the raw text
    const text = await response.text();
    console.log(`Proxy API: Successfully received data, length: ${text.length} characters`);
    
    // Confirm the data contains earthquake information
    const hasEarthquakeData = text.includes(".2025.") || text.includes(".2024.") || 
                             text.includes(".2023.") || text.includes("-.-");
    
    if (!hasEarthquakeData) {
      console.warn("Proxy API: Response doesn't appear to contain earthquake data");
      console.log("Proxy API: First 200 chars:", text.substring(0, 200));
    } else {
      console.log("Proxy API: Response contains earthquake data markers");
    }

    // Return the response with appropriate CORS headers
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Proxy API: Error proxying KOERI data:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch earthquake data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 