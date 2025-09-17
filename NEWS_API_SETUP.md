# 📰 Real-Time News Integration in JanMat

This guide explains how to set up and use the real-time news feature in JanMat using the GNews API.

## 🌟 Features

- **Real-time News**: Live news updates from 60,000+ sources worldwide
- **India-focused**: Specifically filtered for Indian news and government updates
- **Category-based**: News organized by type (Government, Emergency, General)
- **Free Tier**: 100 requests per day with no credit card required
- **Demo Mode**: Works without API key using sample data

## 🚀 Quick Setup

### 1. Get Your Free API Key

1. Visit [GNews.io](https://gnews.io/register)
2. Sign up for a free account
3. Get your API key (100 requests/day free)

### 2. Configure Your Environment

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your API key to `.env`:
   ```bash
   VITE_GNEWS_API_KEY=your-actual-api-key-here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## 📋 News Categories Available

### 🏛️ JanMat News (Internal)
- **Announcements**: Government announcements
- **Policies**: Policy updates and changes
- **Development**: Infrastructure projects
- **Emergency**: Urgent alerts
- **Events**: Government events and programs

### 🌐 Live News (External via GNews API)
- **India Headlines**: Top news from India
- **Government News**: Policy and government-related news
- **Emergency News**: Urgent and breaking news
- **Local News**: City and state-specific updates

## 🎯 API Endpoints Used

### GNews API Endpoints:
- **Top Headlines**: `/top-headlines` - Latest news from India
- **Search**: `/search` - Filtered government and emergency news
- **Categories**: News filtered by topic and location

### Sample API Calls:
```javascript
// India-specific news
newsAPI.getIndiaNews()

// Government-related news
newsAPI.getGovernmentNews()

// Emergency news
newsAPI.getEmergencyNews()

// City-specific news
newsAPI.getCityNews("Mumbai")
```

## 🔧 Technical Implementation

### News API Service (`src/lib/newsAPI.ts`)
- Handles all external API communication
- Implements rate limiting and error handling
- Provides demo data when API is not configured
- Transforms external news format to internal format

### Key Features:
- **Rate Limiting**: Respects 100 requests/day limit
- **Error Handling**: Graceful fallback to demo data
- **Caching**: Prevents unnecessary API calls
- **Type Safety**: Full TypeScript support

## 📊 Usage Statistics

### Free Tier Limits:
- **100 requests/day**
- **1 request/second**
- **Up to 10 articles per request**
- **Real-time updates**
- **No credit card required**

### Optimizations Implemented:
- Batch multiple news types in single session
- Cache results to minimize API calls
- Intelligent refresh intervals
- Demo mode for development

## 🎨 UI Features

### Live News Indicators:
- 🔴 **LIVE** badge for real-time news
- 🟢 **Connected** indicator when API is active
- 🔴 **Offline** indicator when API is not configured
- Country flags for news sources

### Interactive Elements:
- **Category Filtering**: Switch between JanMat and Live news
- **Grid/List Views**: Different layout options
- **Share Functionality**: Native sharing with fallback to clipboard
- **External Links**: Direct links to full articles

## 🛠️ Development Mode

When API key is not configured:
- Shows demo news data
- Displays "API Not Configured" message
- Provides link to get free API key
- Allows testing of UI without API limits

## 🔒 Security & Privacy

- API key stored in environment variables
- No user data sent to external APIs
- Secure HTTPS connections only
- Rate limiting prevents abuse

## 📈 Monitoring & Analytics

### Built-in Tracking:
- API connection status
- Request count (to avoid limits)
- Error rates and fallback usage
- User engagement with news types

## 🚨 Error Handling

The system handles various error scenarios:
- **API Quota Exceeded**: Falls back to demo data
- **Network Issues**: Shows cached data if available
- **Invalid API Key**: Displays configuration instructions
- **Rate Limiting**: Implements intelligent retry logic

## 🔄 Refresh Strategy

- **Manual Refresh**: User-triggered refresh button
- **Auto-refresh**: Periodic updates (respecting rate limits)
- **Smart Timing**: More frequent updates for emergency news
- **Background Sync**: Updates when user returns to app

## 🎯 Best Practices

1. **API Key Management**: Store in environment variables only
2. **Rate Limiting**: Respect the 100/day limit
3. **Error Handling**: Always provide fallback content
4. **User Experience**: Show loading states and connection status
5. **Performance**: Cache responses and minimize requests

## 📞 Support & Resources

- **GNews API Docs**: [docs.gnews.io](https://docs.gnews.io/)
- **Free API Key**: [gnews.io/register](https://gnews.io/register)
- **Support**: Contact GNews support for API issues
- **JanMat Issues**: Use GitHub issues for integration problems

---

**Note**: The free tier provides 100 requests/day which is sufficient for most development and small-scale production use. For higher usage, paid plans are available with more requests and additional features.
