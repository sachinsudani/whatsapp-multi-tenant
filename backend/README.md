# Multi-Tenant WhatsApp Messaging Service

## Project Overview

This is a practical test implementation for a multi-tenant WhatsApp messaging service that allows organizations to manage multiple users, authenticate with WhatsApp, link multiple devices, and send messages through a RESTful API architecture.

## 🎯 Core Requirements

### 1. Multi-Tenant Architecture

- Isolated data per tenant (organization)
- User management with role-based permissions (Admin, Editor, Viewer)
- Tenant-scoped data access with `tenantId` segregation

### 2. User & Group Management

- Multiple users per tenant with unique credentials
- User groups with distinct permissions:
  - **Admins**: Full access (create/delete users, manage groups, link devices, send messages, view logs)
  - **Editors**: Limited access (link devices, send messages, view logs)
  - **Viewers**: Read-only access (view logs only)

### 3. WhatsApp Integration

- **Option A**: Baileys TypeScript library (`@whiskeysockets/baileys`)
- **Option B**: WAHA WhatsApp HTTP API (`devlikeapro/waha`)
- Multi-device support with QR code authentication
- Message sending to phone numbers and chat groups
- Contact and group management
- Chat history storage

### 4. Authentication & Authorization

- JWT-based authentication
- Group-based permission middleware
- Secure credential storage (bcrypt hashing)

### 5. Database Schema

- **Technology**: PostgreSQL or MongoDB
- **Key Entities**:
  - Tenants
  - Users (with tenant isolation)
  - User Groups & Permissions
  - WhatsApp Sessions
  - Messages & Chat History
  - Contacts & Chat Groups
- Proper indexing and normalization
- Connection pooling for scalability

## 🏗️ Tech Stack

### Backend

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL or MongoDB
- **Caching**: Redis
- **WhatsApp API**: Baileys or WAHA
- **Authentication**: JWT
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI

### Optional Frontend

- React, Vue, Angular, Svelte, or plain HTML/CSS/JS
- Alternative: Readymade platforms (Retool, Bubble)

### DevOps

- **Containerization**: Docker & Docker Compose
- **Logging**: Winston (optional)
- **WebSockets**: NestJS WebSockets (optional)

## 📋 Required API Endpoints

### Authentication

- `POST /auth/register` - User registration with validation
- `POST /auth/login` - User authentication & JWT token generation
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### User Management (Admin only)

- `POST /users` - Create new user
- `GET /users` - Get all users with pagination and filters
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user by ID
- `DELETE /users/:id` - Delete user by ID (soft delete)
- `PUT /users/:id/password` - Change user password

### WhatsApp Integration

- `POST /whatsapp/devices` - Create new WhatsApp device
- `GET /whatsapp/devices` - List all WhatsApp devices for tenant
- `GET /whatsapp/devices/:id` - Get device by ID
- `PUT /whatsapp/devices/:id` - Update device
- `DELETE /whatsapp/devices/:id` - Delete device
- `POST /whatsapp/devices/:id/qr` - Generate QR code for device authentication
- `GET /whatsapp/devices/:id/status` - Get device connection status
- `POST /whatsapp/send` - Send WhatsApp message

### Data Retrieval

- `GET /messages` - Get message logs with pagination and filters
- `GET /messages/stats` - Get message statistics and analytics
- `GET /messages/:id` - Get message by ID
- `PUT /messages/:id/status` - Update message status
- `DELETE /messages/:id` - Delete message (soft delete)
- `GET /contacts` - Get all contacts for tenant
- `GET /contacts/:id` - Get contact by ID
- `POST /contacts` - Create new contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact (soft delete)
- `GET /contacts/:id/stats` - Get contact message statistics

## 🔒 Security Requirements

### API Security

- Input validation & sanitization (class-validator)
- Rate limiting (@nestjs/throttler)
- Secure password hashing (bcrypt)
- JWT with short expiration (1 hour) + refresh tokens
- HTTPS configuration
- Audit logging for sensitive operations

