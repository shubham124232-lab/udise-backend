# UDISE Dashboard Backend API

A robust Node.js backend API for the UDISE Dashboard, providing comprehensive school management functionality with JWT authentication, hierarchical data filtering, and scalable MongoDB integration.

## 🚀 Features

- **JWT Authentication** - Secure user authentication and authorization
- **CRUD Operations** - Full Create, Read, Update, Delete for school records
- **Hierarchical Filtering** - State → District → Block → Village level filtering
- **Data Distribution** - Aggregated data for charts and analytics
- **MongoDB Atlas** - Scalable cloud database with optimized schemas
- **Data Import** - CSV data processor with validation and transformation
- **RESTful API** - Clean, well-documented endpoints
- **Performance Optimized** - Efficient queries, indexing, and pagination
- **Error Handling** - Comprehensive error handling and logging
- **Data Validation** - Input validation and sanitization

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ORM**: Mongoose
- **Authentication**: JWT + bcryptjs
- **Data Processing**: csv-parser
- **Validation**: Mongoose schemas with custom validation
- **Security**: CORS, input sanitization, rate limiting ready

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (free tier available)
- CSV dataset from Kaggle (schools data)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

Create a `.env` file based on `env.example`:

```bash
cp env.example .env
```

Update the `.env` file with your credentials:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/udise-dashboard
JWT_SECRET=your-super-secret-jwt-key-here
PORT=5000
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### 4. Import Data

Download the schools dataset from Kaggle and place it in the backend directory, then run:

```bash
# Preprocess and transform CSV data
npm run preprocess schools.csv transformed_schools.csv 800000

# Import transformed data to MongoDB
npm run seed:limit transformed_schools.csv 800000
```

## 📊 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | User registration | No |
| POST | `/api/auth/login` | User login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | User logout | Yes |

