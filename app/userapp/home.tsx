import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';
import { styles } from '../../constants/userapp/HomeScreenuser.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommissionService from '../services/commissionService';
import Constants from 'expo-constants';

const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

const HomeScreenuser = () => {
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [commissionData, setCommissionData] = useState({
    totalCommission: 0,
    pendingCommission: 0
  });
  const [userName, setUserName] = useState('');
  const insets = useSafeAreaInsets();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserEmail(userData.email);
          setUserName(userData.name || '');
        }
      } catch (error) {
        console.error('Error getting user email:', error);
      }
    };
    getUserEmail();
  }, []);

  useEffect(() => {
    if (!userName) return;

    const unsubscribe = CommissionService.addUserListener((data) => {
      if (data) {
        setCommissionData({
          totalCommission: data.monthlyCommission || 0,
          pendingCommission: data.pendingAmount || 0
        });
      }
    });

    loadCommissionData();

    return unsubscribe;
  }, [userName]);

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
              CommissionService.clearUserData();
              
              await AsyncStorage.multiRemove(['userData', 'userToken', 'sessionData']);
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

  const fetchEngineerData = async () => {
    try {
      if (!userEmail) return;

      const response = await fetch(`${YOUR_BACKEND_URL}/engineer`);
      const engineers = await response.json();

      const engineer = engineers.result.find(
        (eng: any) => eng.email.toLowerCase() === userEmail.toLowerCase()
      );

      if (engineer) {
        return engineer.engineerName; 
      }

      return null;
    } catch (error) {
      console.error('Error fetching engineer data:', error);
      return null;
    }
  };

  const fetchRevenueData = async () => {
    try {
      const engineerName = await fetchEngineerData();
      if (!engineerName) return;

      const response = await fetch(`${YOUR_BACKEND_URL}/bill`);
      const bills = await response.json();

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const dailyBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt || bill.date);
        return billDate >= startOfDay &&
          (bill.serviceboyName === engineerName || bill.serviceBoyName === engineerName);
      });

      const monthlyBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt || bill.date);
        return billDate >= startOfMonth &&
          (bill.serviceboyName === engineerName || bill.serviceBoyName === engineerName);
      });

      const dailyTotal = dailyBills.reduce((sum: number, bill: any) =>
        sum + parseFloat(bill.total || 0), 0
      );

      const monthlyTotal = monthlyBills.reduce((sum: number, bill: any) =>
        sum + parseFloat(bill.total || 0), 0
      );

      setDailyRevenue(dailyTotal);
      setMonthlyRevenue(monthlyTotal);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
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
      const engineerName = await fetchEngineerData();
      if (!engineerName) return;

      const response = await fetch(`${YOUR_BACKEND_URL}/bill`);
      const bills = await response.json();

      const today = new Date();
      const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentMonthBills = bills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt || bill.date);
        return billDate >= startOfCurrentMonth &&
          (bill.serviceboyName === engineerName || bill.serviceBoyName === engineerName);
      });

      const allBills = bills.filter((bill: any) =>
        bill.serviceboyName === engineerName || bill.serviceBoyName === engineerName
      );

      const engineerResponse = await fetch(`${YOUR_BACKEND_URL}/engineer`);
      const engineers = await engineerResponse.json();
      const engineer = engineers.result.find(
        (eng: any) => eng.engineerName === engineerName
      );

      let totalPayments = 0;
      if (engineer) {
        const paymentsResponse = await fetch(
          `${YOUR_BACKEND_URL}/payment/engineer/${engineer.id}/${engineerName}`
        );

        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          totalPayments = payments.reduce((sum: number, payment: any) =>
            sum + parseFloat(payment.amount || '0'), 0
          );
        }
      }

      const total = currentMonthBills.reduce((sum: number, bill: any) => {
        return sum + (parseFloat(bill.serviceCharge || '0') * 0.25);
      }, 0);

      const totalCommissionsAllTime = allBills.reduce((sum: number, bill: any) => {
        return sum + (parseFloat(bill.serviceCharge || '0') * 0.25);
      }, 0);

      const pending = totalCommissionsAllTime - totalPayments;

      setCommissionData({
        totalCommission: total,
        pendingCommission: pending
      });
    } catch (error) {
      console.error('Error fetching commission data:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setRefreshing(true);

      if (!userEmail) {
        setPendingCount(0);
        setCompletedCount(0);
        return;
      }

      const engineerName = await fetchEngineerData();

      if (!engineerName) {
        console.log('No engineer found for email:', userEmail);
        setPendingCount(0);
        setCompletedCount(0);
        return;
      }

      const pendingResponse = await fetch(
        `${YOUR_BACKEND_URL}/order/count?status=pending&engineerId=${encodeURIComponent(engineerName)}`
      );

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingCount(pendingData.count || 0);
      }

      const completedResponse = await fetch(
        `${YOUR_BACKEND_URL}/order/count?status=completed&engineerId=${encodeURIComponent(engineerName)}`
      );

      if (completedResponse.ok) {
        const completedData = await completedResponse.json();
        setCompletedCount(completedData.count || 0);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      if (!userEmail) {
        setUnreadCount(0);
        return;
      }

      const response = await fetch(
        `${YOUR_BACKEND_URL}/notifications/${encodeURIComponent(userEmail)}/count`
      );

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

  useEffect(() => {
    if (!userEmail) return;

    const pollNotifications = () => {
      fetchUnreadNotifications();
    };

    const pollInterval = setInterval(pollNotifications, 30000);
    return () => clearInterval(pollInterval);
  }, [userEmail]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchRevenueData(),
      fetchOrders(),
      fetchUnreadNotifications(),
      loadCommissionData() 
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (userEmail && userName) {
      fetchAllData();
    }
  }, [userEmail, userName]);

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
            onPress={() => router.push('/userapp/usernotification')}
          >
            <MaterialIcons name="notifications" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
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
              <MaterialIcons name="today" size={24} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Today's Revenue</Text>
            <Text style={styles.cardAmount}>
              ₹{dailyRevenue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>

          <View style={[styles.revenueCard, styles.monthlyCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="date-range" size={24} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Monthly Revenue</Text>
            <Text style={styles.cardAmount}>
              ₹{monthlyRevenue.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.commissionCard}
          onPress={() => router.push('/userapp/userengineer-detail')}
        >
          <View style={styles.commissionCardHeader}>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="engineering" size={24} color="#FFF" />
            </View>
            <Text style={styles.commissionCardTitle}>Commission Details</Text>
          </View>

          <View style={styles.commissionStatsContainer}>
            <View style={styles.commissionStat}>
              <Text style={styles.commissionStatLabel}>Total</Text>
              <Text style={styles.commissionStatValue}>
                ₹{commissionData.totalCommission.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.commissionStat}>
              <Text style={styles.commissionStatLabel}>Pending</Text>
              <Text style={[styles.commissionStatValue, styles.commissionStatPending]}>
                ₹{commissionData.pendingCommission.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={styles.commissionCardFooter}>
            <Text style={styles.commissionCardFooterText}>View all commissions</Text>
            <Feather name="chevron-right" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>

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
              onPress={() => router.push('/userapp/userpending')}
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
              onPress={() => router.push('/userapp/usercompleted')}
            >
              <Text style={styles.serviceCardButtonText}>View All</Text>
              <AntDesign name="right" size={16} color="#5E72E4" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => router.push('/userapp/userprofile')}
        >
          <View style={styles.bottomButtonIcon}>
            <MaterialIcons name="engineering" size={20} color="#5E72E4" />
          </View>
          <Text style={styles.bottomButtonText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.bottomButtonActive]}
        >
          <View style={[styles.bottomButtonIcon, styles.bottomButtonIconActive]}>
            <Feather name="home" size={20} color="#FFF" />
          </View>
          <Text style={[styles.bottomButtonText, styles.bottomButtonTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => router.push('/userapp/userbill')}
        >
          <View style={styles.bottomButtonIcon}>
            <Feather name="file-text" size={20} color="#5E72E4" />
          </View>
          <Text style={styles.bottomButtonText}>Bills</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreenuser;