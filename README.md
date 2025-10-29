# JanMat - Civic Engagement Platform

JanMat (meaning "Public Opinion" in Hindi) is a modern, Instagram-inspired civic engagement platform that empowers citizens to actively participate in local governance.

## 🌟 Features

### Core Functionality

- **Issue Reporting**: Citizens can report local issues with photos, location, and descriptions
- **Dynamic Feeds**: Instagram-style feeds for issues, news, and polls
- **Stories**: Ephemeral content sharing for community updates
- **User Profiles**: Public profiles with follow/follower system
- **Real-time Updates**: Live notifications and status updates
- **Role-based Access**: Different permissions for citizens and government users

### Issue Tracking

- GitHub-like workflow (Submitted → Under Review → In Progress → Resolved)
- Upvoting and commenting system
- Assignment to government departments
- Geographic location tracking

### Government Features

- News posting and management
- Poll creation and management
- Issue assignment and status updates
- Analytics and reporting
- Official response capabilities

## 🛠 Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Backend

- **Supabase** (PostgreSQL + Auth + Storage + Real-time)
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates

### External Services

- **Gemini AI** for chatbot assistance
- **Cloudinary** for image storage (optional)
- **Mapbox** for location services (optional)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd janmat-app
   npm install
   ```

2. **Environment Setup**
   Create `.env.local` file:

   ```bash
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
   VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
   ```

3. **Database Setup**
   Run SQL files in this order:

   ```bash
   # In Supabase SQL Editor:
   1. schema.sql          # Create tables and indexes
   2. rls_policies.sql    # Apply security rules
   3. functions.sql       # Database functions
   4. setup_storage.sql   # File storage buckets
   5. seed_data.sql       # Sample data (optional)
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## � User Guide

### For Citizens

1. **Create Account**: Sign up with "Citizen" role
2. **Report Issues**: Use the pink floating "+" button on dashboard
3. **Engage**: Vote on polls, follow users, share stories
4. **Track Progress**: Monitor your reported issues' status

### For Government Users

1. **Create Account**: Sign up and update role to "government" in database
2. **Manage Issues**: Update status, assign departments, respond officially
3. **Create Content**: Post news announcements and community polls
4. **Analytics**: Access government dashboard for insights

## 🗂 Project Structure

```
JanMat/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components
│   │   └── ...             # Feature components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configurations
│   ├── pages/              # Main application pages
│   └── types/              # TypeScript type definitions
│
├── supabase/
│   ├── schema.sql          # Database schema
│   ├── rls_policies_clean.pgsql  # Security policies
│   ├── functions.sql       # Database functions
│   └── setup_storage.sql   # Storage configuration
│
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## 🔒 Security Features

- **Authentication**: Supabase Auth with email verification
- **Authorization**: Role-based access control (citizen/government)
- **Row Level Security**: Database-level security policies
- **Data Validation**: Input sanitization and validation
- **File Upload Security**: Restricted file types and sizes

## 🐛 Troubleshooting

### Common Issues

**Build Errors**: Ensure all dependencies are installed with `npm install`

**Database Connection**: Verify Supabase URL and keys in `.env.local`

**Authentication Issues**: Check if email verification is enabled in Supabase

**Image Upload Problems**: Verify Cloudinary credentials or check Supabase storage setup

**API Errors**: Confirm Gemini API key is valid and has quota

### Development Tips

- Use browser DevTools to inspect network requests
- Check Supabase dashboard for real-time database changes
- Monitor console for client-side errors
- Use Supabase logs for backend debugging

## 🚢 Deployment

### Prerequisites

- Production Supabase project
- Production environment variables

### Steps

1. Build the application: `npm run build`
2. Deploy `dist/` folder to your hosting provider
3. Update environment variables for production
4. Run database migrations on production Supabase

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:

- Check the troubleshooting section above
- Review console errors and network logs
- Ensure all environment variables are correctly set
- Verify database setup is complete

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: October 2025

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd janmat-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**

   Run the SQL files in your Supabase SQL editor in this order:

   ```sql
   -- 1. Create the schema
   schema.sql

   -- 2. Set up Row Level Security
   rls_policies_clean.pgsql

   -- 3. Create database functions
   functions.sql

   -- 4. Set up storage buckets
   setup_storage.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 🧪 Testing

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

The project uses **Vitest** for unit and integration testing with React Testing Library:

```
src/test/
├── components/        # Component tests
├── lib/              # Utility function tests
├── setup.ts          # Test configuration
└── mocks.ts          # Mock data and utilities
```

### Writing Tests

Example component test:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### CI/CD

Automated testing runs on every push and pull request via GitHub Actions:

- ✅ Unit and integration tests
- ✅ TypeScript type checking
- ✅ Code coverage reports
- ✅ Build verification
- ✅ Security audits

See `.github/workflows/ci.yml` for the complete pipeline configuration.

## 📱 User Roles

### Citizens

- Report issues in their community
- View and upvote other issues
- Comment on issues
- Participate in polls
- Follow other users
- Create and view stories
- Access AI chatbot for government services

### Government Users

- Manage and assign issues
- Update issue status and provide resolutions
- Create and publish news articles
- Create community polls
- Access analytics dashboard
- Provide official responses

## 🗄 Database Schema

### Core Tables

- **users**: User profiles with role-based access
- **issues**: Community issues with full lifecycle tracking
- **comments**: Threaded discussions on issues
- **news**: Official government announcements
- **polls**: Community voting with real-time results
- **stories**: Ephemeral content sharing
- **notifications**: Real-time user notifications

### Key Features

- Row Level Security (RLS) for data protection
- Automatic timestamps and audit trails
- Array fields for relationships (followers, upvotes, etc.)
- JSON fields for flexible data structures
- Geographic coordinates for location-based features

## 🔒 Security

- **Row Level Security**: Database-level access control
- **Authentication**: Supabase Auth with OAuth support
- **Role-based Permissions**: Different access levels for citizens and government
- **Data Validation**: Input sanitization and validation
- **Audit Trails**: Complete history of data changes

## 🎨 Design System

### Colors

- **Primary**: Soft blues (#3b82f6, #2563eb)
- **Secondary**: Gentle grays (#6b7280, #9ca3af)
- **Success**: Green (#22c55e)
- **Warning**: Orange (#f59e0b)
- **Error**: Red (#ef4444)

### Typography

- **Font**: Inter (Google Fonts)
- **Hierarchy**: Clear heading levels with proper contrast
- **Responsive**: Scales appropriately across devices

### Layout

- **Mobile-first**: Optimized for mobile with desktop enhancements
- **Instagram-inspired**: Familiar social media patterns
- **Card-based**: Clean, contained content blocks
- **Responsive Navigation**: Bottom nav on mobile, top nav on desktop

## 📊 Features Roadmap

### Phase 1 (Current)

- ✅ User authentication and profiles
- ✅ Basic issue reporting and management
- ✅ Instagram-style feeds
- ✅ Stories functionality
- ✅ News and polls
- ✅ Basic notifications

### Phase 2 (Next)

- ✅ AI chatbot integration
- ✅ Advanced search and filtering
- ✅ Push notifications
- [ ] Offline functionality
- [ ] Mobile app (React Native)

### Phase 3 (Future)

- [ ] Advanced analytics dashboard
- [ ] Integration with government systems
- [ ] Multi-language support
- [ ] Advanced reporting tools
- [ ] API for third-party integrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern social media platforms
- Built with open-source technologies
- Designed for civic engagement and transparency
- Community-driven development approach

---

**JanMat** - Empowering citizens, strengthening democracy. 🏛️✨
