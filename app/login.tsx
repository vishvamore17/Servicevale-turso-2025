import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../constants/LoginScreen.styles';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const YOUR_BACKEND_URL = `${Constants.expoConfig?.extra?.apiUrl}`;

const LoginScreen = () => {
    const params = useLocalSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const resetFields = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setForgotEmail('');
        setNewPassword('');
        setResetConfirmPassword('');
        setOtp('');
        setResetToken('');
    };

    useEffect(() => {
        const checkSession = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const user = JSON.parse(userData);
                    router.replace(user.role === 'admin' ? '/home' : '/userapp/home');
                }
            } catch (error) {
                console.error('Session check error:', error);
            } finally {
                setIsCheckingSession(false);
            }
        };
        checkSession();
    }, []);

    if (isCheckingSession) {
        return (
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const handleLogin = async () => {
        if (email === '' || password === '') {
            Alert.alert('Error', 'Please enter email address and password both');
        } else if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
        } else if (!passwordRegex.test(password)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
        } else {
            setIsLoading(true);
            try {
                const loginResponse = await fetch(`${YOUR_BACKEND_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email.toLowerCase(),
                        password: password,
                    }),
                });

                const data = await loginResponse.json();

                if (!loginResponse.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                await AsyncStorage.setItem('userData', JSON.stringify(data.user));

                Alert.alert('Success', `Welcome to Service Vale`);
                resetFields();

                if (data.user.role === 'admin') {
                    router.replace('/home');
                } else {
                    router.replace('/userapp/home');
                }
            } catch (error: any) {
                Alert.alert('Login Error', error.message || 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRegister = async () => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
        } else if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
        } else if (!passwordRegex.test(password)) {
            Alert.alert('Error', 'Password must contain at least one uppercase letter, one number, and one special character.');
        } else if (password !== confirmPassword) {
            Alert.alert('Error', 'Password do not match');
        } else {
            setIsLoading(true);
            try {
                const registerResponse = await fetch(`${YOUR_BACKEND_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: username,
                        email: email.toLowerCase(),
                        password: password,
                        role: 'engineer'
                    }),
                });

                const data = await registerResponse.json();

                if (!registerResponse.ok) {
                    if (data.error.includes('Access denied')) {
                        Alert.alert('Access Denied', data.error);
                    } else if (data.error.includes('Email already exists')) {
                        Alert.alert('Error', 'Email already exists. Please use a different email.');
                    } else {
                        throw new Error(data.error || 'Registration failed');
                    }
                    return;
                }

                Alert.alert('Success', 'Account created successfully. Please log in.');
                resetFields();
                setIsLogin(true);
            } catch (error: any) {
                Alert.alert('Error', error.message || 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleForgotPassword = () => {
        setForgotModalVisible(true);
    };

    const handleSendOTP = async () => {
        if (!forgotEmail || !emailRegex.test(forgotEmail)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await fetch(`${YOUR_BACKEND_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: forgotEmail.toLowerCase(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            setResetToken(data.resetToken);
            setForgotModalVisible(false);
            setOtpModalVisible(true);
            Alert.alert('Success', 'OTP sent successfully to your email');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await fetch(`${YOUR_BACKEND_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: forgotEmail.toLowerCase(),
                    otp: otp,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'OTP verification failed');
            }

            setResetToken(data.resetToken);
            setOtpModalVisible(false);
            setResetModalVisible(true);
            Alert.alert('Success', 'OTP verified successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to verify OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !resetConfirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword !== resetConfirmPassword) {
            Alert.alert('Error', 'Password do not match');
            return;
        }
        if (!passwordRegex.test(newPassword)) {
            Alert.alert('Error', 'Password must contain at least one uppercase letter, one number, and one special character.');
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await fetch(`${YOUR_BACKEND_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: forgotEmail.toLowerCase(),
                    token: resetToken,
                    newPassword: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Password reset failed');
            }

            Alert.alert('Success', 'Password reset successfully');
            resetFields();
            setResetModalVisible(false);
            setIsLogin(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView
                    contentContainerStyle={[styles.container]}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustContentInsets={true}
                >
                    <View style={styles.brandContainer}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Modal transparent animationType="fade" visible={forgotModalVisible}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>Forgot Password</Text>
                                <Text style={styles.modalSubtitle}>Enter your email to receive an OTP</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#999"
                                    value={forgotEmail}
                                    onChangeText={setForgotEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <View style={styles.modalButtonGroup}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.secondaryButton]}
                                        onPress={() => setForgotModalVisible(false)}
                                    >
                                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.primaryButton]}
                                        onPress={handleSendOTP}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Send OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal transparent animationType="fade" visible={otpModalVisible}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>Verify OTP</Text>
                                <Text style={styles.modalSubtitle}>Enter the OTP sent to your email</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Enter OTP"
                                    placeholderTextColor="#999"
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <View style={styles.modalButtonGroup}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.secondaryButton]}
                                        onPress={() => setOtpModalVisible(false)}
                                    >
                                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.primaryButton]}
                                        onPress={handleVerifyOTP}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Verify OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal transparent animationType="fade" visible={resetModalVisible}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>Reset Password</Text>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>New Password</Text>
                                    <View style={styles.passwordInputContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="New Password"
                                            placeholderTextColor="#999"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            <Ionicons
                                                name={showNewPassword ? 'eye' : 'eye-off'}
                                                size={20}
                                                color="#888"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Confirm Password</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirm password"
                                        placeholderTextColor="#999"
                                        value={resetConfirmPassword}
                                        onChangeText={setResetConfirmPassword}
                                        secureTextEntry={true}
                                    />
                                </View>

                                <View style={styles.modalButtonGroup}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.secondaryButton]}
                                        onPress={() => {
                                            setResetModalVisible(false);
                                        }}
                                    >
                                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.primaryButton]}
                                        onPress={handleResetPassword}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryButtonText}>Update</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <View style={styles.authCard}>
                        <Text style={styles.authTitle}>
                            {isLogin ? 'Sign In as an admin or engineer' : 'Create Account'}
                        </Text>

                        {!isLogin && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Username</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#999"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />

                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#888"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!isLogin && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#999"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={true}
                                />
                            </View>
                        )}

                        {isLogin && (
                            <TouchableOpacity
                                style={styles.forgotPasswordButton}
                                onPress={handleForgotPassword}
                            >
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.authButton}
                            onPress={isLogin ? handleLogin : handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.authButtonText}>
                                    {isLogin ? 'Sign In' : 'Sign Up'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.authFooter}>
                            <Text style={styles.authFooterText}>
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsLogin(!isLogin);
                                    resetFields();
                                }}
                            >
                                <Text style={styles.authFooterLink}>
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;