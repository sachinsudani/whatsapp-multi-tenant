# WhatsApp Multi-Tenant Application

A comprehensive WhatsApp messaging platform built with NestJS backend and React frontend, supporting multi-tenant architecture with device management, contact management, group messaging, and real-time messaging capabilities.

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Isolated tenant spaces with user management
- **Device Management**: Create and manage multiple WhatsApp devices
- **Contact Management**: Store and manage contacts with detailed information
- **Group Management**: Create and manage WhatsApp groups with participant management
- **Message Sending**: Send text and media messages to individuals and groups
- **Real-time Status**: Monitor device connection status and message delivery
- **QR Code Authentication**: Easy device connection via QR codes

### Technical Features
- **Backend**: NestJS with TypeScript, MongoDB, Redis
- **Frontend**: React with TypeScript, Tailwind CSS, React Query
- **WhatsApp Integration**: WAHA (WhatsApp HTTP API) with Baileys fallback
- **Authentication**: JWT-based authentication with refresh tokens
- **API Documentation**: Swagger/OpenAPI documentation
- **Docker Support**: Complete containerized deployment
- **Real-time Updates**: WebSocket support for live updates

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **WhatsApp**: WAHA (WhatsApp HTTP API) + Baileys support
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **UI Components**: Custom components with Lucide React icons
- **Build Tool**: Vite
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB 6.0
- **Cache**: Redis 7
- **WhatsApp Service**: WAHA (devlikeapro/waha)

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd whatsapp-multi-tenant
```

### 2. Environment Setup

Create environment files for both backend and frontend:

#### Backend Environment (.env in backend directory)
```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp_multi_tenant
MONGODB_USERNAME=
MONGODB_PASSWORD=
MONGODB_AUTH_SOURCE=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# WhatsApp
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=your-waha-api-key
USE_BAILEYS=false
BAILEYS_PRINT_QR=false
BAILEYS_CREDS_PATH=./baileys-creds.json

# Logging
LOG_LEVEL=debug
```

#### Frontend Environment (.env in frontend directory)
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```

### 3. Start with Docker Compose

The easiest way to run the entire application:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Manual Setup (Alternative)

If you prefer to run services manually:

#### Start Backend
```bash
cd backend
npm install
npm run start:dev
```

#### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Start MongoDB & Redis
```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 mongo:6.0
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or using your local installations
```

#### Start WAHA Service
```bash
docker run -d --name waha -p 3001:3000 devlikeapro/waha
```

## 🌐 Access Points

After starting the application:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/api
- **WAHA Dashboard**: http://localhost:3001/docs

## 📱 Usage Guide

### 1. Initial Setup

1. **Register/Login**: Create an account or login to the system
2. **Create Device**: Add your first WhatsApp device
3. **Connect Device**: Scan QR code with your WhatsApp mobile app
4. **Add Contacts**: Import or manually add contacts
5. **Create Groups**: Set up groups for bulk messaging

### 2. Device Management

- **Create Device**: Add new WhatsApp devices for different purposes
- **QR Connection**: Scan QR codes to connect devices
- **Status Monitoring**: Monitor device connection status
- **Device Settings**: Configure device-specific settings

### 3. Contact Management

- **Add Contacts**: Manually add or bulk import contacts
- **Contact Details**: Store name, phone, email, company, and notes
- **Search & Filter**: Find contacts quickly with search functionality
- **Contact Actions**: Send messages directly from contact list

### 4. Group Management

- **Create Groups**: Set up groups with descriptions
- **Add Participants**: Add phone numbers to groups
- **Manage Members**: Add/remove participants as needed
- **Group Messaging**: Send messages to entire groups

### 5. Messaging

- **Individual Messages**: Send to specific contacts
- **Group Messages**: Broadcast to groups
- **Message Types**: Support for text and media messages
- **Message History**: View sent message history and status

## 🔧 Configuration

### WhatsApp Service Configuration

The application supports two WhatsApp integration methods:

#### WAHA (Recommended)
- **Default**: Uses WAHA (WhatsApp HTTP API)
- **Configuration**: Set `USE_BAILEYS=false`
- **Features**: Full WhatsApp Web API support

#### Baileys (Alternative)
- **Fallback**: Direct Baileys integration
- **Configuration**: Set `USE_BAILEYS=true`
- **Features**: Direct WhatsApp connection

### Environment Variables

Key configuration options:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | Backend port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/whatsapp_multi_tenant` |
| `WAHA_API_URL` | WAHA service URL | `http://localhost:3001` |
| `USE_BAILEYS` | Use Baileys instead of WAHA | `false` |

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem**: Frontend can't connect to backend
**Solution**: 
- Check CORS configuration in `backend/src/main.ts`
- Ensure `FRONTEND_URL` is set correctly
- Verify frontend is running on the expected port

#### 2. Device Creation Fails
**Problem**: Can't create WhatsApp devices
**Solution**:
- Ensure WAHA service is running (`docker-compose ps`)
- Check WAHA logs: `docker-compose logs waha`
- Verify WAHA API is accessible: `curl http://localhost:3001/api/sessions`

#### 3. QR Code Not Generating
**Problem**: QR codes not appearing for device connection
**Solution**:
- Check device status in WAHA dashboard
- Verify webhook configuration
- Restart WAHA service if needed

#### 4. Database Connection Issues
**Problem**: Backend can't connect to MongoDB
**Solution**:
- Check MongoDB is running: `docker-compose ps mongodb`
- Verify connection string in environment
- Check MongoDB logs: `docker-compose logs mongodb`

#### 5. Frontend Build Issues
**Problem**: Frontend won't build or run
**Solution**:
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall dependencies: `npm install`
- Check Node.js version: `node --version` (should be 18+)

### Logs and Debugging

#### View Service Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f waha
docker-compose logs -f mongodb
```

#### Backend Debug Mode
```bash
# Set log level to debug
LOG_LEVEL=debug docker-compose up backend
```

#### Frontend Development
```bash
# Run with detailed logging
npm run dev -- --debug
```

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**: Change all default secrets
2. **HTTPS**: Use HTTPS in production
3. **Database Security**: Secure MongoDB with authentication
4. **API Keys**: Use strong WAHA API keys
5. **CORS**: Restrict CORS origins to production domains

### Security Checklist

- [ ] Change default JWT secrets
- [ ] Set up MongoDB authentication
- [ ] Configure HTTPS
- [ ] Restrict CORS origins
- [ ] Use strong WAHA API keys
- [ ] Enable rate limiting
- [ ] Set up proper logging
- [ ] Configure backup strategy

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check service status
docker-compose ps

# Check API health
curl http://localhost:3000/api/v1/health

# Check WAHA status
curl http://localhost:3001/api/sessions
```

### Backup Strategy

```bash
# Backup MongoDB
docker exec mongodb mongodump --out /backup

# Backup WAHA sessions
docker cp waha:/app/sessions ./backup/sessions
```

### Performance Monitoring

- Monitor MongoDB performance
- Check Redis memory usage
- Monitor WAHA service logs
- Track API response times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section
2. Review the API documentation at `/api`
3. Check service logs for errors
4. Create an issue with detailed information

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Backend
cd backend && npm update

# Frontend
cd frontend && npm update

# Docker images
docker-compose pull
docker-compose up -d
```

### Database Migrations

The application uses Mongoose schemas that auto-migrate. For manual migrations:

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh

# Run migration scripts if needed
```

---

**Note**: This application is for educational and development purposes. Ensure compliance with WhatsApp's Terms of Service and applicable laws when using in production. 