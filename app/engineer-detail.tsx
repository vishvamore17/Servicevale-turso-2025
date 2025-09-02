import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, SectionList, Modal, TextInput, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../constants/EngineerDetail.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfMonth } from 'date-fns';
import CommissionService from './services/commissionService';
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
  selected?: boolean;
  status?: 'completed' | 'pending';
  engineerCommission?: number;
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

const EngineerDetailScreen = () => {
  const { engineerId, engineerName } = useLocalSearchParams();
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
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonthCommission, setCurrentMonthCommission] = useState(0);
  const [currentMonthPayments, setCurrentMonthPayments] = useState(0);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<TransactionItem[]>([]);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const unsubscribe = CommissionService.addAdminListener((data) => {
      const engineerData = data.find(e => e.name === engineerName);
      if (engineerData) {
        setCurrentMonthCommission(engineerData.monthlyCommission || 0);
        setCurrentMonthPayments(engineerData.monthlyPayments || 0);
      }
    });

    loadData();

    return unsubscribe;
  }, [engineerName]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await CommissionService.refreshAllEngineerSummaries();
      await fetchCommissions();
      await fetchPayments();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchCommissions(),
        fetchPayments()
      ]);
    } catch (error) {
      console.error('Error fetching all data:', error);
      Alert.alert('Error', 'Failed to load engineer details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const fetchCommissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bill`);
      if (!response.ok) throw new Error('Failed to fetch commissions');

      const bills = await response.json();

      const engineerBills = bills.filter((bill: any) =>
        bill.serviceboyName === engineerName
      );

      const today = new Date();
      const startOfCurrentMonth = startOfMonth(today).toISOString();

      const monthCommission = engineerBills
        .filter((bill: any) => new Date(bill.date) >= new Date(startOfCurrentMonth))
        .reduce((sum: number, bill: any) => sum + (bill.engineerCommission || 0), 0);

      setCurrentMonthCommission(monthCommission);

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

  const generateUniqueKey = (item: TransactionItem) => {
    return `${item.type}-${item.id}-${item.date}-${item.amount}`;
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/payment/engineer/${engineerId}/${engineerName}`
      );

      if (!response.ok) throw new Error('Failed to fetch payments');

      const payments = await response.json();

      const today = new Date();
      const startOfCurrentMonth = startOfMonth(today).toISOString();

      const monthPayments = payments
        .filter((payment: any) => new Date(payment.date) >= new Date(startOfCurrentMonth))
        .reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

      setCurrentMonthPayments(monthPayments);

      const paymentItems: TransactionItem[] = payments.map((payment: any) => ({
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        type: 'payment',
        selected: false
      }));

      const uniquePaymentItems = Array.from(
        new Map(paymentItems.map(item => [item.id, item])).values()
      );

      const paymentSections = groupByDate(uniquePaymentItems, true);

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

  const handlePayment = async () => {
    if (!paymentAmount) {
      setPaymentError('Please enter an amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }

    const pendingAmount = calculatePendingAmount();
    if (amount > pendingAmount) {
      setPaymentError(`Amount cannot exceed pending amount (₹${pendingAmount.toLocaleString('en-IN')})`);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engineerId: engineerId,
          engineerName: engineerName,
          amount: amount,
          date: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to record payment');

      await fetchAllData();
      setPaymentAmount('');
      setPaymentError('');
      setShowPaymentModal(false);
      Alert.alert('Success', `Payment of ₹${amount.toLocaleString('en-IN')} recorded`);
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    }
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

  const calculatePendingAmount = (): number => {
    const totalCommission = calculateTotalCommission();
    const totalPayments = calculateTotalPayments();
    return totalCommission - totalPayments;
  };

  const calculateTotalMonthlyCommission = (): number => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return transactions.commissions.reduce((totalSum, section) => {
      const sectionDate = new Date(section.data[0]?.date || 0);
      if (sectionDate.getMonth() === currentMonth &&
        sectionDate.getFullYear() === currentYear) {
        return totalSum + (section.totalAmount || 0);
      }
      return totalSum;
    }, 0);
  };

  const formatItemDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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
  };

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

  const toggleItemSelection = (item: TransactionItem) => {
    if (activeTab !== 'payments') return;

    const updatedTransactions = { ...filteredTransactions };
    let found = false;

    updatedTransactions.payments = updatedTransactions.payments.map(section => {
      const updatedData = section.data.map(i => {
        if (i.id === item.id) {
          found = true;
          return { ...i, selected: !i.selected };
        }
        return i;
      });
      return { ...section, data: updatedData };
    });

    if (found) {
      setFilteredTransactions(updatedTransactions);

      const updatedMainTransactions = { ...transactions };
      updatedMainTransactions.payments = updatedMainTransactions.payments.map(section => {
        const updatedData = section.data.map(i => {
          if (i.id === item.id) {
            return { ...i, selected: !i.selected };
          }
          return i;
        });
        return { ...section, data: updatedData };
      });
      setTransactions(updatedMainTransactions);

      if (item.selected) {
        setSelectedItems(selectedItems.filter(i => i.id !== item.id));
      } else {
        setSelectedItems([...selectedItems, { ...item, selected: true }]);
      }
    }
  };

  const startSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedItems([]);

    const clearSelections = (sections: SectionData[]) =>
      sections.map(section => ({
        ...section,
        data: section.data.map(item => ({ ...item, selected: false }))
      }));

    setTransactions(prev => ({
      ...prev,
      payments: clearSelections(prev.payments)
    }));

    setFilteredTransactions(prev => ({
      ...prev,
      payments: clearSelections(prev.payments)
    }));
  };

  const deleteSelectedPayments = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'No payments selected');
      return;
    }

    try {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete ${selectedItems.length} payment(s)?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const paymentIdsToDelete = selectedItems.map(item => item.id);

              const updatedPayments = transactions.payments
                .map(section => ({
                  ...section,
                  data: section.data.filter(item => !paymentIdsToDelete.includes(item.id))
                }))
                .filter(section => section.data.length > 0);

              const updatedFilteredPayments = dateFilter
                ? updatedPayments
                : updatedPayments;

              setTransactions({
                ...transactions,
                payments: updatedPayments
              });

              setFilteredTransactions({
                ...filteredTransactions,
                payments: updatedFilteredPayments
              });

              const deletedAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0);
              setCurrentMonthPayments(prev => Math.max(0, prev - deletedAmount));

              cancelSelectionMode();

              const response = await fetch(`${API_BASE_URL}/payment`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: paymentIdsToDelete })
              });

              if (!response.ok) throw new Error('Failed to delete payments');

              Alert.alert('Success', 'Payments deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting payments:', error);
      Alert.alert('Error', 'Failed to delete payments');
      fetchAllData();
    }
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
            <Feather name="arrow-left" size={25} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{engineerName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.calendarButton}
        >
          <MaterialIcons name="calendar-today" size={20} color="#FFF" />
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
            ₹{calculateTotalMonthlyCommission().toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.paymentCard]}>
          <Text style={styles.summaryLabel}>Monthly Paid</Text>
          <Text style={styles.summaryValue}>
            ₹{currentMonthPayments.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>
            ₹{calculatePendingAmount().toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'commissions' && styles.activeTab]}
          onPress={() => {
            setActiveTab('commissions');
            if (isSelectionMode) cancelSelectionMode();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'commissions' && styles.activeTabText]}>Commissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'payments' && styles.activeTab]}
          onPress={() => {
            setActiveTab('payments');
            if (isSelectionMode) cancelSelectionMode();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Payments</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'payments' && !isSelectionMode && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={startSelectionMode}
        >
          <Feather name="trash" size={18} color="#FFF" />
          <Text style={styles.editButtonText}>delete Payments</Text>
        </TouchableOpacity>
      )}

      {isSelectionMode && (
        <View style={styles.selectionModeContainer}>
          <TouchableOpacity
            style={styles.cancelSelectionButton}
            onPress={cancelSelectionMode}
          >
            <Feather name="x" size={18} color="#FFF" />
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.selectedCountText}>
            {selectedItems.length} selected
          </Text>

          {selectedItems.length > 0 && (
            <TouchableOpacity
              style={styles.deleteSelectionButton}
              onPress={deleteSelectedPayments}
            >
              <Feather name="trash-2" size={18} color="#FFF" />
              <Text style={styles.deleteSelectionText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {calculateTotalCommission() - calculateTotalPayments() > 0 && !isSelectionMode && (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <MaterialIcons name="add" size={20} color="#FFF" />
          <Text style={styles.payButtonText}>Make Payment</Text>
        </TouchableOpacity>
      )}

      <SectionList
        sections={activeTab === 'commissions' ? filteredTransactions.commissions : filteredTransactions.payments}
        keyExtractor={(item) => generateUniqueKey(item)}
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
        renderItem={({ item, section }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onLongPress={() => activeTab === 'payments' && !isSelectionMode && startSelectionMode()}
            onPress={() => {
              if (isSelectionMode && activeTab === 'payments') {
                toggleItemSelection(item);
              }
            }}
          >
            <View style={styles.itemLeft}>
              {isSelectionMode && activeTab === 'payments' && (
                <View style={styles.checkboxContainer}>
                  <View style={[
                    styles.checkbox,
                    item.selected && styles.checkboxSelected
                  ]}>
                    {item.selected && (
                      <Feather name="check" size={14} color="#FFF" />
                    )}
                  </View>
                </View>
              )}
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
                    'Payment to Engineer'}
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
          </TouchableOpacity>
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

      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Feather name="x" size={25} color="2D3748" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>To : {engineerName}</Text>
              <View style={styles.paymentSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pending Amount :</Text>
                  <Text style={[styles.summaryValue, styles.pendingValue]}>
                    ₹{(calculateTotalCommission() - calculateTotalPayments()).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.paymentInput}
                placeholder="Enter amount"
                placeholderTextColor="#A0AEC0"
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentAmount(text);
                  if (paymentError) setPaymentError('');

                  if (text) {
                    const amount = parseFloat(text);
                    if (!isNaN(amount)) {
                      const pendingAmount = calculatePendingAmount();
                      if (amount > pendingAmount) {
                        setPaymentError(`Amount cannot exceed pending amount (₹${pendingAmount.toLocaleString('en-IN')})`);
                      } else {
                        setPaymentError('');
                      }
                    }
                  }
                }}
              />
              {paymentError ? (
                <Text style={styles.errorText}>{paymentError}</Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!!paymentError || !paymentAmount || parseFloat(paymentAmount) > calculatePendingAmount()) &&
                  styles.disabledButton
                ]}
                onPress={handlePayment}
                disabled={!!paymentError || !paymentAmount || parseFloat(paymentAmount) > calculatePendingAmount()}
              >
                <Text style={styles.submitButtonText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EngineerDetailScreen;