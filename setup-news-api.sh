#!/bin/bash

# JanMat News API Quick Setup Script
echo "🚀 Setting up JanMat Real-Time News Integration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created!"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🔑 API Key Setup:"
echo "1. Visit: https://gnews.io/register"
echo "2. Sign up for FREE (no credit card required)"
echo "3. Get your API key (100 requests/day free)"
echo "4. Add to .env file: VITE_GNEWS_API_KEY=your-key-here"
echo ""

echo "🎯 Features you'll get:"
echo "✨ Real-time news from 60,000+ sources"
echo "🇮🇳 India-focused government news"
echo "⚡ Emergency alerts and breaking news"
echo "🏛️ Policy updates and announcements"
echo "📱 Mobile-friendly news interface"
echo ""

echo "🚀 To start development:"
echo "npm run dev"
echo ""

echo "📖 Read NEWS_API_SETUP.md for detailed instructions"
echo "🎉 Setup complete! Happy coding!"
