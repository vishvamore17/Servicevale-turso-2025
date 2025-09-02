import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../../constants/userapp/CompletedServicesScreenuser.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

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
  formattedCompletedAt?: string;
};

const CompletedServicesScreenUser = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const fetchEngineerData = async (email: string) => {
    try {
      const response = await fetch(`${YOUR_BACKEND_URL}/engineer`);
      const engineers = await response.json();
      const engineer = engineers.result.find(
        (eng: any) => eng.email.toLowerCase() === email.toLowerCase()
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

  const fetchServices = async () => {
    try {
      setLoading(true);
            const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        Alert.alert('Error', 'User not logged in');
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userDataString);
      const email = userData.email;
      setUserEmail(email);

      const engineerName = await fetchEngineerData(email);
      if (!engineerName) {
        Alert.alert('Error', 'Engineer not found');
        setLoading(false);
        return;
      }

      const countResponse = await fetch(
        `${YOUR_BACKEND_URL}/order/count?status=completed&engineerId=${encodeURIComponent(engineerName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (countResponse.ok) {
        const countData = await countResponse.json();
        setCompletedCount(countData.count || 0);
      }

      const response = await fetch(
        `${YOUR_BACKEND_URL}/order/status?status=completed&all=true`,
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
      
      const filteredOrders = ordersData.result.filter(
        (order: any) => order.serviceboyEmail?.toLowerCase() === email.toLowerCase()
      );

      const formattedServices = filteredOrders.map((order: any) => {
        const rawCompletedAt = order.completedAt || order.updatedAt || order.createdAt;
        let serviceDateDisplay = '';
        if (order.serviceDate) {
          const [year, month, day] = order.serviceDate.split('-');
          serviceDateDisplay = `${day}/${month}/${year}`;
        }
        let serviceTimeDisplay = '';
        if (order.serviceTime) {
          const [hours, minutes] = order.serviceTime.split(':');
          const hourNum = parseInt(hours);
          const ampm = hourNum >= 12 ? 'PM' : 'AM';
          const displayHour = hourNum % 12 || 12;
          serviceTimeDisplay = `${displayHour}:${minutes} ${ampm}`;
        }
        
        return {
          id: order.id,
          serviceType: order.serviceType,
          clientName: order.clientName,
          address: order.address,
          phone: order.phoneNumber,
          amount: order.billAmount,
          status: order.status,
          date: rawCompletedAt ? new Date(rawCompletedAt).toLocaleString() : '',
          serviceBoy: order.serviceboyName,
          serviceboyEmail: order.serviceboyEmail,
          serviceDate: serviceDateDisplay,
          serviceTime: serviceTimeDisplay,
          completedAt: rawCompletedAt 
        };
      });

      setServices(formattedServices);
      setAllServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (params.completedService) {
      try {
        const newService = JSON.parse(params.completedService as string);
        if (newService.serviceboyEmail === userEmail) {
          const formattedService = {
            id: newService.id,
            serviceType: newService.serviceType,
            clientName: newService.clientName,
            address: newService.address,
            phone: newService.phone,
            amount: newService.amount,
            status: 'completed',
            date: newService.date || 'Just now',
            serviceBoy: newService.serviceBoy,
            serviceDate: newService.serviceDate || '',
            serviceTime: newService.serviceTime || '',
            serviceboyEmail: newService.serviceboyEmail || '',
            completedAt: newService.completedAt
          };
          setAllServices(prev => [formattedService, ...prev]);
          setServices(prev => {
            if (!dateFilter || (newService.completedAt && isSameDay(new Date(newService.completedAt), dateFilter))) {
              return [formattedService, ...prev];
            }
            return prev;
          });
          setCompletedCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error parsing completed service:', error);
      }
    }
  }, [params.completedService, userEmail]);

  const formatToAmPm = (isoString: string) => {
    const date = new Date(isoString);
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
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      filterByDate(selectedDate);
    }
  };

  const filterByDate = (date: Date) => {
    const filtered = allServices.filter(service => {
      if (!service.completedAt) return false;
      const completedDate = new Date(service.completedAt);
      return isSameDay(completedDate, date);
    });
    setServices(filtered);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setServices(allServices);
  };


  const handleCreateBill = (service: Service) => {
    router.push({
      pathname: '/userapp/userbill',
      params: {
        serviceData: JSON.stringify({
          clientName: service.clientName,
          address: service.address,
          phone: service.phone,
          serviceType: service.serviceType,
          amount: service.amount,
          serviceDate: service.serviceDate,
          serviceTime: service.serviceTime,
          serviceBoy: service.serviceBoy
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
              const response = await fetch(`${YOUR_BACKEND_URL}/order/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'pending'
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to update order');
              }

              setAllServices(prev => prev.filter(service => service.id !== id));
              setServices(prev => prev.filter(service => service.id !== id));
              setCompletedCount(prev => prev - 1);
              
              const movedService = allServices.find(service => service.id === id);
              if (movedService) {
                router.push({
                  pathname: '/userapp/userpending',
                  params: {
                    movedService: JSON.stringify({
                      ...movedService,
                      status: 'pending'
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

  const renderServiceItem = ({ item }: { item: Service }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceTypeContainer}>
          <MaterialCommunityIcons
            name="tools"
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
          <MaterialIcons name="person" size={18} color="#718096" />
          <Text style={styles.detailText}>{item.clientName}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={18} color="#718096" />
          <Text style={styles.detailText}>
            {item.address}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="phone" size={18} color="#718096" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-inr" size={18} color="#718096" />
          <Text style={styles.detailText}>
            {isNaN(Number(item.amount)) ? '0' : Number(item.amount).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

   <View style={styles.serviceFooter}>
  <View style={styles.dateContainer}>
    <MaterialIcons name="check-circle" size={16} color="#718096" />
    <Text style={styles.dateText}>
      {item.completedAt
        ? `${formatToAmPm(item.completedAt)}`
        : 'Completion time not available'}
    </Text>
  </View>
</View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.createBillButton}
          onPress={() => handleCreateBill(item)}
        >
          <MaterialCommunityIcons name="file-document" size={20} color="#FFF" />
          <Text style={styles.createBillButtonText}>Create Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moveToPendingButton}
          onPress={() => handleMoveToPending(item.id)}
        >
          <MaterialIcons name="pending-actions" size={20} color="#FFF" />
          <Text style={styles.moveToPendingButtonText}>Move to Pending</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color="#FFF" />
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
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Completed Services</Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{completedCount}</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={18} color="#5E72E4" />
          <Text style={styles.filterButtonText}>
            {dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by date'}
          </Text>
        </TouchableOpacity>

        {dateFilter && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={clearDateFilter}
          >
            <Feather name="x" size={16} color="#5E72E4" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {services.length > 0 ? (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle" size={48} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {dateFilter
              ? `No services completed on ${format(dateFilter, 'MMMM d, yyyy')}`
              : 'No completed services'
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CompletedServicesScreenUser;