# OptimalAssign

**Mathematically optimal labor scheduling**

A modern web application that helps businesses create optimal employee schedules using advanced optimization algorithms. OptimalAssign takes the guesswork out of workforce management by automatically generating schedules that balance labor costs, employee availability, and business constraints.

## Try It Now

**Production URL:** [https://labor-management-web.vercel.app/](https://labor-management-web.vercel.app/)

Visit the live application to start optimizing your workforce scheduling today!

## Features

### Core Functionality
- **Schedule Management** - Create, view, and manage employee schedules with an intuitive calendar interface
- **Sales Forecasting** - Predict labor demand based on historical sales data and trends
- **Constraint Rules** - Define business rules and employee preferences that the optimizer respects
- **Employee Management** - Manage your workforce with detailed employee profiles and availability tracking
- **Multi-Business Support** - Handle multiple business locations from a single account

### Optimization Engine
- Mathematical optimization algorithms for schedule generation
- Automatically balances staffing levels with predicted demand
- Respects employee availability, labor laws, and business constraints
- Minimizes labor costs while maintaining service quality

### User Experience
- Clean, modern interface built with React and Tailwind CSS
- Week-by-week schedule navigation
- Real-time schedule updates
- Mobile-responsive design
- Dark mode support

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Additional Libraries
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd labor-management-web

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (buttons, inputs, etc.)
│   └── optimization/ # Optimization workflow components
├── contexts/        # React context providers
├── pages/           # Page-level components
├── config/          # Configuration files
└── main.tsx         # Application entry point
```

## Development

The application uses feature flags to control which features are available in production vs development:

- **Production Mode** - Shows only backend-integrated, production-ready features
- **Development Mode** - Includes experimental features and development tools

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For questions or support, please contact the development team.

---

**Start optimizing your workforce today:** [https://labor-management-web.vercel.app/](https://labor-management-web.vercel.app/)