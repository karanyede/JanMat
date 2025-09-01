# 🚀 JanMat Deployment Guide

## Prerequisites
- Your Supabase project URL and anon key
- Git repository (already done ✅)

## 🌟 Recommended: Deploy with Vercel

### Step 1: Prepare Environment Variables
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy your Project URL and anon/public key

### Step 2: Deploy to Vercel
1. Visit [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "New Project"
3. Import your GitHub repository: `prathamesh-korde/JanMat`
4. Configure environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

### Step 3: Configure Domain (Optional)
- Vercel provides a free `.vercel.app` domain
- You can add a custom domain in project settings

## 🔄 Alternative: Deploy with Netlify

### Option A: Git Integration
1. Visit [netlify.com](https://netlify.com)
2. Sign up and connect GitHub
3. Select your repository
4. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Site Settings

### Option B: Manual Deploy
```bash
npm run build
# Upload the 'dist' folder to Netlify
```

## 🚢 Alternative: Deploy with GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json scripts:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://prathamesh-korde.github.io/JanMat"
}
```

3. Deploy:
```bash
npm run deploy
```

## 🐳 Docker Deployment (Advanced)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📋 Environment Variables Needed

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## ✅ Post-Deployment Checklist

1. Test all major features:
   - User authentication
   - Issue reporting
   - Camera functionality
   - Map features
   - Analytics dashboard

2. Update CORS settings in Supabase:
   - Add your deployment URL to allowed origins

3. Test database connectivity

4. Verify all images and assets load correctly

## 🔧 Troubleshooting

### Build Errors
- Check environment variables are set correctly
- Ensure all dependencies are installed
- Verify TypeScript compilation

### Runtime Errors
- Check browser console for errors
- Verify Supabase connection
- Check network requests in DevTools

### Database Issues
- Verify RLS policies allow public access where needed
- Check Supabase logs
- Ensure database schema is properly set up

## 📞 Support

If you encounter issues, check:
1. Build logs on your deployment platform
2. Browser console errors
3. Supabase logs and monitoring