### School Data

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/data` | Get schools with filters & pagination | No |
| POST | `/api/data` | Create new school | Yes |
| GET | `/api/data/:id` | Get specific school | No |
| PUT | `/api/data/:id` | Update school | Yes |
| DELETE | `/api/data/:id` | Delete school | Yes |
| GET | `/api/data/distribution` | Get chart distribution data | No |
| GET | `/api/data/filters` | Get filter options | No |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

## 🔐 Authentication

### JWT Token Format

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiry

JWT tokens expire after 7 days. Implement token refresh logic in your frontend.

### Authentication Flow

1. User registers/logs in via `/api/auth/signup` or `/api/auth/login`
2. Server validates credentials and returns JWT token
3. Client stores token and includes in subsequent requests
4. Server validates token on protected routes
5. Token automatically expires after 7 days

## 📊 Data Filtering

### Hierarchical Filters

The API supports hierarchical filtering:

- **State Level**: `/api/data?state=Madhya Pradesh`
- **District Level**: `/api/data?state=Madhya Pradesh&district=Bhopal`
- **Block Level**: `/api/data?state=MP&district=Bhopal&block=SomeBlock`
- **Village Level**: `/api/data?state=MP&district=Bhopal&block=SomeBlock&village=SomeVillage`

### Additional Filters

- `management`: Government, Private Unaided, Private Aided, etc.
- `location`: Rural, Urban
- `school_type`: Co-Ed, Girls, Boys
- `search`: Text search in school name and UDISE code

### Pagination

```
/api/data?page=1&limit=20
```

### Sorting

```
/api/data?sortBy=school_name&sortOrder=asc
```

## 📈 Data Distribution

The distribution endpoint provides aggregated data for charts:

```json
{
  "managementTypeDistribution": [
    { "label": "Government", "count": 1200 },
    { "label": "Private Unaided", "count": 800 }
  ],
  "locationDistribution": [
    { "label": "Rural", "count": 1500 },
    { "label": "Urban", "count": 800 }
  ],
  "schoolTypeDistribution": [
    { "label": "Co-Ed", "count": 2000 },
    { "label": "Girls", "count": 200 },
    { "label": "Boys", "count": 100 }
  ]
}
```

## 🗄️ Database Schema

### School Model

```javascript
{
  udise_code: String (unique, required),
  school_name: String (required),
  state: String (required),
  district: String (required),
  block: String (required),
  village: String (required),
  management: String (enum: Government, Private Unaided, etc.),
  location: String (enum: Rural, Urban),
  school_type: String (enum: Co-Ed, Girls, Boys),
  establishment_year: Number,
  total_students: Number,
  total_teachers: Number,
  infrastructure: {
    has_electricity: Boolean,
    has_drinking_water: Boolean,
    has_toilets: Boolean,
    has_library: Boolean,
    has_computer_lab: Boolean
  },
  academic_performance: {
    pass_percentage: Number,
    dropout_rate: Number
  },
  contact_info: {
    phone: String,
    email: String,
    website: String
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  isActive: Boolean (default: true),
  created_by: ObjectId (User),
  updated_by: ObjectId (User),
  timestamps: true
}
```

### User Model

```javascript
{
  email: String (required, unique),
  password: String (required, hashed),
  name: String,
  role: String (enum: admin, user, default: user),
  isActive: Boolean (default: true),
  lastLogin: Date,
  timestamps: true
}
```

## 🔧 Development

### Project Structure

```
backend/
├── models/          # Database models
│   ├── School.js    # School schema
│   └── User.js      # User schema
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   └── data.js      # School data routes
├── middleware/      # Custom middleware
│   └── auth.js      # JWT authentication middleware
├── utils/           # Utility functions
│   ├── csvPreprocessor.js  # CSV data transformation
│   ├── dataSeeder.js       # Data import utility
│   └── testData.js         # Test data generator
├── scripts/         # Database scripts
│   ├── importSchools.js    # School import script
│   └── fixActivity.js      # Data fix utilities
├── data/            # CSV data files
├── server.js        # Main server file
├── testConnection.js # MongoDB connection test
├── package.json     # Dependencies
└── README.md        # This file
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run preprocess` - Transform CSV data
- `npm run seed` - Import CSV data
- `npm run seed:limit` - Import limited CSV data
- `npm run test:connection` - Test MongoDB connection

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/udise-dashboard

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# Optional
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard:
   ```
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   NODE_ENV=production
   PORT=10000
   ```
3. Deploy as a Web Service
4. Update frontend API endpoints

### Environment Variables for Production

```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://your-frontend-domain.com
```

### MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create a new cluster
3. Create database user with read/write permissions
4. Whitelist IP addresses (0.0.0.0/0 for Render)
5. Get connection string and add to environment variables

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Detailed error information"],
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

### Error Types

- **Validation Errors**: Input validation failures
- **Authentication Errors**: Invalid or expired tokens
- **Authorization Errors**: Insufficient permissions
- **Database Errors**: MongoDB connection or query issues
- **Server Errors**: Internal server problems

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Mongoose schema validation
- **Input Sanitization**: XSS protection
- **CORS Configuration**: Cross-origin request handling
- **Rate Limiting**: Request rate limiting (configurable)
- **SQL Injection Protection**: MongoDB NoSQL injection protection
- **Environment Variables**: Secure configuration management

## 📊 Performance Optimizations

### Database Optimizations

- **Indexing**: Strategic indexes on frequently queried fields
- **Pagination**: Efficient pagination for large datasets
- **Aggregation**: Optimized aggregation pipelines
- **Connection Pooling**: MongoDB connection pooling
- **Query Optimization**: Efficient query patterns

### API Optimizations

- **Response Caching**: HTTP caching headers
- **Compression**: Gzip compression
- **Batch Processing**: Efficient data import
- **Error Handling**: Fast error responses
- **Logging**: Structured logging for monitoring

### Indexes

```javascript
// Recommended indexes
db.schools.createIndex({ "state": 1, "district": 1, "block": 1, "village": 1 })
db.schools.createIndex({ "udise_code": 1 }, { unique: true })
db.schools.createIndex({ "school_name": "text" })
db.schools.createIndex({ "management": 1, "location": 1, "school_type": 1 })
```

## 📊 Data Import

### CSV Preprocessing

The system includes a CSV preprocessor that:

1. Validates CSV structure
2. Transforms data to match schema
3. Handles missing or invalid data
4. Generates UDISE codes if missing
5. Validates geographical hierarchy

### Import Process

```bash
# Step 1: Preprocess CSV
npm run preprocess input.csv output.csv 800000

# Step 2: Import to database
npm run seed:limit output.csv 800000
```

### Data Validation

- **Required Fields**: UDISE code, school name, location hierarchy
- **Data Types**: Proper type conversion and validation
- **Geographical Hierarchy**: State → District → Block → Village validation
- **Unique Constraints**: UDISE code uniqueness
- **Enum Values**: Valid management, location, and school type values

## 🧪 Testing

### Connection Testing

```bash
npm run test:connection
```

### API Testing

Use tools like Postman or curl to test endpoints:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test data endpoint
curl "http://localhost:5000/api/data?limit=10"
```

## 📊 Monitoring and Logging

### Logging

The application includes structured logging for:

- **Request/Response**: API request and response logging
- **Authentication**: Login attempts and token validation
- **Database**: Query performance and errors
- **Errors**: Detailed error logging with stack traces

### Health Monitoring

- **Health Endpoint**: `/health` for service monitoring
- **Database Connection**: MongoDB connection status
- **Memory Usage**: Node.js memory monitoring
- **Response Times**: API response time tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

### Development Guidelines

- Follow ESLint configuration
- Write comprehensive error handling
- Add input validation for all endpoints
- Include proper logging
- Write tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

1. Check the API documentation
2. Review error logs
3. Check MongoDB Atlas connection
4. Verify environment variables
5. Test with Postman or curl
6. Check server logs for detailed errors

### Common Issues

- **Connection Errors**: Verify MongoDB URI and network access
- **Authentication Issues**: Check JWT secret and token format
- **Data Import Errors**: Validate CSV format and data structure
- **Performance Issues**: Check database indexes and query patterns
- **CORS Errors**: Verify CORS configuration and frontend URL

### Troubleshooting

```bash
# Check MongoDB connection
npm run test:connection

# Check server logs
tail -f logs/app.log

# Test API endpoints
curl http://localhost:5000/health
```

---

**Built with ❤️ for the UDISE Dashboard Project**