# 🔄 How to Fix "No route matched" Error

## The Problem
The backend server needs to be **restarted** to load the new routes (cart, wishlist, checkout, razorpay).

## Solution: Restart Backend

### Step 1: Stop Current Backend
- Find the terminal where backend is running
- Press `Ctrl + C` to stop it

### Step 2: Restart Backend
```bash
cd d:\e-comm\backend
npm start
```

You should see:
```
✅ Routes loaded successfully
🚀 Server running on http://localhost:5001
MongoDB Connected Successfully ✅
```

### Step 3: Verify Routes Are Working
Open browser and go to:
- http://localhost:5001/api

You should see all endpoints listed including:
- `/api/cart`
- `/api/wishlist`
- `/api/checkout`
- `/api/razorpay/create-order`
- `/api/razorpay/verify-payment`

### Step 4: Test Frontend Again
- Make sure frontend is running: `npm run dev` in `vite-project` folder
- Try adding items to cart/wishlist
- The "No route matched" error should be gone!

## If Still Getting Errors

1. **Check backend terminal** - Look for any error messages
2. **Check MongoDB is running** - Backend needs MongoDB to work
3. **Check port 5001** - Make sure nothing else is using it
4. **Check .env file** - Make sure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
