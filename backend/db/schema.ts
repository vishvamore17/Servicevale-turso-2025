import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const userTable = sqliteTable('register', {
  id: text('id').primaryKey(), 
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('engineer'),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const userEmailIndex = index('user_email_idx').on(userTable.email);

export const engineerTable = sqliteTable('engineer', {
  id: text('id').primaryKey(), 
  engineerName: text('engineerName').notNull(),
  address: text('address').notNull(),
  contactNumber: text('contactNumber').notNull(),
  email: text('email').notNull(),
  aadharNumber: text('aadharNumber').notNull(),
  panNumber: text('panNumber').notNull(),
  city : text('city').notNull(),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const orderTable = sqliteTable('order', {
  id: text('id').primaryKey(),
  serviceboyName: text('serviceboyName').notNull(),
  serviceType: text('serviceType').notNull(),
  clientName: text('clientName').notNull(),
  phoneNumber: text('phoneNumber').notNull(),
  address: text('address').notNull(),
  billAmount: integer('billAmount').notNull(),
  status: text('status').notNull(),
  serviceDate: text('serviceDate').notNull(),
  serviceTime: text('serviceTime').notNull(),
  serviceboyEmail: text('serviceboyEmail').notNull(),
  serviceboyContactNumber: text('serviceboyContactNumber').notNull(),
  completedAt: text('completedAt').default(new Date().toISOString()),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const billTable = sqliteTable('bill', {
  id: text('id').primaryKey(),
  serviceboyName: text('serviceboyName').notNull(),
  serviceType: text('serviceType').notNull(),
  customerName: text('customerName').notNull(),
  contactNumber: text('contactNumber').notNull(),
  address: text('address').notNull(),
  serviceCharge: integer('serviceCharge').notNull(),
  notes: text('notes').notNull(),
  paymentMethod: text('paymentMethod').notNull(),
  total: text('total').notNull(),
  cashGiven: text('cashGiven').notNull(),
  change: text('change').notNull(), 
  date: text('date').default(new Date().toISOString()),
  billNumber: text('billNumber').notNull(),
  status: text('status').notNull(),
  signature: text('signature').notNull(),
  gstPercentage: integer('gstPercentage').notNull(),
  engineerCommission: integer('engineerCommission').notNull(),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const monthlyRevenueTable = sqliteTable('monthly_revenue', {
  id: text('id').primaryKey(),
  month: text('month').notNull(), 
  year: text('year').notNull(),   
  total: integer('total').notNull(),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const paymentTable = sqliteTable('payment', {
  id: text('id').primaryKey(),
  engineerId: text('engineerId').notNull(),
  engineerName: text('engineerName').notNull(),
  amount: integer('amount').notNull(),
  date: text('date').default(new Date().toISOString()),
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

export const paymentEngineerIdIndex = index('payment_engineer_id_idx').on(paymentTable.engineerId);
export const paymentDateIndex = index('payment_date_idx').on(paymentTable.date);

export const notificationTable = sqliteTable('notification', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  userEmail: text('userEmail').notNull(),
  createdAt: text('createdAt').default(new Date().toISOString()),
});

export const notificationUserEmailIndex = index('notification_user_email_idx').on(notificationTable.userEmail);

export const adminNotificationTable = sqliteTable('admin_notification', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  userEmail: text('userEmail').notNull(),
  createdAt: text('createdAt').default(new Date().toISOString()),
});

  export const photoTable = sqliteTable('photo', {
    id: text('id').primaryKey(),
    beforeImageUrl: text('before_image_url').notNull(),
    afterImageUrl: text('after_image_url'),
    notes: text('notes'),
    date: text('date').notNull(),
    userEmail: text('user_email').notNull(),
    createdAt: text('created_at').default(new Date().toISOString()),
    updatedAt: text('updated_at').default(new Date().toISOString()),
  });

  export const engineerSummaryTable = sqliteTable('engineer_summary', {
    id: text('id').primaryKey(),
    engineerId: text('engineerId').notNull(),
    engineerName: text('engineerName').notNull(),
    month: text('month').notNull(), 
    year: text('year').notNull(),
    monthlyCommission: integer('monthlyCommission').notNull().default(0),
    monthlyPaid: integer('monthlyPaid').notNull().default(0),
    pendingAmount: integer('pendingAmount').notNull().default(0),
    createdAt: text("created_at").default(new Date().toISOString()),
    updatedAt: text("updated_at").default(new Date().toISOString()),
  });

  export const engineerSummaryEngineerIdIndex = index('engineer_summary_engineer_id_idx').on(engineerSummaryTable.engineerId);
  export const engineerSummaryMonthYearIndex = index('engineer_summary_month_year_idx').on(
    engineerSummaryTable.month,
    engineerSummaryTable.year
  );