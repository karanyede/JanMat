// GNews API integration for real-time news
// Free tier: 100 requests/day, 1 req/sec, up to 10 articles per request

export interface ExternalNewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
    country: string;
  };
  language: string;
}

export interface GNewsResponse {
  totalArticles: number;
  articles: Array<{
    id: string;
    title: string;
    description: string;
    content: string;
    url: string;
    image: string | null;
    publishedAt: string;
    source: {
      id: string;
      name: string;
      url: string;
      country: string;
    };
    lang: string;
  }>;
}

class NewsAPIService {
  private readonly baseURL = 'https://gnews.io/api/v4';
  private readonly apiKey: string;

  constructor() {
    // For development - you'll need to get a free API key from https://gnews.io/
    // In production, this should be stored securely as an environment variable
    this.apiKey = import.meta.env.VITE_GNEWS_API_KEY || 'demo-api-key';
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add API key and common parameters
    url.searchParams.append('apikey', this.apiKey);
    url.searchParams.append('lang', 'en');
    
    // Add custom parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('API quota exceeded. Please try again later.');
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('News API request failed:', error);
      throw error;
    }
  }

  // Get top headlines (general news)
  async getTopHeadlines(options: {
    country?: string;
    category?: string;
    query?: string;
    max?: number;
  } = {}): Promise<ExternalNewsArticle[]> {
    const params: Record<string, string> = {
      max: (options.max || 10).toString(),
    };

    if (options.country) params.country = options.country;
    if (options.category) params.category = options.category;
    if (options.query) params.q = options.query;

    const response: GNewsResponse = await this.makeRequest('/top-headlines', params);
    return this.transformArticles(response.articles || []);
  }

  // Search for specific news
  async searchNews(options: {
    query: string;
    country?: string;
    from?: string;
    to?: string;
    sortBy?: 'publishedAt' | 'relevance';
    max?: number;
  }): Promise<ExternalNewsArticle[]> {
    const params: Record<string, string> = {
      q: options.query,
      max: (options.max || 10).toString(),
      sortby: options.sortBy || 'publishedAt',
    };

    if (options.country) params.country = options.country;
    if (options.from) params.from = options.from;
    if (options.to) params.to = options.to;

    const response: GNewsResponse = await this.makeRequest('/search', params);
    return this.transformArticles(response.articles || []);
  }

  // Get India-specific news
  async getIndiaNews(category?: string): Promise<ExternalNewsArticle[]> {
    return this.getTopHeadlines({
      country: 'in',
      category,
      max: 10
    });
  }

  // Get government/policy related news
  async getGovernmentNews(): Promise<ExternalNewsArticle[]> {
    return this.searchNews({
      query: 'government OR policy OR "public sector" OR ministry OR administration',
      country: 'in',
      max: 10
    });
  }

  // Get local city news (generic approach)
  async getCityNews(cityName: string): Promise<ExternalNewsArticle[]> {
    return this.searchNews({
      query: `${cityName} AND (municipal OR corporation OR city OR metro)`,
      country: 'in',
      max: 5
    });
  }

  // Get emergency/urgent news
  async getEmergencyNews(): Promise<ExternalNewsArticle[]> {
    return this.searchNews({
      query: 'emergency OR urgent OR alert OR disaster OR flood OR earthquake',
      country: 'in',
      sortBy: 'publishedAt',
      max: 5
    });
  }

  private transformArticles(articles: GNewsResponse['articles']): ExternalNewsArticle[] {
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      image: article.image,
      publishedAt: article.publishedAt,
      source: {
        name: article.source.name,
        url: article.source.url,
        country: article.source.country
      },
      language: article.lang
    }));
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return this.apiKey !== 'demo-api-key' && this.apiKey !== '';
  }

  // Get demo data when API is not configured
  getDemoNews(): ExternalNewsArticle[] {
    return [
      {
        id: 'demo-1',
        title: 'Breaking: Major Infrastructure Development Announced',
        description: 'Government announces massive infrastructure development project to boost economic growth and create employment opportunities.',
        content: 'The government has announced a comprehensive infrastructure development plan worth ₹5 lakh crore to boost economic growth and create millions of employment opportunities across the country...',
        url: 'https://example.com/news/infrastructure-development',
        image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source: {
          name: 'Economic Times',
          url: 'https://economictimes.com',
          country: 'in'
        },
        language: 'en'
      },
      {
        id: 'demo-2',
        title: 'New Digital Initiative Launched for Better Governance',
        description: 'Digital India initiative expands with new e-governance services to improve citizen experience and reduce bureaucracy.',
        content: 'The Digital India initiative has been expanded with the launch of new e-governance services aimed at improving citizen experience and reducing bureaucratic processes...',
        url: 'https://example.com/news/digital-governance',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        source: {
          name: 'The Hindu',
          url: 'https://thehindu.com',
          country: 'in'
        },
        language: 'en'
      },
      {
        id: 'demo-3',
        title: 'Emergency Preparedness Measures Enhanced Across States',
        description: 'Central government strengthens emergency response systems to better handle natural disasters and crisis situations.',
        content: 'The central government has announced enhanced emergency preparedness measures across all states to better handle natural disasters and crisis situations...',
        url: 'https://example.com/news/emergency-preparedness',
        image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        source: {
          name: 'India Today',
          url: 'https://indiatoday.in',
          country: 'in'
        },
        language: 'en'
      }
    ];
  }
}

export const newsAPI = new NewsAPIService();
export default NewsAPIService;
