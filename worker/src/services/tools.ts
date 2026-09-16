
export async function getWeather(city: string, apiKey: string) {
  if (!apiKey) return "Weather API Key missing.";
  
  try {
    const geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    const geoData: any = await geoRes.json();
    
    if (!geoData || geoData.length === 0) return `Could not find location: ${city}`;
    
    const { lat, lon } = geoData[0];
    
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    const weather: any = await weatherRes.json();
    
    return `The weather in ${city} is ${weather.weather[0].description} with a temperature of ${Math.round(weather.main.temp)}°C.`;
  } catch (e) {
    console.error("Weather Error:", e);
    return "I couldn't check the weather right now.";
  }
}

export async function searchWeb(query: string, apiKey: string) {
  if (!apiKey) return "Search API Key missing.";
  
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        max_results: 1
      })
    });
    
    const data: any = await response.json();
    return data.answer || data.results?.[0]?.content || "I couldn't find an answer.";
  } catch (e) {
    console.error("Search Error:", e);
    return "I couldn't search the web right now.";
  }
}

export async function searchYouTube(query: string, apiKey: string, maxResults: number = 1) {
  if (!apiKey) return "YouTube API Key missing.";

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`);
    const data: any = await response.json();

    if (!data.items || data.items.length === 0) return "I couldn't find any videos.";

    // Return single object for backward compat when maxResults=1
    if (maxResults === 1) {
      const video = data.items[0];
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      return JSON.stringify({
        videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }

    // Return array for multiple results
    const videos = data.items.map((video: any) => ({
      videoId: video.id.videoId,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`
    }));
    return JSON.stringify(videos);
  } catch (e) {
    console.error("YouTube Error:", e);
    return "I couldn't search YouTube right now.";
  }
}

export async function getNews() {
  // Use a reliable RSS to JSON service or parse manually if possible. 
  // Ideally, use a simple public RSS feed.
  // Here we use a robust public RSS feed (e.g., BBC World News or potentially an Indian source like Times of India)
  // For simplicity and reliability in edge workers, fetching raw XML and doing a basic regex/string parse is often safest/lightest.
  // Or fetch from a CORS-friendly RSS-to-JSON proxy if available.

  const RSS_URL = "https://timesofindia.indiatimes.com/rssfeedstopstories.cms";

  try {
    const response = await fetch(RSS_URL);
    const xmlText = await response.text();
    
    // Simple regex to extract titles (Production ideal: Use an XML parser library)
    const items = xmlText.match(/<title>(.*?)<\/title>/g) || [];
    
    // Slice first 5 items (Headlines)
    // Remove CDATA and tags
    const headlines = items
      .slice(2, 7) // Skip channel title/image title
      .map(item => item.replace(/<\/?title>|<!\[CDATA\[|\]\]>/g, '').trim())
      .filter(h => h.length > 10); // Filter out short garbage

    return `Here are the top headlines: \n- ${headlines.join('\n- ')}`;

  } catch (e) {
    console.error("News Error:", e);
    return "I couldn't fetch the latest news at the moment.";
  }
}
