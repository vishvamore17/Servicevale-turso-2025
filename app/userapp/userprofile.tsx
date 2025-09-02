import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { styles } from '../../constants/userapp/ProfileScreen.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

const ProfileScreen = () => {
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        aadharNo: '',
        panNo: '',
        city: '',
    });

    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDataString = await AsyncStorage.getItem('userData');
                
                if (!userDataString) {
                    Alert.alert('Error', 'User not logged in');
                    setLoading(false);
                    return;
                }

                const userData = JSON.parse(userDataString);
                const userEmail = userData.email;

                const response = await fetch(`${YOUR_BACKEND_URL}/engineer`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch engineer data');
                }

                const engineersData = await response.json();
                                const engineer = engineersData.result.find(
                    (eng: any) => eng.email.toLowerCase() === userEmail.toLowerCase()
                );

                if (engineer) {
                    setUser({
                        name: engineer.engineerName || '',
                        email: engineer.email || userEmail,
                        phone: engineer.contactNumber || '',
                        address: engineer.address || '',
                        aadharNo: engineer.aadharNumber || '',
                        panNo: engineer.panNumber || '',
                        city: engineer.city || '',
                    });
                } else {
                    Alert.alert('Error', 'Engineer profile not found');
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load user data');
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Feather name="arrow-left" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Engineer Profile</Text>
                    </View>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#5E72E4" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Engineer Profile</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]} >
                <View style={styles.profileImageContainer}>
                    <MaterialCommunityIcons
                        name="account-circle"
                        size={120}
                        color="#5E72E4"
                    />
                </View>

                <View style={styles.profileInfoContainer}>
                    <View style={styles.infoCard}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="phone" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Contact Number : {user.phone || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="location-on" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Address : {user.address || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="location-city" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Hometown : {user.city || 'Not provided'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Document Information</Text>
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons name="card-account-details" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Aadhar No : {user.aadharNo || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Pan No : {user.panNo || 'Not provided'}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 40 }]}>
                <TouchableOpacity
                    style={[styles.bottomButton, styles.bottomButtonActive]}
                >
                    <View style={[styles.bottomButtonIcon, styles.bottomButtonIconActive]}>
                        <MaterialIcons name="engineering" size={20} color="#FFF" />
                    </View>
                    <Text style={[styles.bottomButtonText, styles.bottomButtonTextActive]}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.bottomButton]}
                    onPress={() => router.push('/userapp/home')}
                >
                    <View style={[styles.bottomButtonIcon]}>
                        <Feather name="home" size={20} color="#5E72E4" />
                    </View>
                    <Text style={styles.bottomButtonText}>Home</Text>
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

export default ProfileScreen;