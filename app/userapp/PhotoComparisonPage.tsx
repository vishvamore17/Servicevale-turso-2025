import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Pressable, Dimensions, SafeAreaView, RefreshControl, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../../constants/userapp/Userphoto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

type ImagePickerResult = {
    uri: string;
    fileName?: string;
    fileSize?: number;
    type?: string;
};

type PhotoSet = {
    id: string;
    beforeImageUrl: string;
    afterImageUrl: string;
    notes?: string;
    date: string;
    userEmail: string;
    status: 'pending' | 'completed';
    engineerName?: string;
};

const PhotoComparisonPage = () => {
    const [beforeImage, setBeforeImage] = useState<ImagePickerResult | null>(null);
    const [afterImage, setAfterImage] = useState<ImagePickerResult | null>(null);
    const { notes: initialNotes, serviceId, existingPhotoSetId } = useLocalSearchParams();
    const [notes, setNotes] = useState(Array.isArray(initialNotes) ? initialNotes.join('\n') : initialNotes || '');
    const [photoSets, setPhotoSets] = useState<PhotoSet[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [editingPhotoSetId, setEditingPhotoSetId] = useState<string | null>(
        Array.isArray(existingPhotoSetId) ? existingPhotoSetId[0] : existingPhotoSetId || null
    );    
    const [serviceDetails, setServiceDetails] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [userName, setUserName] = useState<string>('');

    const [buttonsEnabled, setButtonsEnabled] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const buttonTimerRef = useRef<number | null>(null);

    const router = useRouter();

    useEffect(() => {
        const getUserEmail = async () => {
            try {
                const userDataString = await AsyncStorage.getItem('userData');
                if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    setUserEmail(userData.email);
                    setUserName(userData.name || userData.username || 'User');
                }
            } catch (error) {
                console.error('Error getting user email:', error);
            }
        };

        getUserEmail();
        
        if (serviceId) {
            fetchServiceDetails(Array.isArray(serviceId) ? serviceId[0] : serviceId);
        }
    }, [serviceId]);

     const fetchServiceDetails = async (id: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/services/${id}`);
            if (response.ok) {
                const serviceData = await response.json();
                setServiceDetails(serviceData);
            }
        } catch (error) {
            console.error('Error fetching service details:', error);
        }
    };

    useEffect(() => {
        if (userEmail) {
            fetchPhotoSets();
            if (editingPhotoSetId) {
                loadExistingPhotoSet(editingPhotoSetId);
            }
        }
    }, [userEmail, editingPhotoSetId]);

    const loadExistingPhotoSet = async (photoSetId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/photos/${photoSetId}`);
            if (response.ok) {
                const photoSet = await response.json();
                setNotes(photoSet.notes || '');

                if (photoSet.beforeImageUrl) {
                    setBeforeImage({
                        uri: `${API_BASE_URL}${photoSet.beforeImageUrl}`,
                        fileName: 'existing_before.jpg'
                    });
                }

                if (photoSet.afterImageUrl) {
                    setAfterImage({
                        uri: `${API_BASE_URL}${photoSet.afterImageUrl}`,
                        fileName: 'existing_after.jpg'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading existing photo set:', error);
        }
    };

    const fetchPhotoSets = async () => {
        if (!userEmail) return;

        try {
            const response = await fetch(`${API_BASE_URL}/photos/user/${userEmail}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const sortedData = data.sort((a: PhotoSet, b: PhotoSet) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            });

            setPhotoSets(sortedData);
        } catch (error) {
            console.error('Error fetching photos:', error);
            Alert.alert('Error', 'Failed to fetch photos. Please check your connection.');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPhotoSets().finally(() => setRefreshing(false));
    };

    useEffect(() => {
        return () => {
            if (buttonTimerRef.current) {
                clearTimeout(buttonTimerRef.current);
            }
        };
    }, []);

   const takePhoto = async (setImage: (image: ImagePickerResult | null) => void, imageType: 'before' | 'after') => {
    try {
        if (editingPhotoSetId && imageType === 'before') {
            Alert.alert('Cannot Change', 'Before image cannot be changed once uploaded.');
            return;
        }
        if (imageType === 'after' && !editingPhotoSetId) {
            Alert.alert(
                'Edit Mode Required',
                'Please click the "Edit" button on an existing photo set to add an after image.',
                [
                    { text: 'OK', style: 'default' }
                ]
            );
            return;
        }

        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
            Alert.alert('Permission Denied', 'Camera access is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            const imageResult: ImagePickerResult = {
                uri: asset.uri,
                fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                fileSize: asset.fileSize || 0,
                type: asset.type || 'image/jpeg',
            };
            setImage(imageResult);

            setButtonsEnabled(false);
            setTimeRemaining(3);

            if (buttonTimerRef.current) {
                clearTimeout(buttonTimerRef.current);
            }

            const countdownInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            buttonTimerRef.current = setTimeout(() => {
                setButtonsEnabled(true);
                setTimeRemaining(0);
                clearInterval(countdownInterval);
            }, 3000);
        }
    } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
    }
};


    const handleClearImage = (setImage: (image: ImagePickerResult | null) => void) => {
        setImage(null);
        if ((setImage === setBeforeImage && !afterImage) ||
            (setImage === setAfterImage && !beforeImage)) {
            setButtonsEnabled(false);
        }
    };

    const createNotification = async (description: string, userEmail: string) => {
        try {
            let fullDescription = description;
            
            if (serviceDetails) {
                fullDescription += `\nCustomer: ${serviceDetails.customerName || 'N/A'}`;
                fullDescription += `\nService: ${serviceDetails.serviceType || 'N/A'}`;
                fullDescription += `\nDate: ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}`;
            }

            const response = await fetch(`${API_BASE_URL}/admin-notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: fullDescription,
                    userEmail,
                    isRead: false
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

    const handleSubmit = async () => {
        if (!beforeImage && !afterImage) {
            Alert.alert('Missing Image', 'Take at least one photo.');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            const prepareImageForUpload = async (image: ImagePickerResult, fieldName: string) => {
                if (image.uri.startsWith(API_BASE_URL)) {
                    const relativeUrl = image.uri.replace(API_BASE_URL, '');
                    formData.append(`${fieldName}Url`, relativeUrl);
                    return;
                }
                try {
                    const fileInfo = await FileSystem.getInfoAsync(image.uri);

                    if (!fileInfo.exists) {
                        throw new Error('File does not exist');
                    }
                    const filename = image.fileName || image.uri.split('/').pop() || `${fieldName}_${Date.now()}.jpg`;

                    const file = {
                        uri: image.uri,
                        name: filename,
                        type: 'image/jpeg',
                    } as any; 

                    formData.append(fieldName, file);
                } catch (error) {
                    console.error(`Error preparing ${fieldName} image:`, error);
                    Alert.alert('Error', `Failed to process ${fieldName} image`);
                    throw error;
                }
            };

            if (beforeImage) {
                await prepareImageForUpload(beforeImage, 'beforeImage');
            }

            if (afterImage) {
                await prepareImageForUpload(afterImage, 'afterImage');
            }

            formData.append('notes', notes);
            formData.append('userEmail', userEmail);
            formData.append('date', new Date().toISOString());

            if (serviceId) {
                formData.append('serviceId', Array.isArray(serviceId) ? serviceId[0] : serviceId);
            }

            let url = `${API_BASE_URL}/photos`;
            let method = 'POST';

            if (editingPhotoSetId) {
                url = `${API_BASE_URL}/photos/${editingPhotoSetId}`;
                method = 'PUT';
                formData.append('id', editingPhotoSetId);
            }

            console.log('Submitting form data...');

            const response = await fetch(url, {
                method: method,
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', response.status, errorText);
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Server response:', result);

        if (result.success) {
            try {
                let notificationDescription;
                if (method === 'POST') {
                    notificationDescription = `Before image uploaded by ${userName} with notes: ${notes || 'No notes provided'}`;
                } else {
                    notificationDescription = `After image uploaded by ${userName} with notes: ${notes || 'No notes provided'}`;
                }
                await createNotification(notificationDescription, userEmail);
            } catch (notificationError) {
                console.warn('Notification failed (photo still uploaded):', notificationError);
            }
                Alert.alert('Success', editingPhotoSetId ? 'Photo updated successfully!' : 'Photo saved successfully!');
                setBeforeImage(null);
                setAfterImage(null);
                setNotes('');
                setEditingPhotoSetId(null);

                if (editingPhotoSetId) {
                    fetchPhotoSets();
                } else {
                    const newPhotoSet: PhotoSet = {
                        id: result.id || Date.now().toString(),
                        beforeImageUrl: result.beforeImageUrl || '',
                        afterImageUrl: result.afterImageUrl || '',
                        notes: notes,
                        date: new Date().toISOString(),
                        userEmail: userEmail,
                        status: 'pending'
                    };

                    setPhotoSets(prevSets => [newPhotoSet, ...prevSets]);
                }

                if (serviceId) {
                    router.back();
                }
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const openPreview = (imageUrl: string) => {
        setPreviewImageUrl(imageUrl);
        setPreviewVisible(true);
    };

    const closePreview = () => {
        setPreviewVisible(false);
        setPreviewImageUrl(null);
    };

    const deletePhotoSet = async (photoSet: PhotoSet) => {
        try {
            const response = await fetch(`${API_BASE_URL}/photos/${photoSet.id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (response.ok && result.success) {
                Alert.alert('Success', 'Photo set deleted successfully.');
                fetchPhotoSets();
            } else {
                Alert.alert('Error', result.message || 'Failed to delete photo set');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to delete photo set');
        }
    };

    const editPhotoSet = (photoSet: PhotoSet) => {
        setEditingPhotoSetId(photoSet.id);
        setNotes(photoSet.notes || '');

        if (photoSet.beforeImageUrl) {
            setBeforeImage({
                uri: `${API_BASE_URL}${photoSet.beforeImageUrl}`,
                fileName: 'existing_before.jpg'
            });
        }

        if (photoSet.afterImageUrl) {
            setAfterImage({
                uri: `${API_BASE_URL}${photoSet.afterImageUrl}`,
                fileName: 'existing_after.jpg'
            });
        }
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const cancelEdit = () => {
        setEditingPhotoSetId(null);
        setBeforeImage(null);
        setAfterImage(null);
        setNotes('');
    };

    const saveBothImages = async (item: PhotoSet) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Needed',
                    'Allow access to save images to your gallery',
                );
                return;
            }

            if (item.beforeImageUrl) {
                const beforeUri = `${API_BASE_URL}${item.beforeImageUrl}`;
                const fileUri = FileSystem.documentDirectory + `before_${Date.now()}.jpg`;
                const { uri } = await FileSystem.downloadAsync(beforeUri, fileUri);
                await MediaLibrary.saveToLibraryAsync(uri);
            }

            if (item.afterImageUrl) {
                const afterUri = `${API_BASE_URL}${item.afterImageUrl}`;
                const fileUri = FileSystem.documentDirectory + `after_${Date.now()}.jpg`;
                const { uri } = await FileSystem.downloadAsync(afterUri, fileUri);
                await MediaLibrary.saveToLibraryAsync(uri);
            }

            Alert.alert('Success', 'Images saved to your gallery!');
        } catch (error) {
            console.error('Error saving images:', error);
            Alert.alert('Error', 'Failed to save images to gallery');
        }
    };

    const scrollViewRef = React.useRef<ScrollView>(null);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={cancelEdit}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {editingPhotoSetId ? 'Edit Photos' : 'Click Photos'}
                    </Text>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#5E72E4']}
                        tintColor={'#5E72E4'}
                    />
                }
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.section}>
                    <View style={styles.photoButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.photoButton, beforeImage && styles.photoButtonActive]}
                            onPress={() => takePhoto(setBeforeImage, 'before')}
                            disabled={!!(editingPhotoSetId && beforeImage !== null)}
                        >
                            <MaterialIcons
                                name="photo-camera"
                                size={24}
                                color={beforeImage ? "#FFF" : "#5E72E4"}
                            />
                            <Text style={[styles.photoButtonText, beforeImage && styles.photoButtonTextActive]}>
                                Before
                            </Text>

                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.photoButton, afterImage && styles.photoButtonActive]}
                            onPress={() => takePhoto(setAfterImage, 'after')}
                        >
                            <MaterialIcons
                                name="photo-camera"
                                size={24}
                                color={afterImage ? "#FFF" : "#5E72E4"}
                            />
                            <Text style={[styles.photoButtonText, afterImage && styles.photoButtonTextActive]}>
                                After
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {beforeImage || afterImage ? (
                        <View style={styles.previewContainer}>
                            {beforeImage && (
                                <View style={styles.imagePreviewWrapper}>
                                    <Text style={styles.previewLabel}>Before</Text>
                                    <Image
                                        source={{ uri: beforeImage.uri }}
                                        style={styles.imagePreview}
                                    />
                                    {!editingPhotoSetId && (
                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => handleClearImage(setBeforeImage)}
                                        >
                                            <Ionicons name="close" size={20} color="#FFF" />
                                        </TouchableOpacity>
                                    )}

                                </View>
                            )}
                            {afterImage && (
                                <View style={styles.imagePreviewWrapper}>
                                    <Text style={styles.previewLabel}>After</Text>
                                    <Image
                                        source={{ uri: afterImage.uri }}
                                        style={styles.imagePreview}
                                    />
                                    <TouchableOpacity
                                        style={styles.clearButton}
                                        onPress={() => handleClearImage(setAfterImage)}
                                    >
                                        <Ionicons name="close" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                       <Text style={styles.instructionText}>
    {editingPhotoSetId 
        ? 'Take after photo or update notes' 
        : 'Take before photo first, then edit later to add after photo'}
</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Photos Details</Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        style={[styles.notesInput, { textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Add notes about these photos..."
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (isUploading || (!beforeImage && !afterImage) || !buttonsEnabled) && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={isUploading || (!beforeImage && !afterImage) || !buttonsEnabled}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <MaterialIcons name="save" size={20} color="#FFF" />
                            <Text style={styles.submitButtonText}>
                                {editingPhotoSetId ? 'Update Photo' : 'Save Photo'}
                            </Text>

                        </>
                    )}
                </TouchableOpacity>

                {!editingPhotoSetId && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your History</Text>
                        {photoSets.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="photo-library" size={48} color="#CBD5E0" />
                                <Text style={styles.emptyText}>No photos yet</Text>
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
                                        <TouchableOpacity

                                            onPress={() => editPhotoSet(item)}
                                        >
                                            <Feather name="edit" size={16} color="#5E72E4" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.photoGrid}>
                                        <View style={styles.photoContainer}>
                                            <Text style={styles.photoLabel}>Before</Text>
                                            {item.beforeImageUrl ? (
                                                <TouchableOpacity
                                                    onPress={() => openPreview(`${API_BASE_URL}${item.beforeImageUrl}`)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image
                                                        source={{ uri: `${API_BASE_URL}${item.beforeImageUrl}` }}
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
                                                    onPress={() => openPreview(`${API_BASE_URL}${item.afterImageUrl}`)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image
                                                        source={{ uri: `${API_BASE_URL}${item.afterImageUrl}` }}
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
                                                {item.notes || 'No notes provided'}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.actionButtonsContainer}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.saveButton]}
                                            onPress={() => saveBothImages(item)}
                                        >
                                            <MaterialIcons name="save-alt" size={20} color="#FFF" />
                                            <Text style={styles.actionButtonText}>Save to Gallery</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.deleteButton]}
                                            onPress={() =>
                                                Alert.alert('Confirm Delete', 'Are you sure you want to delete this images?', [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Delete',
                                                        style: 'destructive',
                                                        onPress: () => deletePhotoSet(item),
                                                    },
                                                ])
                                            }
                                        >
                                            <MaterialIcons name="delete" size={20} color="#FFF" />
                                            <Text style={styles.actionButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
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
        </SafeAreaView>
    );
};

export default PhotoComparisonPage;