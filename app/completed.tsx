import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { styles } from '../constants/CompletedServicesScreen.styles';
import Constants from 'expo-constants';

const BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/order`;
const ENGINEER_URL = `${Constants.expoConfig?.extra?.apiUrl}/engineer`;

type Service = {
  id: string;
  serviceType: string;
  clientName: string;
  address: string;
  phone: string;
  amount: string;
  status: string;
  date: string;
  serviceBoy: string;
  serviceDate: string;
  serviceTime: string;
  serviceboyEmail: string;
  completedAt?: string;
};

type User = {
  id: string;
  name: string;
};

const AdminCompletedServicesScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceBoys, setServiceBoys] = useState<User[]>([]);
  const [selectedServiceBoy, setSelectedServiceBoy] = useState<string | null>(
    params.engineer ? String(params.engineer) : null
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | null>(
    params.date ? new Date(String(params.date)) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [engineerCounts, setEngineerCounts] = useState<Record<string, number>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const updateUrlParams = (engineer: string | null, date: Date | null) => {
    const newParams: Record<string, string> = {};
    
    if (engineer) {
      newParams.engineer = engineer;
    }
    
    if (date) {
      newParams.date = date.toISOString();
    }
    
    router.setParams(newParams);
  };

  const fetchEngineerData = async () => {
    try {
      const response = await fetch(ENGINEER_URL);
      const engineers = await response.json();
      return engineers.result || [];
    } catch (error) {
      console.error('Error fetching engineer data:', error);
      return [];
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${BASE_URL}/status?status=completed&all=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const ordersData = await response.json();

      const formattedServices = ordersData.result.map((service: any) => {
        let displayDate = '';
        if (service.serviceDate) {
          const [year, month, day] = service.serviceDate.split('-');
          displayDate = `${day}/${month}/${year}`;
        }

        let displayTime = '';
        if (service.serviceTime) {
          const [hours, minutes] = service.serviceTime.split(':');
          const hourNum = parseInt(hours);
          const ampm = hourNum >= 12 ? 'PM' : 'AM';
          const displayHour = hourNum % 12 || 12;
          displayTime = `${displayHour}:${minutes} ${ampm}`;
        }

        return {
          id: service.id,
          serviceType: service.serviceType,
          clientName: service.clientName,
          address: service.address,
          phone: service.phoneNumber,
          amount: service.billAmount,
          status: service.status,
          date: service.createdAt,
          serviceBoy: service.serviceboyName,
          serviceDate: displayDate,
          serviceTime: displayTime,
          serviceboyEmail: service.serviceboyEmail,
          completedAt: service.completedAt
        };
      });

      setAllServices(formattedServices);

      applyFilters(selectedServiceBoy, dateFilter, formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

    const handleDelete = async (id: string) => {
      Alert.alert(
        'Delete Service',
        'Are you sure you want to delete this service order?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',

            onPress: async () => {
              try {
                const response = await fetch(`${BASE_URL}/${id}`, {
                  method: 'DELETE'
                });
  
                if (!response.ok) {
                  throw new Error('Failed to delete service');
                }
  
                setCompletedCount(prev => prev - 1);
                setAllServices(prev => prev.filter(service => service.id !== id));
                setServices(prev => prev.filter(service => service.id !== id));
                Alert.alert('Success', 'Service order deleted successfully.');
              } catch (error) {
                console.error('Error deleting service:', error);
                Alert.alert('Error', 'Failed to delete service order');
              }
            }
          }
        ]
      );
    };

  const fetchCompletedCount = async () => {
    try {
      const engineers = await fetchEngineerData();

      const countResponse = await fetch(`${BASE_URL}/count?status=completed`);
      const countData = await countResponse.json();
      setCompletedCount(countData.count || 0);

      const counts: Record<string, number> = {
        'All Service Engineers': countData.count || 0
      };

      for (const engineer of engineers) {
        const engineerName = engineer.engineerName || engineer.name;
        const engineerCountResponse = await fetch(
          `${BASE_URL}/count?status=completed&engineerId=${encodeURIComponent(engineerName)}`
        );

        if (engineerCountResponse.ok) {
          const engineerCountData = await engineerCountResponse.json();
          counts[engineerName] = engineerCountData.count || 0;
        }
      }

      setEngineerCounts(counts);
    } catch (error) {
      console.error('Error fetching completed count:', error);
    }
  };

  const fetchServiceBoys = async () => {
    try {
      const engineers = await fetchEngineerData();
      setServiceBoys(engineers.map((engineer: any) => ({
        id: engineer.id,
        name: engineer.engineerName
      })));
    } catch (error) {
      console.error('Error fetching service boys:', error);
      setServiceBoys([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchServices();
      await fetchCompletedCount();
      await fetchServiceBoys();
    };

    loadData();
  }, []);

  const applyFilters = (serviceBoy: string | null, date: Date | null, servicesToFilter = allServices) => {
    let filtered = servicesToFilter;

    if (serviceBoy) {
      filtered = filtered.filter(service => service.serviceBoy === serviceBoy);
    }

    if (date) {
      filtered = filtered.filter(service => {
        if (!service.completedAt) return false;
        const completedDate = new Date(service.completedAt);
        return isSameDay(completedDate, date);
      });
    }

    setServices(filtered);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      updateUrlParams(selectedServiceBoy, selectedDate);
      applyFilters(selectedServiceBoy, selectedDate);
    }
  };

  const filterServices = (serviceBoyName: string | null) => {
    setSelectedServiceBoy(serviceBoyName);
    updateUrlParams(serviceBoyName, dateFilter);
    applyFilters(serviceBoyName, dateFilter);
    setFilterModalVisible(false);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    updateUrlParams(selectedServiceBoy, null);
    applyFilters(selectedServiceBoy, null);
  };

  const clearServiceBoyFilter = () => {
    setSelectedServiceBoy(null);
    updateUrlParams(null, dateFilter);
    applyFilters(null, dateFilter);
  };

  const clearAllFilters = () => {
    setSelectedServiceBoy(null);
    setDateFilter(null);
    updateUrlParams(null, null);
    setServices(allServices);
  };

  const formatToAmPm = (isoString: string) => {
    if (!isoString) return 'Completion time not available';

    try {
      const date = new Date(isoString);

      if (isNaN(date.getTime())) {
        return 'Invalid date format';
      }

      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      return `${day}/${month}/${year} • ${hours}:${minutesStr} ${ampm}`;
    } catch (error) {
      console.error('Error formatting date:', error, isoString);
      return 'Date format error';
    }
  };

  const handleCreateBill = (service: Service) => {
    router.push({
      pathname: '/bill',
      params: {
        serviceData: JSON.stringify({
          serviceType: service.serviceType,
          serviceBoy: service.serviceBoy,
          clientName: service.clientName,
          address: service.address,
          phone: service.phone,
          serviceCharge: service.amount,
          serviceDate: service.serviceDate,
          serviceTime: service.serviceTime,
        })
      }
    });
  };

  const handleMoveToPending = async (id: string) => {
    Alert.alert(
      'Move to Pending',
      'Are you sure you want to move this service back to pending?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'pending'
                })
              });

              if (!response.ok) {
                throw new Error('Failed to move service');
              }

              setCompletedCount(prev => prev - 1);
              await fetchCompletedCount();
              setAllServices(prev => prev.filter(service => service.id !== id));
              setServices(prev => prev.filter(service => service.id !== id));

              const movedService = allServices.find(service => service.id === id);
              if (movedService) {
                router.push({
                  pathname: '/pending',
                  params: {
                    movedService: JSON.stringify({
                      ...movedService,
                      status: 'Pending'
                    })
                  }
                });
              }
            } catch (error) {
              console.error('Error moving service:', error);
              Alert.alert('Error', 'Failed to move service to pending');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices().finally(() => setRefreshing(false));
    fetchCompletedCount();
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceTypeContainer}>
          <MaterialIcons
            name="construction"
            size={20}
            color="#5E72E4"
            style={styles.serviceIcon}
          />
          <Text style={styles.serviceType}>{item.serviceType}</Text>
        </View>

        <View style={[styles.statusBadge, styles.completedBadge]}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={20} color="#718096" />
          <Text style={styles.detailText}>{item.clientName}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={20} color="#718096" />
          <Text style={styles.detailText}>{item.address}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="phone" size={20} color="#718096" />
          <Text style={styles.detailText}>{item.phone || 'Not provided'}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-inr" size={20} color="#718096" />
          <Text style={styles.detailText}>
            {(item.amount ? (isNaN(Number(item.amount)) ? '0' : Number(item.amount).toLocaleString('en-IN')) : '0')}
          </Text>
        </View>
      </View>

      <View style={styles.serviceFooter}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="check-circle" size={18} color="#718096" />
          <Text style={styles.dateText}>
            {item.completedAt ? formatToAmPm(item.completedAt) : 'Completion time not available'}
          </Text>
        </View>
        <Text style={styles.serviceBoyText}>{item.serviceBoy}</Text>
      </View>

    <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => handleCreateBill(item)}
        >
          <MaterialIcons name="receipt-long" size={20} color="#FFF" />
          <Text style={styles.whatsappButtonText}>Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleMoveToPending(item.id)}
        >
          <MaterialIcons name="pending-actions" size={20} color="#FFF" />
          <Text style={styles.completeButtonText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.push('/home')}>
              <Feather name="arrow-left" size={25} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Completed Services</Text>
          </View>
          <View style={styles.headerCount}>
            <Text style={styles.headerCountText}>0</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#5E72E4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={25} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Completed Services</Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{completedCount}</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedServiceBoy && styles.activeFilter]}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="engineering" size={20} color={selectedServiceBoy ? "#FFF" : "#5E72E4"} />
          <Text style={[styles.filterButtonText, selectedServiceBoy && styles.activeFilterText]}>
            {selectedServiceBoy ? selectedServiceBoy : 'Filter by Engineer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, dateFilter && styles.activeFilter]}
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialIcons name="today" size={20} color={dateFilter ? "#FFF" : "#5E72E4"} />
          <Text style={[styles.filterButtonText, dateFilter && styles.activeFilterText]}>
            {dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by date'}
          </Text>
        </TouchableOpacity>
      </View>

      {(selectedServiceBoy || dateFilter) && (
        <View style={styles.activeFiltersContainer}>
          {selectedServiceBoy && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedServiceBoy}</Text>
              <TouchableOpacity onPress={clearServiceBoyFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {dateFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{format(dateFilter, 'dd MMM yyyy')}</Text>
              <TouchableOpacity onPress={clearDateFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Service Engineer</Text>
            <FlatList
              style={{ maxHeight: '90%' }}
              contentContainerStyle={styles.scrollContent}
              data={[{ id: 'all', name: 'All Service Engineers' }, ...serviceBoys]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => filterServices(item.name === 'All Service Engineers' ? null : item.name)}
                >
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceType}>{item.name}</Text>
                    <View style={[styles.statusBadge, styles.completedBadge]}>
                      <Text style={styles.statusText}>
                        {engineerCounts[item.name] || 0} Completed
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {services.length > 0 ? (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle" size={50} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {selectedServiceBoy
              ? `No completed services for ${selectedServiceBoy}`
              : dateFilter
                ? `No services completed on ${format(dateFilter, 'MMMM d, yyyy')}`
                : 'No completed services'
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AdminCompletedServicesScreen;