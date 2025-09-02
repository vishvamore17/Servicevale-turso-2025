import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Pressable, Dimensions, SafeAreaView, RefreshControl } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../constants/Userphoto';
import { footerStyles } from '../constants/footer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

const parseNotes = (notes: string) => {
    if (!notes) return { userName: '', userNotes: '', fullNotes: '' };
    return {
        userName: '', 
        userNotes: '', 
        fullNotes: notes.trim(),
    };
};

interface PhotoDocument {
    id: string;
    beforeImageUrl?: string;
    afterImageUrl?: string;
    date: string;
    notes?: string;
    userEmail: string;
    createdAt: string;
}

const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`; 

const PhotoComparisonPage: React.FC = () => {
    const [photoSets, setPhotoSets] = useState<PhotoDocument[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [previewVisible, setPreviewVisible] = useState<boolean>(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        fetchPhotoSets();
    }, []);

    const fetchPhotoSets = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/photos`);
            
            if (!response.ok) {
                throw new Error('Failed to load photos.');
            }
            
            const data = await response.json();
             const sortedData = data.sort((a: any, b: any) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            setPhotoSets(sortedData);
        } catch (error) {
            Alert.alert('Error', 'Failed to load photos.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPhotoSets();
    };

    const openPreview = (uri: string) => {
        setPreviewImageUrl(uri);
        setPreviewVisible(true);
    };

    const closePreview = () => {
        setPreviewVisible(false);
        setPreviewImageUrl(null);
    };

    const saveBothImagesAndDelete = async (item: PhotoDocument) => {
        setIsLoading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Cannot access gallery.');
                setIsLoading(false);
                return;
            }

            const saveImageToGallery = async (fileUrl?: string) => {
                if (!fileUrl) return;
                
                const fullUrl = fileUrl.startsWith('http') 
                    ? fileUrl 
                    : `${API_BASE_URL}${fileUrl}`;
                
                const localPath = `${FileSystem.cacheDirectory}${fileUrl.split('/').pop()}`;
                const downloadResult = await FileSystem.downloadAsync(fullUrl, localPath);
                await MediaLibrary.createAssetAsync(downloadResult.uri);
            };

            await saveImageToGallery(item.beforeImageUrl);
            await saveImageToGallery(item.afterImageUrl);
            
            const response = await fetch(`${API_BASE_URL}/photos/${item.id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete photo from server.');
            }
            
            Alert.alert('Success', 'Images saved to Gallery and deleted from server');
            fetchPhotoSets();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save or delete images.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !refreshing) {
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
                    <Text style={styles.headerTitle}>Service Photos</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#5E72E4']}
                        tintColor={'#5E72E4'}
                    />
                }
            >
                {photoSets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="photo-library" size={50} color="#A0AEC0" />
                        <Text style={styles.emptyText}>No service photos yet</Text>
                    </View>
                ) : (
                    photoSets.map((item) => (
                        <View key={item.id} style={styles.photoCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.dateBadge}>
                                    <MaterialIcons name="date-range" size={16} color="#FFF" />
                                    <Text style={styles.dateText}>
                                        {new Date(item.date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.photoGrid}>
                                <View style={styles.photoContainer}>
                                    <Text style={styles.photoLabel}>Before</Text>
                                    {item.beforeImageUrl ? (
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (item.beforeImageUrl) {
                                                    const fullUrl = item.beforeImageUrl.startsWith('http') 
                                                        ? item.beforeImageUrl 
                                                        : `${API_BASE_URL}${item.beforeImageUrl}`;
                                                    openPreview(fullUrl);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Image
                                                source={{ 
                                                    uri: item.beforeImageUrl.startsWith('http') 
                                                        ? item.beforeImageUrl 
                                                        : `${API_BASE_URL}${item.beforeImageUrl}`
                                                }}
                                                style={styles.photoImage}
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.placeholder}>
                                            <MaterialIcons name="image-not-supported" size={32} color="#A0AEC0" />
                                            <Text style={styles.placeholderText}>No image</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.photoContainer}>
                                    <Text style={styles.photoLabel}>After</Text>
                                    {item.afterImageUrl ? (
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (item.afterImageUrl) {
                                                    const fullUrl = item.afterImageUrl.startsWith('http') 
                                                        ? item.afterImageUrl 
                                                        : `${API_BASE_URL}${item.afterImageUrl}`;
                                                    openPreview(fullUrl);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Image
                                                source={{ 
                                                    uri: item.afterImageUrl.startsWith('http') 
                                                        ? item.afterImageUrl 
                                                        : `${API_BASE_URL}${item.afterImageUrl}`
                                                }}
                                                style={styles.photoImage}
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.placeholder}>
                                            <MaterialIcons name="image-not-supported" size={32} color="#A0AEC0" />
                                            <Text style={styles.placeholderText}>No image</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {item.notes && (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesText}>
                                        {parseNotes(item.notes).fullNotes || 'No notes provided'}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => saveBothImagesAndDelete(item)}
                                disabled={isLoading}
                            >
                                <MaterialIcons name="save-alt" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Save & Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={previewVisible} transparent animationType="fade">
                <Pressable style={styles.modalBackground} onPress={closePreview}>
                    {previewImageUrl && (
                        <Image
                            source={{ uri: previewImageUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={closePreview}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </Pressable>
            </Modal>

            <View style={[footerStyles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
                <TouchableOpacity
                    style={footerStyles.bottomButton}
                    onPress={() => router.push('/service')}
                >
                    <View style={footerStyles.bottomButtonIcon}>
                        <MaterialIcons name="construction" size={20} color="#5E72E4" />
                    </View>
                    <Text style={footerStyles.bottomButtonText}>Service</Text>
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
                    style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
                    onPress={() => router.push('/userphotos')}
                >
                    <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
                        <MaterialIcons name="photo-library" size={25} color="#FFF" />
                    </View>
                    <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Photos</Text>
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

export default PhotoComparisonPage;