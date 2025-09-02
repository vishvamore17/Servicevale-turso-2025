import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../constants/revenuehistory.style';
import Constants from 'expo-constants';

const BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/api/monthly-revenue`;

type MonthlyRevenue = {
  month: string;
  year: string;
  total: number;
};

const RevenueHistoryScreen = () => {
  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const fetchMonthlyRevenueHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BASE_URL}`);
      const revenues = await response.json();

      const formattedRevenues = revenues.map((doc: any) => ({
        month: doc.month,
        year: doc.year.toString(),
        total: parseFloat(doc.total) || 0
      })).sort((a: any, b: any) => {
        if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
        return getMonthNumber(b.month) - getMonthNumber(a.month);
      });

      setMonthlyRevenues(formattedRevenues);
    } catch (error) {
      console.error('Error fetching revenue history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthNumber = (monthName: string) => {
    return new Date(`${monthName} 1, 2000`).getMonth();
  };

  useEffect(() => {
    fetchMonthlyRevenueHistory();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Revenue History</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {monthlyRevenues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No revenue history available</Text>
        </View>
      ) : (
        <View style={styles.revenueList}>
          {monthlyRevenues.map((revenue, index) => (
            <View key={`${revenue.month}-${revenue.year}`} style={styles.revenueCard}>
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueMonth}>
                  {revenue.month} {revenue.year}
                </Text>
                <Text style={styles.revenueAmount}>
                  ₹{revenue.total.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default RevenueHistoryScreen;