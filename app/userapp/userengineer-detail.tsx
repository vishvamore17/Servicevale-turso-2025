import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, SectionList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../../constants/userapp/UserEngineerDetail.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfMonth } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommissionService from '../services/commissionService'; 
import Constants from 'expo-constants';

const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

type TransactionItem = {
  id: string;
  date: string;
  amount: number;
  type: 'commission' | 'payment';
  customerName?: string;
  billNumber?: string;
  serviceType?: string;
  status?: 'completed' | 'pending';
};

type SectionData = {
  title: string;
  data: TransactionItem[];
  totalAmount?: number;
  isMonth?: boolean;
};

type TransactionsData = {
  commissions: SectionData[];
  payments: SectionData[];
};

const UserEngineerDetail = () => {
  const [transactions, setTransactions] = useState<TransactionsData>({
    commissions: [],
    payments: []
  });

  const [filteredTransactions, setFilteredTransactions] = useState<TransactionsData>({
    commissions: [],
    payments: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'commissions' | 'payments'>('commissions');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [commissionData, setCommissionData] = useState({
    monthlyCommission: 0,
    monthlyPayments: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserEmail(userData.email || '');
          fetchEngineerData(userData.email);
        } else {
          Alert.alert('Error', 'User data not found. Please login again.');
        }
      } catch (error) {
        console.error('Error getting user data from storage:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    getUserData();
  }, []);

  useEffect(() => {
    if (!userName) return;

    const unsubscribe = CommissionService.addUserListener((data) => {
      if (data) {
        setCommissionData({
          monthlyCommission: data.monthlyCommission || 0,
          monthlyPayments: data.monthlyPayments || 0,
          pendingAmount: data.pendingAmount || 0
        });
      }
    });

    loadCommissionData();

    return unsubscribe;
  }, [userName]);

  const fetchEngineerData = async (email: string) => {
    try {
      if (!email) return;

      const response = await fetch(`${API_BASE_URL}/engineer`);
      if (!response.ok) throw new Error('Failed to fetch engineer data');

      const engineers = await response.json();

      const engineer = engineers.result.find(
        (eng: any) => eng.email.toLowerCase() === email.toLowerCase()
      );

      if (engineer) {
        console.log('Found engineer:', engineer);
        setUserName(engineer.engineerName);
        fetchAllData(engineer.engineerName);
      } else {
        Alert.alert('Error', 'Engineer not found for this user');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching engineer data:', error);
      Alert.alert('Error', 'Failed to load engineer data');
      setIsLoading(false);
    }
  };

  const loadCommissionData = async () => {
    try {
      if (userName) {
        await CommissionService.refreshUserSummary(userName);
      }
    } catch (error) {
      console.error('Error loading commission data:', error);
      try {
        await fetchCommissionDataFallback();
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
    }
  };

  const fetchCommissionDataFallback = async () => {
    try {
      if (!userName) return;

      const today = new Date();
      const startOfCurrentMonth = startOfMonth(today).toISOString();
      const billsResponse = await fetch(`${API_BASE_URL}/bill`);
      if (!billsResponse.ok) throw new Error('Failed to fetch bills');
      const bills = await billsResponse.json();
      const engineerBills = bills.filter((bill: any) =>
        bill.serviceboyName === userName
      );

      const monthCommission = engineerBills
        .filter((bill: any) => new Date(bill.date) >= new Date(startOfCurrentMonth))
        .reduce((sum: number, bill: any) => sum + (bill.engineerCommission || 0), 0);

      const engineerResponse = await fetch(`${API_BASE_URL}/engineer`);
      const engineers = await engineerResponse.json();
      const engineer = engineers.result.find(
        (eng: any) => eng.engineerName === userName
      );

      let monthPayments = 0;
      if (engineer) {
        const paymentsResponse = await fetch(
          `${API_BASE_URL}/payment/engineer/${engineer.id}/${userName}`
        );
        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          monthPayments = payments
            .filter((payment: any) => new Date(payment.date) >= new Date(startOfCurrentMonth))
            .reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        }
      }

      const totalCommission = engineerBills.reduce((sum: number, bill: any) =>
        sum + (bill.engineerCommission || 0), 0
      );

      const pendingAmount = totalCommission - (monthPayments || 0);

      setCommissionData({
        monthlyCommission: monthCommission,
        monthlyPayments: monthPayments,
        pendingAmount: pendingAmount
      });
    } catch (error) {
      console.error('Error fetching commission data:', error);
    }
  };

  const fetchAllData = async (name: string) => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchCommissions(name),
        fetchPayments(name),
        loadCommissionData()
      ]);
    } catch (error) {
      console.error('Error fetching all data:', error);
      Alert.alert('Error', 'Failed to load commission details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (userEmail && userName) {
      fetchAllData(userName);
    } else {
      const getUserData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            setUserEmail(userData.email || '');
            fetchEngineerData(userData.email);
          }
        } catch (error) {
          console.error('Error getting user data from storage:', error);
          setIsRefreshing(false);
        }
      };
      getUserData();
    }
  };

  const fetchCommissions = async (name: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bill`);
      if (!response.ok) throw new Error('Failed to fetch commissions');
      const bills = await response.json();
      const engineerBills = bills.filter((bill: any) =>
        bill.serviceboyName === name
      );

      const commissionItems: TransactionItem[] = engineerBills.map((bill: any) => ({
        id: bill.id,
        date: bill.date,
        amount: bill.engineerCommission || 0,
        type: 'commission',
        customerName: bill.customerName,
        billNumber: bill.billNumber,
        serviceType: bill.serviceType,
        selected: false
      }));

      const uniqueItems = Array.from(
        new Map(commissionItems.map(item => [item.id, item])).values()
      );

      const newCommissions = groupByDate(uniqueItems, true);

      setTransactions(prev => ({
        ...prev,
        commissions: newCommissions
      }));

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        filterByDateRange(startOfDay, endOfDay);
      } else {
        setFilteredTransactions(prev => ({
          commissions: newCommissions,
          payments: prev.payments
        }));
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      throw error;
    }
  };

  const fetchPayments = async (name: string) => {
    try {
      if (!name) return;
      const engineerResponse = await fetch(`${API_BASE_URL}/engineer`);
      if (!engineerResponse.ok) throw new Error('Failed to fetch engineer data');

      const engineers = await engineerResponse.json();
      const engineer = engineers.result.find(
        (eng: any) => eng.engineerName === name
      );

      if (!engineer) {
        console.error('Engineer not found for name:', name);
        return;
      }
      const response = await fetch(
        `${API_BASE_URL}/payment/engineer/${engineer.id}/${name}`
      );

      if (!response.ok) throw new Error('Failed to fetch payments');

      const payments = await response.json();

      const paymentItems: TransactionItem[] = payments.map((payment: any) => ({
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        type: 'payment',
        status: 'completed'
      }));

      const paymentSections = groupByDate(paymentItems, true);

      setTransactions(prev => ({
        ...prev,
        payments: paymentSections
      }));

      if (!dateFilter) {
        setFilteredTransactions(prev => ({
          ...prev,
          payments: paymentSections
        }));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  };

  const groupByDate = (items: TransactionItem[], groupByMonth = false): SectionData[] => {
    const grouped: { [key: string]: TransactionItem[] } = {};

    items.forEach(item => {
      const date = new Date(item.date);
      let key: string;
      if (groupByMonth) {
        const now = new Date();
        const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
        if (date < oneMonthAgo) {
          key = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        } else {
          key = date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        }
      } else {
        key = date.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return Object.keys(grouped)
      .map(key => {
        const dayTransactions = grouped[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalAmount = dayTransactions.reduce((sum, item) => sum + item.amount, 0);
        const isMonth = key.split(' ').length === 2;
        return {
          title: key,
          data: dayTransactions,
          totalAmount,
          isMonth
        };
      })
      .sort((a, b) => {
        if (a.isMonth && !b.isMonth) return 1;
        if (!a.isMonth && b.isMonth) return -1;
        if (a.isMonth && b.isMonth) {
          return new Date(b.data[0].date).getTime() - new Date(a.data[0].date).getTime();
        }
        return new Date(b.data[0].date).getTime() - new Date(a.data[0].date).getTime();
      });
  };

  const calculateTotalCommission = (): number => {
    return transactions.commissions.reduce((sum: number, section: SectionData) =>
      sum + section.data.reduce((sectionSum: number, item: TransactionItem) =>
        sectionSum + item.amount, 0), 0);
  };

  const calculateTotalPayments = (): number => {
    return transactions.payments.reduce((sum: number, section: SectionData) =>
      sum + section.data.reduce((sectionSum: number, item: TransactionItem) =>
        sectionSum + item.amount, 0), 0);
  };

  const formatItemDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      filterByDateRange(startOfDay, endOfDay);
    }
  }

  const filterByDateRange = (startDate: Date, endDate: Date) => {
    const filteredCommissions = transactions.commissions.map(section => ({
      ...section,
      data: section.data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      })
    })).filter(section => section.data.length > 0);
    const filteredPayments = transactions.payments.map(section => ({
      ...section,
      data: section.data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      })
    })).filter(section => section.data.length > 0);
    setFilteredTransactions({
      commissions: filteredCommissions,
      payments: filteredPayments
    });
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setFilteredTransactions(transactions);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commission Details</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.calendarButton}
        >
          <Feather name="calendar" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {dateFilter && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>
              {format(dateFilter, 'dd MMM yyyy')}
            </Text>
            <TouchableOpacity
              onPress={clearDateFilter}
              style={styles.filterChipClose}
            >
              <Feather name="x" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.commissionCard]}>
          <Text style={styles.summaryLabel}>Monthly Commission</Text>
          <Text style={styles.summaryValue}>
            ₹{commissionData.monthlyCommission.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.paymentCard]}>
          <Text style={styles.summaryLabel}>Monthly Paid</Text>
          <Text style={styles.summaryValue}>
            ₹{commissionData.monthlyPayments.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>
            ₹{commissionData.pendingAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'commissions' && styles.activeTab]}
          onPress={() => setActiveTab('commissions')}
        >
          <Text style={[styles.tabText, activeTab === 'commissions' && styles.activeTabText]}>Commissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Payments</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={activeTab === 'commissions' ? filteredTransactions.commissions : filteredTransactions.payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#5E72E4']}
            tintColor={'#5E72E4'}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={[
            styles.sectionHeader,
            section.isMonth && styles.monthSectionHeader
          ]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionHeaderText}>
                {section.title}
                {section.isMonth && " (Monthly Summary)"}
              </Text>
              {activeTab === 'commissions' && (
                <Text style={[styles.sectionHeaderAmount]}>
                  ₹{section.totalAmount?.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              )}
              {activeTab === 'payments' && (
                <Text style={styles.sectionHeaderAmount1}>
                  ₹{section.totalAmount?.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              )}
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.itemLeft}>
              <View style={styles.itemIconContainer}>
                <MaterialIcons
                  name={item.type === 'commission' ? 'engineering' : 'payment'}
                  size={20}
                  color={item.type === 'commission' ? '#5E72E4' : '#38A169'}
                />
              </View>

              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>
                  {item.type === 'commission' ?
                    `${item.billNumber}` :
                    'Payment Received'}
                </Text>

                {item.type === 'commission' && item.customerName && (
                  <Text style={styles.itemSubtitle}>
                    {item.serviceType}
                  </Text>
                )}

                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemDate}>
                    {formatItemDate(item.date)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <Text style={[
                styles.itemAmount,
                item.type === 'payment' ? styles.paymentAmount : styles.commissionAmount
              ]}>
                ₹{item.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'commissions' ? 'No commissions found' : 'No payments found'}
              {dateFilter && ` on ${format(dateFilter, 'dd MMM yyyy')}`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default UserEngineerDetail;