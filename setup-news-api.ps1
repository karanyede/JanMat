# JanMat News API Quick Setup Script for Windows
Write-Host "🚀 Setting up JanMat Real-Time News Integration..." -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .env file already exists" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🔑 API Key Setup:" -ForegroundColor Cyan
Write-Host "1. Visit: https://gnews.io/register"
Write-Host "2. Sign up for FREE (no credit card required)"
Write-Host "3. Get your API key (100 requests/day free)"
Write-Host "4. Add to .env file: VITE_GNEWS_API_KEY=your-key-here"
Write-Host ""

Write-Host "🎯 Features you'll get:" -ForegroundColor Magenta
Write-Host "✨ Real-time news from 60,000+ sources"
Write-Host "🇮🇳 India-focused government news"
Write-Host "⚡ Emergency alerts and breaking news"
Write-Host "🏛️ Policy updates and announcements"
Write-Host "📱 Mobile-friendly news interface"
Write-Host ""

Write-Host "🚀 To start development:" -ForegroundColor Yellow
Write-Host "npm run dev"
Write-Host ""

Write-Host "📖 Read NEWS_API_SETUP.md for detailed instructions" -ForegroundColor Blue
Write-Host "🎉 Setup complete! Happy coding!" -ForegroundColor Green

# Open the browser to the API signup page
$choice = Read-Host "Would you like to open the GNews API registration page now? (y/N)"
if ($choice -eq 'y' -or $choice -eq 'Y') {
    Start-Process "https://gnews.io/register"
}
