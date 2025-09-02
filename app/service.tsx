import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import { styles } from '../constants/ServicePage.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { footerStyles } from '../constants/footer';
import Constants from 'expo-constants';

const BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}/engineer`;

type ServiceKey = 'AC' | 'Washing Machine' | 'Fridge' | 'Microwave';
type Engineer = {
  id: string;
  engineerName: string;
  email: string;
  contactNumber: string;
};

const ServicePage = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceKey>('AC');
  const [selectedServiceboyName, setSelectedServiceboyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchAllEngineers = async () => {
      try {
        const response = await fetch(BASE_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch engineers');
        }
        const data = await response.json();

        if (data.result && Array.isArray(data.result)) {
          setAllEngineers(data.result.map((engineer: any) => ({
            id: engineer.id,
            engineerName: engineer.engineerName,
            email: engineer.email,
            contactNumber: engineer.contactNumber
          })));
        } else {
          if (Array.isArray(data)) {
            setAllEngineers(data.map((engineer: any) => ({
              id: engineer.id,
              engineerName: engineer.engineerName,
              email: engineer.email,
              contactNumber: engineer.contactNumber
            })));
          } else {
            throw new Error('Unexpected API response format');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching engineers:', error);
        Alert.alert('Error', 'Failed to load engineers');
        setLoading(false);
      }
    };
    fetchAllEngineers();
  }, []);

  const handleImagePress = (serviceKey: ServiceKey) => {
    setSelectedServiceType(serviceKey);
    setModalVisible(true);
  };

  const handleEngineerPress = async (
    engineerId: string,
    engineerName: string,
    engineerEmail: string,
    engineerPhone: string
  ) => {
    setModalVisible(false);
    setSelectedServiceboyName(engineerName);
    try {
      router.push({
        pathname: '/order',
        params: {
          applicantId: engineerId,
          applicantName: engineerName,
          serviceType: selectedServiceType,
          applicantEmail: engineerEmail,
          applicantPhone: engineerPhone
        },
      });
    } catch (error) {
      console.error('Error handling engineer press:', error);
      Alert.alert('Error', 'Failed to assign service engineer');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={25} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Selection</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 170 }]}>
        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => handleImagePress('AC')}
          >
            <View style={styles.serviceImageContainer}>
              <Image
                source={require('../assets/images/ac.jpg')}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceButton}>
                <Text style={styles.serviceTitle}>AC Service</Text>
                <View style={styles.serviceButton}>
                  <Text style={styles.serviceButtonText}>Select</Text>
                  <AntDesign name="right" size={15} color="#5E72E4" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => handleImagePress('Washing Machine')}
          >
            <View style={styles.serviceImageContainer}>
              <Image
                source={require('../assets/images/washingmachine.jpg')}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceButton}>
                <Text style={styles.serviceTitle}>Washing Machine Service</Text>
                <View style={styles.serviceButton}>
                  <Text style={styles.serviceButtonText}>Select</Text>
                  <AntDesign name="right" size={16} color="#5E72E4" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => handleImagePress('Fridge')}
          >
            <View style={styles.serviceImageContainer}>
              <Image
                source={require('../assets/images/fridgerepair.jpg')}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceButton}>
                <Text style={styles.serviceTitle}>Fridge Service</Text>
                <View style={styles.serviceButton}>
                  <Text style={styles.serviceButtonText}>Select</Text>
                  <AntDesign name="right" size={16} color="#5E72E4" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={() => handleImagePress('Microwave')}
          >
            <View style={styles.serviceImageContainer}>
              <Image
                source={require('../assets/images/microwave.jpg')}
                style={styles.serviceImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceButton}>
                <Text style={styles.serviceTitle}>Microwave Service</Text>
                <View style={styles.serviceButton}>
                  <Text style={styles.serviceButtonText}>Select</Text>
                  <AntDesign name="right" size={16} color="#5E72E4" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Engineer</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={25} color="#2D3748" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#5E72E4" />
                </View>
              ) : allEngineers.length > 0 ? (
                allEngineers.map((engineer, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleEngineerPress(
                      engineer.id,
                      engineer.engineerName,
                      engineer.email,
                      engineer.contactNumber
                    )}
                    style={styles.applicantItem}
                  >
                    <View style={styles.applicantAvatar}>
                      <MaterialIcons name="engineering" size={25} color="#5E72E4" />
                    </View>
                    <View style={styles.applicantInfo}>
                      <Text style={styles.applicantName}>{engineer.engineerName}</Text>
                      <Text style={styles.applicantEmail}>{engineer.email}</Text>
                    </View>
                    <AntDesign name="right" size={16} color="#A0AEC0" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noApplicants}>
                  <MaterialIcons name="people-outline" size={40} color="#CBD5E0" />
                  <Text style={styles.noApplicantsText}>No engineers added yet</Text>
                  <Text style={styles.noApplicantsText}>Go to "Engineers" tab and add an engineer</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={[footerStyles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
        <TouchableOpacity
          style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
          onPress={() => router.push('/service')}
        >
          <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
            <MaterialIcons name="construction" size={25} color="#FFF" />
          </View>
          <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Service</Text>
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
          style={[footerStyles.bottomButton]}
          onPress={() => router.push('/home')}
        >
          <View style={[footerStyles.bottomButtonIcon]}>
            <Feather name="home" size={20} color="#5E72E4" />
          </View>
          <Text style={[footerStyles.bottomButtonText]}>Home</Text>
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

export default ServicePage;