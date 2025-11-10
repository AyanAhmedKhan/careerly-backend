# Careerly Backend

Backend API for Careerly - An AI-powered professional networking platform with career insights, resume analysis, and intelligent recommendations.

## 🚀 Features

- **Authentication & Authorization**: JWT-based secure authentication
- **User Profiles**: Complete profile management with skills, experience, and education
- **Posts & Interactions**: Create, like, comment, and share professional posts with emoji reactions
- **Real-time Messaging**: Socket.io-powered instant messaging between users
- **AI Integration**: 
  - Resume analysis and scoring
  - Career recommendations
  - Content suggestions using GROQ API
- **Notifications**: Real-time notification system
- **File Uploads**: Profile pictures and document uploads using Multer

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Real-time**: Socket.io
- **AI**: GROQ SDK for AI-powered features
- **File Upload**: Multer
- **Security**: CORS, environment variables

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- GROQ API key (for AI features)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AyanAhmedKhan/careerly-backend.git
   cd careerly-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/careerly?retryWrites=true&w=majority

   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # AI Integration
   GROQ_API_KEY=your-groq-api-key-here

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Seed the database** (Optional)
   ```bash
   npm run seed
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```
Server will start on `http://localhost:5000`

### Production Mode
```bash
npm start
```

## 📁 Project Structure

```
backend/
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User schema
│   ├── Post.js              # Post schema
│   ├── Conversation.js      # Chat conversation schema
│   └── Message.js           # Chat message schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── posts.js             # Post CRUD and interactions
│   ├── chat.js              # Messaging routes
│   ├── notifications.js     # Notification routes
│   └── ai.js                # AI-powered features
├── seeds/
│   └── seed.js              # Database seeding script
├── uploads/                 # Uploaded files directory
├── .env                     # Environment variables (not in repo)
├── .gitignore              # Git ignore file
├── server.js               # Main application entry point
└── package.json            # Dependencies and scripts
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile (protected)
- `GET /api/users/suggestions` - Get connection suggestions (protected)
- `GET /api/users/search` - Search users

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post (protected)
- `PUT /api/posts/:id` - Update post (protected)
- `DELETE /api/posts/:id` - Delete post (protected)
- `POST /api/posts/:id/react` - Add reaction to post (protected)
- `POST /api/posts/:id/comment` - Add comment to post (protected)

### Messaging
- `GET /api/chat/conversations` - Get user conversations (protected)
- `GET /api/chat/conversations/:id/messages` - Get conversation messages (protected)
- `PUT /api/chat/conversations/:id/read` - Mark messages as read (protected)

### AI Features
- `POST /api/ai/analyze-resume` - Analyze resume and get score
- `POST /api/ai/suggest-post` - Get AI content suggestions
- `POST /api/ai/analyze-content` - Analyze content with AI
- `POST /api/ai/career-advice` - Get personalized career advice

### Notifications
- `GET /api/notifications` - Get user notifications (protected)
- `PUT /api/notifications/:id/read` - Mark notification as read (protected)

## 🌐 Socket.io Events

### Client → Server
- `join-conversation` - Join a chat conversation
- `leave-conversation` - Leave a chat conversation
- `send-message` - Send a message
- `typing` - Indicate typing status

### Server → Client
- `new-message` - Receive new message
- `user-typing` - User is typing notification
- `messages-read` - Messages marked as read
- `error` - Error notifications

## 🚢 Deployment

### Render Deployment

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml` configuration

3. **Set Environment Variables in Render Dashboard**
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GROQ_API_KEY`
   - `FRONTEND_URL` (your Vercel frontend URL)
   - `NODE_ENV=production`

4. **Deploy**
   - Render will automatically build and deploy
   - Note: Free tier spins down after 15 min inactivity

### MongoDB Atlas Setup

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist IP addresses (or use `0.0.0.0/0` for development)
4. Get connection string and add to `.env`

## 🔐 Security Notes

- Always use strong JWT secrets in production
- Keep `.env` file secure and never commit it
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Validate and sanitize all user inputs
- Keep dependencies updated

## 📝 Available Scripts

- `npm start` - Run production server
- `npm run dev` - Run development server with nodemon
- `npm run seed` - Seed database with sample data

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

**Ayan Ahmed Khan**
- GitHub: [@AyanAhmedKhan](https://github.com/AyanAhmedKhan)

## 🙏 Acknowledgments

- GROQ for AI capabilities
- MongoDB Atlas for database hosting
- Render for deployment platform