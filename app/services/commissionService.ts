import Constants from 'expo-constants';

const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

class CommissionService {
  private static instance: CommissionService;
  private engineersSummary: any[] = [];
  private userSummary: any = null;
  private adminListeners: ((data: any[]) => void)[] = [];
  private userListeners: ((data: any) => void)[] = [];

  static getInstance(): CommissionService {
    if (!CommissionService.instance) {
      CommissionService.instance = new CommissionService();
    }
    return CommissionService.instance;
  }

  addAdminListener(callback: (data: any[]) => void) {
    this.adminListeners.push(callback);
    return () => {
      this.adminListeners = this.adminListeners.filter(listener => listener !== callback);
    };
  }

  addUserListener(callback: (data: any) => void) {
    this.userListeners.push(callback);
    return () => {
      this.userListeners = this.userListeners.filter(listener => listener !== callback);
    };
  }

  private notifyAdminListeners() {
    this.adminListeners.forEach(listener => listener(this.engineersSummary));
  }

  private notifyUserListeners() {
    this.userListeners.forEach(listener => listener(this.userSummary));
  }

  async refreshAllEngineerSummaries() {
    try {
      const billsResponse = await fetch(`${API_BASE_URL}/bill`);
      if (!billsResponse.ok) throw new Error('Failed to fetch bills');
      const bills = await billsResponse.json();

      const paymentsResponse = await fetch(`${API_BASE_URL}/payment`);
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const payments = await paymentsResponse.json();

      const engineersMap = new Map();

      bills.forEach((bill: any) => {
        const engineerName = bill.serviceboyName;
        if (!engineerName) return;

        if (!engineersMap.has(engineerName)) {
          engineersMap.set(engineerName, {
            name: engineerName,
            totalCommission: 0,
            monthlyCommission: 0,
            totalPayments: 0,
            monthlyPayments: 0,
            pendingAmount: 0
          });
        }

        const engineer = engineersMap.get(engineerName);
        const commission = bill.engineerCommission || 0;
        const billDate = new Date(bill.date || bill.createdAt);
        const currentDate = new Date();
        
        engineer.totalCommission += commission;
        
        if (billDate.getMonth() === currentDate.getMonth() && 
            billDate.getFullYear() === currentDate.getFullYear()) {
          engineer.monthlyCommission += commission;
        }
      });

      payments.forEach((payment: any) => {
        const engineerName = payment.engineerName;
        if (!engineerName) return;

        if (!engineersMap.has(engineerName)) {
          engineersMap.set(engineerName, {
            name: engineerName,
            totalCommission: 0,
            monthlyCommission: 0,
            totalPayments: 0,
            monthlyPayments: 0,
            pendingAmount: 0
          });
        }

        const engineer = engineersMap.get(engineerName);
        const amount = payment.amount || 0;
        const paymentDate = new Date(payment.date);
        const currentDate = new Date();
        
        engineer.totalPayments += amount;
        
        if (paymentDate.getMonth() === currentDate.getMonth() && 
            paymentDate.getFullYear() === currentDate.getFullYear()) {
          engineer.monthlyPayments += amount;
        }
      });

      engineersMap.forEach(engineer => {
        engineer.pendingAmount = engineer.totalCommission - engineer.totalPayments;
      });

      this.engineersSummary = Array.from(engineersMap.values());
      this.notifyAdminListeners();
      
      await this.saveEngineersSummary(this.engineersSummary);
      
      return this.engineersSummary;
    } catch (error) {
      console.error('Error refreshing engineer summaries:', error);
      throw error;
    }
  }

  async refreshUserSummary(userName: string) {
    try {
      if (!userName) return;

      const billsResponse = await fetch(`${API_BASE_URL}/bill`);
      if (!billsResponse.ok) throw new Error('Failed to fetch bills');
      const bills = await billsResponse.json();

      const paymentsResponse = await fetch(`${API_BASE_URL}/payment`);
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const payments = await paymentsResponse.json();

      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      const engineerBills = bills.filter((bill: any) =>
        bill.serviceboyName === userName || bill.serviceBoyName === userName
      );

      const engineerPayments = payments.filter((payment: any) =>
        payment.engineerName === userName
      );

      const totalCommission = engineerBills.reduce((sum: number, bill: any) =>
        sum + (parseFloat(bill.engineerCommission || '0')), 0
      );

      const monthlyCommission = engineerBills
        .filter((bill: any) => new Date(bill.date || bill.createdAt) >= startOfCurrentMonth)
        .reduce((sum: number, bill: any) =>
          sum + (parseFloat(bill.engineerCommission || '0')), 0
        );

      const totalPayments = engineerPayments.reduce((sum: number, payment: any) =>
        sum + parseFloat(payment.amount || '0'), 0
      );

      const monthlyPayments = engineerPayments
        .filter((payment: any) => new Date(payment.date) >= startOfCurrentMonth)
        .reduce((sum: number, payment: any) =>
          sum + parseFloat(payment.amount || '0'), 0
        );

      const pendingAmount = totalCommission - totalPayments;

      this.userSummary = {
        name: userName,
        totalCommission,
        monthlyCommission,
        totalPayments,
        monthlyPayments,
        pendingAmount,
        lastUpdated: new Date().toISOString()
      };

      this.notifyUserListeners();
      
      return this.userSummary;
    } catch (error) {
      console.error('Error refreshing user summary:', error);
      throw error;
    }
  }

  private async saveEngineersSummary(summaries: any[]) {
    try {
      for (const summary of summaries) {
        await fetch(`${API_BASE_URL}/engineer-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            engineerId: summary.id || summary.name,
            engineerName: summary.name,
            monthlyCommission: summary.monthlyCommission,
            monthlyPaid: summary.monthlyPayments,
            pendingAmount: summary.pendingAmount
          })
        });
      }
    } catch (error) {
      console.error('Error saving engineers summary:', error);
    }
  }

  getEngineersSummary() {
    return this.engineersSummary;
  }

  getUserSummary() {
    return this.userSummary;
  }

  clearUserData() {
    this.userSummary = null;
    this.notifyUserListeners();
  }
}

export default CommissionService.getInstance();