### Data Protection

- Tenant data isolation
- Permission-based access control
- Secure session storage
- Input sanitization against injection attacks

## 🚀 Scalability Considerations

### Architecture

- Microservices-ready modular design
- Database connection pooling
- Redis caching for frequently accessed data
- Proper database indexing
- Asynchronous message processing
- N+1 query prevention

### Performance

- Optimized database queries
- Caching strategies
- Event-driven architecture (optional)
- WebSocket notifications (optional)

## 🐳 Deployment

### Docker Setup

- Containerized application
- `docker-compose.yml` for local development
- Single command deployment: `docker-compose up`
- Include database, Redis, and WAHA containers

### Environment Configuration

- Development, staging, and production configs
- Environment variables for sensitive data
- HTTPS configuration for production

## 🧪 Testing Strategy

### Required Tests

- Authentication middleware tests
- Permission check tests
- Message sending logic tests
- Minimum 3 critical components coverage

### Test Framework

- Jest for unit testing
- Test database setup
- Mock WhatsApp API responses

## 📖 Documentation Requirements

### README.md Must Include

- Setup and installation instructions
- Prerequisites (Node.js 17+, Docker, etc.)
- Running instructions (`docker-compose up`)
- Unit test execution steps
- Architecture explanation
- Database schema design
- Security & scalability practices
- AI tools usage explanation
- Swagger documentation link

### API Documentation

- Complete Swagger/OpenAPI documentation
- Request/response schemas
- Authentication examples
- Error response formats

## 🎥 Demo Video Requirements (Loom, 5-10 minutes)

### Must Demonstrate

1. Application setup with `docker-compose up`
2. Tenant and user creation with different groups
3. User login and JWT token retrieval
4. WhatsApp device linking (QR code generation)
5. Device switching functionality
6. Message sending to contacts/groups
7. Message logs, contacts, and groups retrieval
8. Database schema explanation
9. Unit test execution
10. Swagger documentation access
11. Frontend interaction (if implemented)

### Code Explanation

- Architecture overview
- Database schema design rationale
- Security implementation
- Scalability considerations
- AI tools utilization
- WAHA/Baileys integration approach

## 🏆 Evaluation Criteria

### Primary Focus Areas

1. **Database Schema** (25%) - Scalable, standardized, tenant-isolated
2. **WhatsApp Features** (25%) - Multi-device, QR auth, messaging, history
3. **Multi-Tenant Architecture** (20%) - Data isolation, user/group management
4. **Code Quality** (15%) - Clean, modular, documented
5. **Security** (10%) - Data isolation, secure auth, input validation
6. **API Design** (5%) - RESTful, well-documented

### Bonus Points

- Event-driven architecture
- WebSocket notifications
- Structured logging (Winston)
- WAHA Plus advanced features
- High-quality frontend implementation

## ⚠️ Important Notes

### WhatsApp API Considerations

- **Baileys**: Avoid `useMultiFileAuthState` in production
- **WAHA**: Use Core (free) or Plus (donation required)
- Both are unofficial APIs with account blocking risks
- Implement robust error handling
- Follow WhatsApp's terms of service

### Development Guidelines

- Focus on production-ready implementation
- Document any workarounds or assumptions
- Use AI tools effectively while maintaining code understanding
- Ensure you can explain all implemented code

## 📁 Project Structure Suggestion

```
src/
├── auth/              # Authentication module
├── users/             # User management module
├── whatsapp/          # WhatsApp integration module
├── messages/          # Message handling module
├── contacts/          # Contact management module
├── groups/            # Group management module
├── database/          # Database configuration
├── common/            # Shared utilities
├── config/            # Application configuration
└── main.ts           # Application entry point

test/                  # Unit tests
docker/               # Docker configurations
docs/                 # Additional documentation
frontend/             # Frontend implementation (optional)
```

## 🔧 Development Workflow

