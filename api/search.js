const SEARCH_PROVIDERS = {
  brave: "brave",
  jina: "jina",
  fallback: "fallback"
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  res.end(JSON.stringify(body));
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function compactResults(results) {
  const seen = new Set();

  return results
    .filter((result) => result.title && result.url)
    .filter((result) => {
      const key = result.url.replace(/\/$/, "");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

async function searchBrave(query) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) {
    return null;
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key
    }
  });

  if (!response.ok) {
    throw new Error(`Brave Search failed with ${response.status}`);
  }

  const data = await response.json();
  const results = (data.web?.results || []).map((item) => ({
    title: cleanText(item.title),
    url: item.url,
    snippet: cleanText(item.description),
    source: hostOf(item.url)
  }));

  return {
    provider: SEARCH_PROVIDERS.brave,
    results: compactResults(results)
  };
}

async function searchJina(query) {
  const key = process.env.JINA_API_KEY;
  if (!key) {
    return null;
  }

  const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    throw new Error(`Jina Search failed with ${response.status}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.data) ? data.data : [];
  const results = items.map((item) => ({
    title: cleanText(item.title),
    url: item.url,
    snippet: cleanText(item.description || item.content),
    source: hostOf(item.url)
  }));

  return {
    provider: SEARCH_PROVIDERS.jina,
    results: compactResults(results)
  };
}

async function searchWikipedia(query) {
  const url = new URL("https://de.wikipedia.org/w/api.php");
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const [, titles = [], descriptions = [], links = []] = await response.json();
  return titles.map((title, index) => ({
    title: cleanText(title),
    url: links[index],
    snippet: cleanText(descriptions[index] || "Wikipedia Ergebnis"),
    source: "wikipedia.org"
  }));
}

async function searchHackerNews(query) {
  const url = new URL("https://hn.algolia.com/api/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("tags", "story");
  url.searchParams.set("hitsPerPage", "4");

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.hits || []).map((item) => {
    const url = item.url || `https://news.ycombinator.com/item?id=${item.objectID}`;
    return {
      title: cleanText(item.title || item.story_title),
      url,
      snippet: cleanText(`${item.points || 0} Punkte auf Hacker News`),
      source: hostOf(url) || "news.ycombinator.com"
    };
  });
}

function directSearchLinks(query) {
  const encoded = encodeURIComponent(query);
  return [
    {
      title: `Websuche nach "${query}"`,
      url: `https://www.google.com/search?q=${encoded}`,
      snippet: "Direkt im Web weitersuchen.",
      source: "google.com"
    },
    {
      title: `YouTube nach "${query}" durchsuchen`,
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      snippet: "Videos und Kanaele finden.",
      source: "youtube.com"
    }
  ];
}

async function fallbackSearch(query) {
  const [wiki, hn] = await Promise.all([searchWikipedia(query), searchHackerNews(query)]);
  return {
    provider: SEARCH_PROVIDERS.fallback,
    results: compactResults([...wiki, ...hn, ...directSearchLinks(query)])
  };
}

module.exports = async function handler(req, res) {
  const query = String(req.query?.q || "").trim();

  if (!query) {
    sendJson(res, 400, { error: "Missing query" });
    return;
  }

  try {
    const webResults = (await searchBrave(query)) || (await searchJina(query));
    const payload = webResults && webResults.results.length ? webResults : await fallbackSearch(query);

    sendJson(res, 200, {
      query,
      provider: payload.provider,
      results: payload.results
    });
  } catch (error) {
    const payload = await fallbackSearch(query);
    sendJson(res, 200, {
      query,
      provider: payload.provider,
      warning: error.message,
      results: payload.results
    });
  }
};
