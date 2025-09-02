import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ScrollView, RefreshControl, Alert } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import styles from '../constants/notification';
import Constants from 'expo-constants';

const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

const AdminNotificationPage = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [previousCount, setPreviousCount] = useState(0);
    const soundRef = useRef<Audio.Sound | null>(null);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(
                `${YOUR_BACKEND_URL}/admin-notifications`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const newNotifications = await response.json();

            if (newNotifications.length > previousCount) {
                playNotificationSound();
            }

            setNotifications(newNotifications);
            setPreviousCount(newNotifications.length);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch notifications');
        } finally {
            setRefreshing(false);
        }
    };

    const playNotificationSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.replayAsync();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.log('Error playing sound', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const response = await fetch(
                `${YOUR_BACKEND_URL}/admin-notifications/${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            setNotifications(prev => prev.filter(notification => notification.id !== id));

        } catch (error) {
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const deleteAllNotifications = async () => {
        Alert.alert(
            'Delete All Notifications',
            'Are you sure you want to delete all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await fetch(
                                `${YOUR_BACKEND_URL}/admin-notifications/all`,
                                {
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                }
                            );

                            if (!response.ok) {
                                throw new Error('Failed to delete all notifications');
                            }

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            setNotifications([]);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete notifications');
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
                <Ionicons name="notifications" size={20} color="#5E72E4" />
            </View>

            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.footer}>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
                <TouchableOpacity onPress={() => deleteNotification(item.id)} style={styles.dismissButton}>
                    <Text style={styles.close}>Dismiss</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/home')}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={deleteAllNotifications}>
                        <MaterialIcons name="delete" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#5E72E4"
                    />
                }
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off" size={48} color="#ccc" />
                        <Text style={styles.noNotificationText}>No notifications</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                ) : (
                    <FlatList
                        scrollEnabled={false}
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminNotificationPage;