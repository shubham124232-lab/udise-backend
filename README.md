# UDISE Dashboard Backend API

A robust Node.js backend API for the UDISE Dashboard, providing comprehensive school management functionality with JWT authentication and hierarchical data filtering.

## 🚀 Features

- **JWT Authentication** - Secure user authentication and authorization
- **CRUD Operations** - Full Create, Read, Update, Delete for school records
- **Hierarchical Filtering** - State → District → Block → Village level filtering
- **Data Distribution** - Aggregated data for charts and analytics
- **MongoDB Atlas** - Scalable cloud database with optimized schemas
- **Data Import** - CSV data processor with validation and transformation
- **RESTful API** - Clean, well-documented endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ORM**: Mongoose
- **Authentication**: JWT + bcryptjs
- **Data Processing**: csv-parser
- **Validation**: Mongoose schemas with custom validation

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
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

## 🔐 Authentication

### JWT Token Format

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Expiry

JWT tokens expire after 7 days. Implement token refresh logic in your frontend.

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
  }
}
```

## 🔧 Development

### Project Structure

```
backend/
├── models/          # Database models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── utils/           # Utility functions
├── server.js        # Main server file
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

## 🚀 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Web Service
4. Update frontend API endpoints

### Environment Variables for Production

```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=10000
```

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Detailed error information"]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `500` - Internal Server Error

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Input validation and sanitization
- CORS configuration
- Rate limiting (can be added)
- SQL injection protection (MongoDB)

## 📊 Performance Optimizations

- Database indexing on frequently queried fields
- Pagination for large datasets
- Batch processing for data import
- Efficient aggregation pipelines
- Connection pooling with MongoDB

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the API documentation
2. Review error logs
3. Check MongoDB Atlas connection
4. Verify environment variables

---

**Built with ❤️ for the UDISE Dashboard Project** 