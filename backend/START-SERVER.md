# 🚀 How to Start the Backend Server

## Step 1: Make sure MongoDB is running
- If using local MongoDB: Start MongoDB service
- If using MongoDB Atlas: Your connection string is already in `.env`

## Step 2: Start the backend
Open a terminal and run:

```bash
cd d:\e-comm\backend
npm start
```

## Step 3: Verify it's working
You should see:
```
✅ Routes loaded successfully
🚀 Server running on http://localhost:5000
MongoDB Connected Successfully ✅
   Database: ecomm
   Collection: users
```

## Step 4: Test endpoints
Open in browser:
- http://localhost:5000/ - Server info
- http://localhost:5000/api - API endpoints list
- http://localhost:5000/api/test - Test endpoint
- http://localhost:5000/api/users - List all users (should show empty array if no users yet)

## Step 5: Test saving data
1. Register a user from frontend (http://localhost:5173)
2. Check backend terminal - should see: `✅ User registered: email@example.com`
3. Check http://localhost:5000/api/users - should show the new user

## Troubleshooting
- If port 5000 is busy: Change PORT in `.env` file
- If MongoDB error: Make sure MongoDB is running
- If routes not found: Make sure you restarted the server after code changes
