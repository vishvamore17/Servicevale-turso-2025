import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../../constants/userapp/PendingServicesScreenuser.styles';
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
  serviceboyContact: string;
  sortDate: string;
  sortTime: string;
};

const PendingServicesScreenUser = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
        `${YOUR_BACKEND_URL}/order/count?status=pending&engineerId=${encodeURIComponent(engineerName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (countResponse.ok) {
        const countData = await countResponse.json();
        setPendingCount(countData.count || 0);
      }
      const response = await fetch(
        `${YOUR_BACKEND_URL}/order/status?status=pending&all=true`,
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
        const [year, month, day] = order.serviceDate.split('-');
        const displayDate = `${day}/${month}/${year}`;
        const [hours, minutes] = order.serviceTime.split(':');
        const hourNum = parseInt(hours);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum % 12 || 12;
        const displayTime = `${displayHour}:${minutes} ${ampm}`;
        
        return {
          id: order.id,
          serviceType: order.serviceType,
          clientName: order.clientName,
          address: order.address,
          phone: order.phoneNumber,
          amount: order.billAmount,
          status: order.status,
          date: new Date(order.createdAt).toLocaleString(),
          serviceBoy: order.serviceboyName,
          serviceDate: displayDate,
          serviceTime: displayTime,
          serviceboyEmail: order.serviceboyEmail,
          serviceboyContact: order.serviceboyContactNumber,
          sortDate: order.serviceDate,
          sortTime: order.serviceTime
        };
      });

      formattedServices.sort((a: { sortDate: string; sortTime: string; }, b: { sortDate: any; sortTime: any; }) => {
        if (a.sortDate !== b.sortDate) {
          return a.sortDate.localeCompare(b.sortDate);
        }
        return a.sortTime.localeCompare(b.sortTime);
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
    if (params.newService) {
      try {
        const newService = JSON.parse(params.newService as string);
        if (newService.serviceboyEmail === userEmail) {
          const formattedService = {
            id: newService.id,
            serviceType: newService.serviceType,
            clientName: newService.clientName,
            address: newService.address,
            phone: newService.phoneNumber,
            amount: `₹${newService.billAmount || '0'}`,
            status: 'pending',
            date: 'Just now',
            serviceBoy: newService.serviceboyName,
            serviceDate: newService.serviceDate ?
              newService.serviceDate.split('-').reverse().join('/') : '',
            serviceTime: newService.serviceTime || '',
            serviceboyEmail: newService.serviceboyEmail || '',
            serviceboyContact: newService.serviceboyContact || '',
            sortDate: newService.serviceDate || '',
            sortTime: newService.serviceTime || ''
          };
          setAllServices(prev => [formattedService, ...prev]);
          setServices(prev => {
            if (!dateFilter || isSameDay(new Date(newService.serviceDate.split('-').join('/')), dateFilter)) {
              return [formattedService, ...prev];
            }
            return prev;
          });
          setPendingCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error parsing new service:', error);
      }
    }
  }, [params.newService, userEmail]);

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
      const [day, month, year] = service.serviceDate.split('/');
      const serviceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isSameDay(serviceDate, date);
    });
    setServices(filtered);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setServices(allServices);
  };

  const createNotification = async (description: string, userEmail: string) => {
    try {
      const response = await fetch(`${YOUR_BACKEND_URL}/admin-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      console.log('Notification created successfully');
    } catch (error) {
      console.error('Notification creation failed:', error);
      throw error;
    }
  };

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
            const currentTimestamp = new Date().toISOString()
            const response = await fetch(`${YOUR_BACKEND_URL}/order/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'completed',
                completedAt: currentTimestamp 
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to update order');
            }

            const completedService = services.find(service => service.id === id);
            if (!completedService) return;

            const completedServiceWithTimestamp = {
              ...completedService,
              completedAt: currentTimestamp,
              formattedCompletedAt: formatToAmPm(currentTimestamp) 
            };

            try {
              await createNotification(
                `Service Completed\n Engineer : ${completedService.serviceBoy}\n Service : ${completedService.serviceType}\n Customer : ${completedService.clientName}\n Date : ${completedService.serviceDate} at ${completedService.serviceTime}`,
                completedService.serviceboyEmail
              );
            } catch (notificationError) {
              console.warn('Notification failed (service still completed):', notificationError);
            }

            setServices(prev => prev.filter(service => service.id !== id));
            setAllServices(prev => prev.filter(service => service.id !== id));
            setPendingCount(prev => prev - 1);
            
            router.push({
              pathname: '/userapp/usercompleted',
              params: {
                completedService: JSON.stringify(completedServiceWithTimestamp)
              }
            });
          } catch (error) {
            console.error('Error completing service:', error);
            Alert.alert('Error', 'Failed to complete service');
          }
        }
      }
    ]
  );
};

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

        <View style={styles.serviceActions}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/userapp/PhotoComparisonPage',
              params: {
                notes: `Service : ${item.serviceType}\n Customer : ${item.clientName}\n Date : ${item.serviceDate} at ${item.serviceTime}`
              }
            })}
          >
            <MaterialIcons name="photo-camera" size={24} color="#5E72E4" />
          </TouchableOpacity>
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
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
          <MaterialIcons name="access-time" size={16} color="#718096" />
          <Text style={styles.dateText}>
            {item.serviceDate} • {item.serviceTime}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleComplete(item.id)}
        >
          <MaterialIcons name="check-circle" size={20} color="#FFF" />
          <Text style={styles.completeButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.push('/userapp/home')}>
              <Feather name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pending Services</Text>
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
          <TouchableOpacity onPress={() => router.push('/userapp/home')}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Services</Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{pendingCount}</Text>
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
          <MaterialIcons name="pending-actions" size={48} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {dateFilter
              ? `No pending services on ${format(dateFilter, 'MMMM d, yyyy')}`
              : 'No pending services'
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PendingServicesScreenUser;