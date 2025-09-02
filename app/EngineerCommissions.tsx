import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../constants/EngineerCommissions.styles';
import CommissionService from './services/commissionService';
import Constants from 'expo-constants';

const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

type Engineer = {
  id: string;
  name: string;
  commission: number;
  payments: number;
  pending: number;
};

const EngineerCommissionsScreen = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [totalPending, setTotalPending] = useState(0);

    useEffect(() => {
    const unsubscribe = CommissionService.addAdminListener((data) => {
      const formattedEngineers = data.map(engineer => ({
        id: engineer.id || engineer.name, 
        name: engineer.name,
        commission: engineer.totalCommission || 0,
        payments: engineer.totalPayments || 0,
        pending: engineer.pendingAmount || 0
      }));

      setEngineers(formattedEngineers);
      setTotalPending(formattedEngineers.reduce((sum, e) => sum + e.pending, 0));
      setIsLoading(false);
    });

    loadData();

    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await CommissionService.refreshAllEngineerSummaries();
    } catch (error) {
      console.error('Error loading data:', error);
      try {
        const response = await fetch(`${API_BASE_URL}/engineer-commissions`);
        if (response.ok) {
          const data = await response.json();
          const engineersWithCommissions = data.map((engineer: any) => ({
            id: engineer.id || engineer.engineer_id || '',
            name: engineer.name || engineer.engineerName || 'Unknown Engineer',
            commission: parseFloat(engineer.totalCommission) || 0,
            payments: parseFloat(engineer.totalPayments) || 0,
            pending: parseFloat(engineer.pendingAmount) || 0,
          }));
          setEngineers(engineersWithCommissions);
          setTotalPending(engineersWithCommissions.reduce((sum: number, e: any) => sum + e.pending, 0));
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
        Alert.alert('Error', 'Failed to load engineer data');
      } finally {
        setIsLoading(false);
      }
    }
  };


  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/engineer-commissions`);

      if (!response.ok) {
        throw new Error('Failed to fetch engineer commissions');
      }

      const engineersData = await response.json();

      const engineersWithCommissions = engineersData.map((engineer: any) => ({
        id: engineer.id || engineer.engineer_id || '',
        name: engineer.name || engineer.engineerName || 'Unknown Engineer',
        commission: parseFloat(engineer.totalCommission) || 0,
        payments: parseFloat(engineer.totalPayments) || 0,
        pending: parseFloat(engineer.pendingAmount) || 0,
      }));

      const sortedEngineers = engineersWithCommissions.sort((a: any, b: any) => b.pending - a.pending);
      setEngineers(sortedEngineers);
      setTotalPending(sortedEngineers.reduce((sum: number, e: any) => sum + e.pending, 0));

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load engineer data');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToEngineerDetail = (engineer: Engineer) => {
    router.push({
      pathname: '/engineer-detail',
      params: {
        engineerId: engineer.id,
        engineerName: engineer.name
      }
    });
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
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={25} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Engineer Commissions</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.totalCommissionCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="currency-rupee" size={25} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Total Commission</Text>
            <Text style={styles.cardAmount}>
              ₹{engineers.reduce((sum, e) => sum + e.commission, 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.pendingCommissionCard]}>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="pending-actions" size={25} color="#FFF" />
            </View>
            <Text style={styles.cardTitle}>Pending Commission</Text>
            <Text style={[styles.cardAmount, totalPending > 0 && styles.pendingAmount]}>
              ₹{totalPending.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
          </View>
        </View>

        {engineers.map((engineer) => (
          <TouchableOpacity
            key={engineer.id}
            style={styles.engineerCard}
            onPress={() => navigateToEngineerDetail(engineer)}
          >
            <View style={styles.engineerHeader}>
              <View style={styles.itemIconContainer}>
                <MaterialIcons name="engineering" size={25} color="#5E72E4" />
              </View>
              <View style={styles.engineerInfo}>
                <Text style={styles.engineerName}>{engineer.name}</Text>
                <Text style={[
                  styles.engineerStatus,
                  engineer.pending > 0 ? styles.pendingStatus : styles.paidStatus
                ]}>
                  {engineer.pending > 0 ? 'Pending' : 'Paid'}
                </Text>
              </View>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.engineerAmount}>
                ₹{engineer.commission.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              {engineer.pending > 0 && (
                <Text style={styles.pendingStatus}>
                  Pending: ₹{engineer.pending.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default EngineerCommissionsScreen;