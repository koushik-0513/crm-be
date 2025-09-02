# CRM Backend API

A comprehensive backend API for a Customer Relationship Management (CRM) system with role-based authentication and real-time notifications.

## Features

- **Role-Based Authentication**: Admin, User, and Individual roles with team management
- **Team Management**: Create teams, invite members, manage permissions
- **Real-time Notifications**: Push notifications, email alerts, and in-app messaging
- **Contact Management**: CRUD operations for contacts with tagging system
- **Activity Logging**: Track all user actions and system events
- **AI Integration**: OpenAI, Mistral, and Google AI support
- **Search & Analytics**: Vector search and dashboard statistics
- **SMS Integration**: Send messages via SMS service

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK
- **Real-time**: Socket.IO
- **Validation**: Zod schema validation
- **AI**: Multiple AI provider integrations

## Project Structure

```
crm-be/
├── controllers/           # Business logic controllers
│   ├── auth-controller/   # Authentication & role management
│   ├── contact-controller/ # Contact CRUD operations
│   ├── notification-controller/ # Notification management
│   ├── team-controller/   # Team management
│   └── ...               # Other controllers
├── models/               # Database models
│   ├── user-Model.ts     # User with role-based fields
│   ├── team-Model.ts     # Team/organization model
│   ├── notification-Model.ts # Notification system
│   └── ...               # Other models
├── routes/               # API route definitions
├── middlewares/          # Authentication & authorization
├── utils/                # Utility functions
├── types.ts              # TypeScript type definitions
└── index.ts              # Main server entry point
```

## API Endpoints

### Authentication
- `POST /api/verify-token` - Verify Firebase token
- `POST /api/auth/register` - Register new user
- `POST /api/auth/update-role` - Update user role and team

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/send` - Send notification
- `PATCH /api/notifications/:id/read` - Mark as read
- `GET /api/users` - Get users for notifications

### Team Management
- `GET /api/team` - Get team information

### Contacts, Tags, Activities
- Full CRUD operations for CRM data
- Search and analytics endpoints
- AI-powered features

## Role-Based Access Control

### Admin Role
- Create and manage teams
- Invite team members
- Send admin notifications
- Access all team data
- Manage team settings

### User Role
- Join existing teams
- Access team data
- Send notifications to team members
- Limited administrative actions

### Individual Role
- Personal use only
- No team access
- Isolated data
- Basic CRM features

## Environment Variables

Create a `.env` file with:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/crm
OPENAI_API_KEY=your_openai_key
MISTRAL_API_KEY=your_mistral_key
GOOGLE_AI_API_KEY=your_google_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Database Models

### User Model
- Firebase UID integration
- Role-based permissions
- Team associations
- Profile information

### Team Model
- Organization management
- Member management
- Settings and preferences
- Notification preferences

### Notification Model
- Multiple notification types
- Priority levels
- Read/unread status
- Metadata support

## Security Features

- Firebase token verification
- Role-based middleware
- Team isolation
- Input validation with Zod
- CORS configuration
- Rate limiting (can be added)

## API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

## Error Handling

- Comprehensive error middleware
- Validation error responses
- Authentication error handling
- Database error handling
- Custom error messages

## Testing

Run tests with:
```bash
npm test
```

## Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Deploy to your preferred hosting service
4. Ensure MongoDB connection is accessible

## Contributing

1. Follow TypeScript best practices
2. Use snake_case for function names (backend convention)
3. Implement proper error handling
4. Add validation for all inputs
5. Update documentation for new features

## License

ISC License
