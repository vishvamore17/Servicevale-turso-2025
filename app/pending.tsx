import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { Linking } from 'react-native';
import { styles } from '../constants/PendingServicesScreen.styles';
import Constants from 'expo-constants';

const BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/order`;
const ENGINEER_URL = `${Constants.expoConfig?.extra?.apiUrl}/engineer`;

type Service = {
  id: string;
  serviceType: string;
  clientName: string;
  address: string;
  phoneNumber: string;
  billAmount: string;
  status: string;
  createdAt: string;
  serviceboyName: string;
  serviceDate: string;
  serviceTime: string;
  serviceboyEmail: string;
  serviceboyContactNumber: string;
};

type User = {
  id: string;
  name: string;
};

const PendingServicesScreen = () => {
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
  const [, setFilterType] = useState<'serviceBoy' | 'date'>('serviceBoy');
  const [refreshing, setRefreshing] = useState(false);
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  const [engineerCounts, setEngineerCounts] = useState<Record<string, number>>({});

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

  const fetchAllServices = async () => {
    try {
      setLoading(true);

      const countResponse = await fetch(`${BASE_URL}/count?status=pending`);
      const countData = await countResponse.json();
      const totalCount = countData.count || 0;

      const response = await fetch(`${BASE_URL}/status?status=pending&limit=${totalCount}`);
      const data = await response.json();

      if (!data.result || !Array.isArray(data.result)) {
        console.error('Unexpected API response format:', data);
        Alert.alert('Error', 'Failed to load services - invalid data format');
        return;
      }

      const formattedServices = data.result.map((service: any) => {
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
          phoneNumber: service.phoneNumber,
          billAmount: service.billAmount,
          status: service.status,
          createdAt: service.createdAt,
          serviceboyName: service.serviceboyName,
          serviceboyEmail: service.serviceboyEmail,
          serviceboyContactNumber: service.serviceboyContactNumber,
          serviceDate: displayDate,
          serviceTime: displayTime
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

  const fetchTotalPendingCount = async () => {
    try {
      const response = await fetch(`${BASE_URL}/count?status=pending`);
      const data = await response.json();
      setTotalPendingCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching total pending count:', error);
    }
  };

  const fetchEngineerCounts = async () => {
    try {
      const totalCountResponse = await fetch(`${BASE_URL}/count?status=pending`);
      const totalCountData = await totalCountResponse.json();

      const counts: Record<string, number> = {
        'All Service Engineers': totalCountData.count || 0
      };

      const engineersResponse = await fetch(ENGINEER_URL);
      const engineersData = await engineersResponse.json();

      const engineers = engineersData.result && Array.isArray(engineersData.result)
        ? engineersData.result
        : Array.isArray(engineersData) ? engineersData : [];

      for (const engineer of engineers) {
        const engineerName = engineer.engineerName || engineer.name;
        const engineerCountResponse = await fetch(
          `${BASE_URL}/count?status=pending&engineerId=${encodeURIComponent(engineerName)}`
        );

        if (engineerCountResponse.ok) {
          const engineerCountData = await engineerCountResponse.json();
          counts[engineerName] = engineerCountData.count || 0;
        }
      }

      setEngineerCounts(counts);
    } catch (error) {
      console.error('Error fetching engineer counts:', error);
    }
  };

  const fetchServiceBoys = async () => {
    try {
      const response = await fetch(ENGINEER_URL);
      const data = await response.json();

      if (data.result && Array.isArray(data.result)) {
        setServiceBoys(data.result.map((engineer: any) => ({
          id: engineer.id,
          name: engineer.engineerName
        })));
      } else {
        if (Array.isArray(data)) {
          setServiceBoys(data.map((engineer: any) => ({
            id: engineer.id,
            name: engineer.engineerName
          })));
        } else {
          console.error('Unexpected API response format:', data);
          setServiceBoys([]);
        }
      }
    } catch (error) {
      console.error('Error fetching service boys:', error);
      setServiceBoys([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchAllServices();
      await fetchTotalPendingCount();
      await fetchEngineerCounts();
      await fetchServiceBoys();
    };

    loadData();

    if (params.newService) {
      try {
        const newService = JSON.parse(params.newService as string);
        const formattedService = {
          id: newService.id,
          serviceType: newService.serviceType,
          clientName: newService.clientName,
          address: newService.address,
          phoneNumber: newService.phoneNumber,
          billAmount: newService.billAmount,
          status: 'pending',
          createdAt: newService.createdAt,
          serviceboyName: newService.serviceboyName,
          serviceDate: newService.serviceDate ?
            newService.serviceDate.split('-').reverse().join('/') : '',
          serviceTime: newService.serviceTime || '',
          serviceboyEmail: newService.serviceboyEmail || '',
          serviceboyContactNumber: newService.serviceboyContactNumber || ''
        };

        setAllServices(prev => [formattedService, ...prev]);
        setServices(prev => {
          if ((!selectedServiceBoy || selectedServiceBoy === newService.serviceboyName) &&
            (!dateFilter || isSameDay(new Date(newService.serviceDate.split('-').join('/')), dateFilter))) {
            return [formattedService, ...prev];
          }
          return prev;
        });
        fetchTotalPendingCount();
      } catch (error) {
        console.error('Error parsing new service:', error);
      }
    }
  }, [params.newService]);

  const handleComplete = async (id: string) => {
    Alert.alert(
      'Complete Service',
      'Are you sure this service is completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'completed',
                  completedAt: new Date().toISOString()
                })
              });

              if (!response.ok) {
                throw new Error('Failed to complete service');
              }

              setTotalPendingCount(prev => prev - 1);
              await fetchEngineerCounts();
              setAllServices(prev => prev.filter(service => service.id !== id));
              setServices(prev => prev.filter(service => service.id !== id));

              const completedService = allServices.find(service => service.id === id);
              if (completedService) {
                router.push({
                  pathname: '/completed',
                  params: {
                    completedService: JSON.stringify({
                      ...completedService,
                      status: 'completed',
                      completedAt: new Date().toISOString()
                    })
                  }
                });
              }
            } catch (error) {
              console.error('Error completing service:', error);
              Alert.alert('Error', 'Failed to complete service');
            }
          }
        }
      ]
    );
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

              setTotalPendingCount(prev => prev - 1);
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

  const applyFilters = (serviceBoy: string | null, date: Date | null, servicesToFilter = allServices) => {
    let filtered = servicesToFilter;
    if (serviceBoy) {
      filtered = filtered.filter(service => service.serviceboyName === serviceBoy);
    }
    if (date) {
      filtered = filtered.filter(service => {
        if (!service.serviceDate) return false;
        const [day, month, year] = service.serviceDate.split('/');
        const serviceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return isSameDay(serviceDate, date);
      });
    }
    setServices(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllServices();
    fetchTotalPendingCount();
    fetchEngineerCounts();
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

  const sendManualWhatsAppNotification = (service: Service) => {
    const message = `Hello! ${service.clientName},\n\n` +
      `We are from Service Vale\n\n` +
      `Your ${service.serviceType} service is scheduled for:\n` +
      `📅 Date: ${service.serviceDate}\n` +
      `⏰ Time: ${service.serviceTime}\n\n` +
      `Service Engineer Details:\n` +
      `👨‍🔧 Engineer Name: ${service.serviceboyName}\n` +
      `Service Charge: ₹${service.billAmount}\n\n` +
      `Please be ready for the service. For any queries, contact us: 635-320-2602\n\n` +
      `Thank you for choosing our service!`;
    const phone = service.phoneNumber.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed');
      }
    });
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

        <View style={styles.serviceActions}>
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={20} color="#718096" />
          <Text style={styles.detailText}>{item.clientName}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={20} color="#718096" />
          <Text style={styles.detailText}>
            {item.address}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="phone" size={20} color="#718096" />
          <Text style={styles.detailText}>{item.phoneNumber}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-inr" size={20} color="#718096" />
          <Text style={styles.detailText}>
            {isNaN(Number(item.billAmount)) ? '0' : Number(item.billAmount).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.serviceFooter}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="access-time" size={18} color="#718096" />
          <Text style={styles.dateText}>
            {item.serviceDate} • {item.serviceTime}
          </Text>
        </View>

        <Text style={styles.serviceBoyText}>
          {item.serviceboyName}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => sendManualWhatsAppNotification(item)}
        >
          <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
          <Text style={styles.whatsappButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleComplete(item.id)}
        >
          <MaterialIcons name="check-circle" size={20} color="#FFF" />
          <Text style={styles.completeButtonText}>Complete</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={25} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Services</Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{totalPendingCount}</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedServiceBoy && styles.activeFilter]}
          onPress={() => {
            setFilterType('serviceBoy');
            setFilterModalVisible(true);
          }}
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
                <Feather name="x" size={15} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {dateFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{format(dateFilter, 'dd MMM yyyy')}</Text>
              <TouchableOpacity onPress={clearDateFilter}>
                <Feather name="x" size={15} color="#FFF" />
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
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Text style={styles.statusText}>
                        {engineerCounts[item.name] || 0} Pending
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

      {loading ? (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="large" color="#5E72E4" />
          <Text style={styles.loadingMoreText}>Loading services...</Text>
        </View>
      ) : services.length > 0 ? (
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
          <MaterialIcons name="pending-actions" size={50} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {selectedServiceBoy
              ? `No pending services for ${selectedServiceBoy}`
              : dateFilter
                ? `No pending services on ${format(dateFilter, 'MMMM d, yyyy')}`
                : 'No pending services'
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PendingServicesScreen;