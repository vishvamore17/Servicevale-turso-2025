import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';
import { styles } from '../constants/HomeScreen.styles';
import { footerStyles } from '../constants/footer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommissionService from './services/commissionService';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/order`;
const BILL_URL = `${Constants.expoConfig?.extra?.apiUrl}/bill`;
const COMMISSION_URL = `${Constants.expoConfig?.extra?.apiUrl}/engineer-commissions`;
const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;
const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

const AdminHomeScreen = () => {
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [engineerCommissions, setEngineerCommissions] = useState<{ name: string, amount: number }[]>([]);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [pendingEngineersCount, setPendingEngineersCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();
  const [commissionData, setCommissionData] = useState({
    totalCommission: 0,
    pendingCommission: 0,
    pendingEngineersCount: 0
  });

  useEffect(() => {
    const unsubscribe = CommissionService.addAdminListener((data) => {
      const totalComm = data.reduce((sum, engineer) => sum + (engineer.totalCommission || 0), 0);
      const pendingComm = data.reduce((sum, engineer) => sum + (engineer.pendingAmount || 0), 0);
      const pendingEngineers = data.filter(engineer => (engineer.pendingAmount || 0) > 0).length;
      
      setCommissionData({
        totalCommission: totalComm,
        pendingCommission: pendingComm,
        pendingEngineersCount: pendingEngineers
      });
    });

    loadCommissionData();

    return unsubscribe;
  }, []);

    const loadCommissionData = async () => {
    try {
      await CommissionService.refreshAllEngineerSummaries();
    } catch (error) {
      console.error('Error loading commission data:', error);
      try {
        const response = await fetch(`${YOUR_BACKEND_URL}/engineer-commissions`);
        if (response.ok) {
          const data = await response.json();
          const totalComm = data.reduce((sum: number, engineer: any) => sum + (parseFloat(engineer.totalCommission) || 0), 0);
          const pendingComm = data.reduce((sum: number, engineer: any) => sum + (parseFloat(engineer.pendingAmount) || 0), 0);
          const pendingEngineers = data.filter((engineer: any) => (parseFloat(engineer.pendingAmount) || 0) > 0).length;
          
          setCommissionData({
            totalCommission: totalComm,
            pendingCommission: pendingComm,
            pendingEngineersCount: pendingEngineers
          });
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userData', 'userToken', 'sessionData']);

              try {
                await fetch(`${YOUR_BACKEND_URL}/api/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
              } catch (apiError) {
                console.log('Logout API not available, proceeding with local logout');
              }

              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const fetchRevenueData = async () => {
    try {
      const response = await fetch(BILL_URL);
      const bills = await response.json();

      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const dailyBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt || bill.date);
        return isWithinInterval(billDate, { start: todayStart, end: todayEnd });
      });

      const dailyTotal = dailyBills.reduce((sum: number, bill: any) => {
        return sum + parseFloat(bill.total || 0);
      }, 0);

      const monthlyBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt || bill.date);
        return isWithinInterval(billDate, { start: monthStart, end: monthEnd });
      });

      const monthlyTotal = monthlyBills.reduce((sum: number, bill: any) => {
        return sum + parseFloat(bill.total || 0);
      }, 0);

      setDailyRevenue(dailyTotal);
      setMonthlyRevenue(monthlyTotal);

      const currentMonth = format(new Date(), 'MMMM');
      const currentYear = format(new Date(), 'yyyy');

      await fetch(`${API_BASE_URL}/api/monthly-revenue/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          total: monthlyTotal
        })
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setDailyRevenue(12500.75);
      setMonthlyRevenue(187500.50);
    }
  };

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const pendingResponse = await fetch(`${BASE_URL}/count?status=pending`);
      const pendingData = await pendingResponse.json();
      const completedResponse = await fetch(`${BASE_URL}/count?status=completed`);
      const completedData = await completedResponse.json();

      setPendingCount(pendingData.count);
      setCompletedCount(completedData.count);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchCommissionData = async () => {
    try {
      const response = await fetch(COMMISSION_URL);

      if (!response.ok) {
        throw new Error('Failed to fetch commission data');
      }

      const commissionData = await response.json();

      const totalComm = commissionData.reduce(
        (sum: number, engineer: any) => sum + (parseFloat(engineer.totalCommission) || 0),
        0
      );

      const pendingComm = commissionData.reduce(
        (sum: number, engineer: any) => sum + (parseFloat(engineer.pendingAmount) || 0),
        0
      );

      const pendingEngineers = commissionData.filter(
        (engineer: any) => (parseFloat(engineer.pendingAmount) || 0) > 0
      ).length;

      const topEngineers = commissionData
        .sort((a: any, b: any) => (parseFloat(b.totalCommission) || 0) - (parseFloat(a.totalCommission) || 0))
        .slice(0, 3)
        .map((engineer: any) => ({
          name: engineer.name || engineer.engineerName || 'Unknown',
          amount: parseFloat(engineer.totalCommission) || 0
        }));

      setTotalCommission(totalComm);
      setPendingCommission(pendingComm);
      setPendingEngineersCount(pendingEngineers);
      setEngineerCommissions(topEngineers);
    } catch (error) {
      console.error('Error fetching commission data:', error);
      setTotalCommission(37500);
      setPendingCommission(12500);
      setPendingEngineersCount(3);
      setEngineerCommissions([
        { name: 'John Doe', amount: 15000 },
        { name: 'Jane Smith', amount: 12000 },
        { name: 'Mike Johnson', amount: 10500 }
      ]);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const response = await fetch(`${YOUR_BACKEND_URL}/admin-notifications/count`);

      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }

      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Notification count fetch error:', error);
      setUnreadCount(0);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchRevenueData(),
      fetchOrders(),
      fetchUnreadNotifications(),
      fetchCommissionData()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData().finally(() => setRefreshing(false));
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
        <Text style={styles.headerTitle}>Service Vale</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.notificationIcon}
            onPress={() => router.push('/notification')}
          >
            <MaterialIcons name="notifications" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutIcon}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5E72E4']}
            tintColor={'#5E72E4'}
          />
        }
      >
        <View style={styles.revenueRow}>
          <View style={[styles.revenueCard, styles.dailyCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="today" size={25} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Today's Revenue</Text>
            <Text style={styles.cardAmount}>
              ₹{dailyRevenue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.revenueCard, styles.monthlyCard]}
            onPress={() => router.push('/revenuehistory')}
          >
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="date-range" size={25} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Monthly Revenue</Text>
            <Text style={styles.cardAmount}>
              ₹{monthlyRevenue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
            <View style={styles.viewHistoryLink}>
              <Text style={styles.viewHistoryText}>View History</Text>
              <AntDesign name="right" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.revenueRow}>
          <TouchableOpacity
            style={styles.commissionCard}
            onPress={() => router.push('/EngineerCommissions')}
          >
            <View style={styles.commissionCardHeader}>
              <View style={styles.cardIconContainer}>
                <MaterialIcons name="engineering" size={25} color="#FFF" />
              </View>
              <Text style={styles.commissionCardTitle}>Engineer Commissions</Text>
            </View>

            <View style={styles.commissionStatsContainer}>
              <View style={styles.commissionStat}>
                <Text style={styles.commissionStatLabel}>Total</Text>
                <Text style={styles.commissionStatValue}>
                  ₹{totalCommission.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.commissionStat}>
                <Text style={styles.commissionStatLabel}>Pending</Text>
                <Text style={[styles.commissionStatValue, styles.commissionStatPending]}>
                  ₹{pendingCommission.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.commissionStat}>
                <Text style={styles.commissionStatLabel}>Engineers Due</Text>
                <Text style={styles.commissionStatValue}>
                  {pendingEngineersCount}
                </Text>
              </View>
            </View>

            <View style={styles.commissionCardFooter}>
              <Text style={styles.commissionCardFooterText}>View all commissions</Text>
              <Feather name="chevron-right" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesRow}>
          <View style={[styles.serviceCard, styles.pendingCard]}>
            <View style={styles.serviceCardHeader}>
              <View style={[styles.serviceIconContainer, { backgroundColor: '#FEEBC8' }]}>
                <MaterialIcons name="pending-actions" size={24} color="#DD6B20" />
              </View>
              <Text style={styles.serviceCardTitle}>Pending Services</Text>
            </View>

            <Text style={styles.serviceCardCount}>{pendingCount}</Text>
            <TouchableOpacity
              style={styles.serviceCardButton}
              onPress={() => router.push('/pending')}
            >
              <Text style={styles.serviceCardButtonText}>View All</Text>
              <AntDesign name="right" size={16} color="#5E72E4" />
            </TouchableOpacity>
          </View>

          <View style={[styles.serviceCard, styles.completedCard]}>
            <View style={styles.serviceCardHeader}>
              <View style={[styles.serviceIconContainer, { backgroundColor: '#C6F6D5' }]}>
                <MaterialIcons name="check-circle" size={24} color="#38A169" />
              </View>
              <Text style={styles.serviceCardTitle}>Completed Services</Text>
            </View>

            <Text style={styles.serviceCardCount}>{completedCount}</Text>
            <TouchableOpacity
              style={styles.serviceCardButton}
              onPress={() => router.push('/completed')}
            >
              <Text style={styles.serviceCardButtonText}>View All</Text>
              <AntDesign name="right" size={16} color="#5E72E4" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[footerStyles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/service')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="construction" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/user')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="engineering" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Engineers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
        >
          <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
            <Feather name="home" size={25} color="#FFF" />
          </View>
          <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/userphotos')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="photo-library" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/bill')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <Feather name="file-text" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Bills</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AdminHomeScreen;    