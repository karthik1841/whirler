import * as React from 'react';
import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';

export default function Welcome() {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        if (gestureState.dx > 100) {
          Animated.timing(swipeAnim, {
            toValue: Dimensions.get('window').width,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            router.replace('/(auth)/sign-in');
          });
        } else {
          Animated.spring(swipeAnim, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const swipeProgress = swipeAnim.interpolate({
    inputRange: [0, Dimensions.get('window').width],
    outputRange: [0, 1],
  });

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Image
          source={require('../../assets/images/jklogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }
            ]
          }}
        >
          <Text style={styles.title}>Welcome to Whirler</Text>
          <Text style={styles.subtitle}>Always in Action</Text>
        </Animated.View>

        <View style={styles.animationContainer}>
          <LottieView
            source={{ uri: 'https://lottie.host/aee988b8-9d00-41df-b424-3fed265177fb/U85fw4SCiB.lottie' }}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>

        <View style={styles.swipeContainer}>
          <Animated.View
            style={[
              styles.swipeTrack,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBar,
                {
                  transform: [{ scaleX: swipeProgress }],
                },
              ]}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.swipeButton,
              {
                transform: [
                  { translateX: swipeAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <LinearGradient
              colors={['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.swipeText}>Swipe to Start ❯</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    zIndex: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  animationContainer: {
    width: '100%',
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lottie: {
    width: 300,
    height: 300,
  },
  swipeContainer: {
    width: '80%',
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginTop: 100,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  swipeTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: '100%',
  },
  swipeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
});
