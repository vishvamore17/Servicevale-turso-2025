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

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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