import express from 'express';
import cors from 'cors';
import engineerRoutes from './routes/engineer.routes';
import orderRoutes from './routes/order.routes';
import bill from './routes/bill.routes';
import monthlyRevenueRoutes from './routes/monthlyRevenueRoutes';
import paymentRoutes from './routes/payment.routes';
import commissionRoutes from './routes/commission.routes';
import notificationRoutes from './routes/notification.routes';
import adminNotificationRoutes from './routes/adminnotification.routes';
import authRoutes from './routes/auth.routes';
import photoRoute from  './routes/photo.routes';
import path from 'path';
import engineerSummaryRoutes from './routes/engineerSummary.routes';
import fs from 'fs';

const app = express();

// Get the absolute path to uploads directory
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
console.log('Uploads directory path:', uploadsDir);

// Ensure uploads directory exists with better error handling
try {
  if (!fs.existsSync(uploadsDir)) {
    console.log('Creating uploads directory...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created successfully');
  } else {
    console.log('Uploads directory already exists');
  }
  
  // Check permissions
  const stats = fs.statSync(uploadsDir);
  console.log('Directory permissions:', stats.mode.toString(8));
  console.log('Is directory:', stats.isDirectory());
  
} catch (error) {
  console.error('Error creating uploads directory:', error);
  process.exit(1); // Exit if we can't create the directory
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));
console.log('Serving static files from:', uploadsDir);

app.use(cors());
app.use(express.json());

app.use('/engineer', engineerRoutes);
app.use('/order', orderRoutes);
app.use('/bill', bill);
app.use('/api/monthly-revenue', monthlyRevenueRoutes);
app.use('/payment', paymentRoutes);
app.use('/engineer-commissions', commissionRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin-notifications', adminNotificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/photos', photoRoute);
app.use('/engineer-summary', engineerSummaryRoutes);

app.listen(3000,() => {console.log('Server is running on port 3000');});