import React from 'react';
import { View, Image, SafeAreaView } from 'react-native';
import { styles } from '../constants/Rating.styles';

const RatingScreen = () => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Image
                    source={require('../assets/images/rating_qr.jpg')}
                    style={styles.qrCode}
                    resizeMode="contain"
                />
            </View>
        </SafeAreaView>
    );
};

export default RatingScreen;