1. **Phase 1**: Setup NestJS project with basic structure
2. **Phase 2**: Implement database schema and models
3. **Phase 3**: Create authentication and authorization
4. **Phase 4**: Develop user and tenant management
5. **Phase 5**: Integrate WhatsApp API (Baileys or WAHA)
6. **Phase 6**: Implement messaging functionality
7. **Phase 7**: Add caching and optimization
8. **Phase 8**: Create comprehensive tests
9. **Phase 9**: Setup Docker deployment
10. **Phase 10**: Develop frontend (optional)
11. **Phase 11**: Documentation and demo video

## 🚀 Implementation Progress

### ✅ Completed Modules

#### **1. NestJS Base Setup**

- ✅ Project scaffolding with TypeScript
- ✅ Configuration management with environment variables
- ✅ Global validation pipe and CORS setup
- ✅ Swagger/OpenAPI documentation
- ✅ Docker containerization
- ✅ Rate limiting and throttling

#### **2. Database Setup (MongoDB + Mongoose)**

- ✅ MongoDB migration from PostgreSQL
- ✅ Mongoose schemas for all entities
- ✅ Proper indexing and relationships
- ✅ Connection pooling and optimization
- ✅ Docker Compose with MongoDB

#### **3. Authentication Module**

- ✅ JWT-based authentication with access and refresh tokens
- ✅ User registration with comprehensive validation
- ✅ Login, logout, and token refresh endpoints
- ✅ Password hashing with bcrypt (12 salt rounds)
- ✅ Multi-tenant isolation
- ✅ Role-based access control (RBAC)
- ✅ Permission guards and decorators
- ✅ Comprehensive input validation and error handling

#### **4. User Management Module**

- ✅ Complete CRUD operations for users
- ✅ Multi-tenant user isolation
- ✅ Role-based permissions (Admin, Editor, Viewer)
- ✅ Advanced filtering and pagination
- ✅ Search functionality (email, first name, last name)
- ✅ User group assignment and validation
- ✅ Password change functionality
- ✅ Soft delete implementation
- ✅ Comprehensive validation and error handling
- ✅ Swagger documentation for all endpoints

### 🔄 Next Steps

#### **5. WhatsApp Integration Module** ✅

- ✅ Device management and QR code generation
- ✅ Message sending and receiving
- ✅ WAHA API integration
- ✅ Multi-device support
- ✅ Device status monitoring
- ✅ Message tracking and history
- ✅ Comprehensive error handling
- ✅ Swagger documentation for all endpoints

#### **6. Core API Endpoints** ✅

- ✅ Message logs and analytics
- ✅ Contact management
- ✅ Message statistics and reporting
- ✅ Advanced filtering and pagination
- ✅ Comprehensive validation and error handling
- ✅ Swagger documentation for all endpoints

## 📅 Submission Deadline

**Monday, 8 AM IST** - Submit GitHub repository URL and Loom video link via email

## 🎯 Success Tips

1. **Choose your WhatsApp integration wisely** - WAHA might be easier for quick setup
2. **Focus on core requirements first** - Get MVP working before adding bonuses
3. **Use AI tools effectively** - Leverage them for boilerplate code and guidance
4. **Test early and often** - Don't leave testing until the end
5. **Document as you go** - Don't wait until the end to write documentation
6. **Practice your demo** - Rehearse the video to ensure smooth presentation

## 🤖 AI Tools Integration

### Recommended Usage

- **GitHub Copilot**: Code completion and boilerplate generation
- **ChatGPT/Claude**: Architecture decisions and code explanations
- **Cursor AI**: Full-context code assistance and refactoring

### Best Practices

- Understand generated code before using it
- Review AI suggestions for security vulnerabilities
- Document AI-assisted development decisions
- Maintain code quality standards regardless of AI usage

---

**Good luck with your implementation! Focus on building a production-ready, scalable solution that demonstrates your backend development expertise.**
