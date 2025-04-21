import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Play, Pause, SkipForward, X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  useSharedValue,
  withRepeat,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Define interfaces for workout and exercise
interface Exercise {
  name: string;
  duration: number;
  rest: number;
  image: string;
  instructions: string;
}

interface Workout {
  id: string;
  title: string;
  exercises: Exercise[];
}

type ExerciseName = 'Push-ups' | 'Squats' | 'Lunges' | 'High Knees' | 'split Jumps' | 'Mountain Climbers' | 'Downward Dog' | 'Warrior Pose' | 'Tree Pose';

const workouts: Workout[] = [
  {
    id: 'strength',
    title: 'Strength Training',
    exercises: [
      {
        name: 'Push-ups',
        duration: 45,
        rest: 15,
        image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        instructions: 'Keep your core tight and lower your body until your chest nearly touches the ground.',
      },
      {
        name: 'Squats',
        duration: 45,
        rest: 15,
        image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1469&auto=format&fit=crop',
        instructions: 'Stand with feet shoulder-width apart, lower your body as if sitting back into a chair.',
      },
      {
        name: 'Lunges',
        duration: 45,
        rest: 15,
        image: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=1470&auto=format&fit=crop',
        instructions: 'Step forward with one leg, lowering your hips until both knees are bent at 90 degrees.',
      },
    ],
  },
  {
    id: 'cardio',
    title: 'Cardio',
    exercises: [
      {
        name: 'High Knees',
        duration: 30,
        rest: 10,
        image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=1470&auto=format&fit=crop',
        instructions: 'Run in place, lifting your knees as high as possible with each step.',
      },
      {
        name: 'split Jumps',
        duration: 30,
        rest: 10,
        image: 'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        instructions: 'Jump while spreading your legs and raising your arms above your head.',
      },
      {
        name: 'Mountain Climbers',
        duration: 30,
        rest: 10,
        image: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=1470&auto=format&fit=crop',
        instructions: 'In plank position, alternate bringing each knee towards your chest.',
      },
    ],
  },
  {
    id: 'yoga',
    title: 'Morning Yoga',
    exercises: [
      {
        name: 'Downward Dog',
        duration: 60,
        rest: 20,
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1520&auto=format&fit=crop',
        instructions: 'Form an inverted V-shape, pressing through your hands and feet.',
      },
      {
        name: 'Warrior Pose',
        duration: 60,
        rest: 20,
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1402&auto=format&fit=crop',
        instructions: 'keep one leg down and fold the other leg inwards.',
      },
      {
        name: 'Tree Pose',
        duration: 60,
        rest: 20,
        image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=1526&auto=format&fit=crop',
        instructions: 'Stand on one leg, place the other foot on your inner thigh, hands at heart center.',
      },
    ],
  },
];

// Update colors object to match step counter page exactly
const colors = {
  background: '#1e3c72',
  text: '#FFFFFF',
  card: 'rgba(30, 60, 114, 0.8)',
  primary: '#1e3c72',
  secondary: '#2a5298',
  gradient: ['#1e3c72', '#2a5298'] as [string, string],
  accent: '#4FC3F7',
  error: '#FF6B6B',
  warning: '#FFA500',
  success: '#2a5298',
  disabled: 'rgba(255, 255, 255, 0.6)',
  overlay: 'rgba(30, 60, 114, 0.5)',
  border: 'rgba(255, 255, 255, 0.2)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  secondaryText: '#A8B4D0',
  highlight: '#4FC3F7'
};

export default function WorkoutsScreen() {
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const scale = useSharedValue(1);
  const progress = useSharedValue(1);
  const screenWidth = Dimensions.get('window').width;

  const startWorkout = (workout: Workout) => {
    setSelectedWorkout(workout);
    setCurrentExercise(0);
    setTimeLeft(workout.exercises[0].duration);
    setIsResting(false);
    setIsActive(false);
  };

  const resetWorkout = () => {
    setSelectedWorkout(null);
    setCurrentExercise(0);
    setTimeLeft(0);
    setIsResting(false);
    setIsActive(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isActive && timeLeft > 0 && selectedWorkout) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            if (!isResting) {
              setIsResting(true);
              return selectedWorkout.exercises[currentExercise].rest;
            } else {
              if (currentExercise < selectedWorkout.exercises.length - 1) {
                setCurrentExercise((curr) => curr + 1);
                setIsResting(false);
                return selectedWorkout.exercises[currentExercise + 1].duration;
              } else {
                setIsActive(false);
                return 0;
              }
            }
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, currentExercise, isResting, selectedWorkout]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedWorkout) {
    const currentExerciseData = selectedWorkout.exercises[currentExercise];

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e3c72', '#2a5298']}
          style={styles.gradientBackground}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={resetWorkout} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.workoutTitle}>{selectedWorkout.title}</Text>
          <Text style={styles.exerciseCount}>
            Exercise {currentExercise + 1}/{selectedWorkout.exercises.length}
          </Text>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={Dimensions.get('window').height * 0.8}
          snapToAlignment="center"
        >
          {currentExerciseData.name === 'Warrior Pose' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/87e1d5b0-5617-49ec-a8aa-3e9f6f7e8fae/LktzsWeX2F.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'Squats' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/bd81bb2e-c595-438f-982c-be3386b03e7b/opO7xR0CgE.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'split Jumps' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/a6fc6709-bc9d-4113-ad0f-390b5a9d04d2/JykDlh3on9.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'Lunges' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/97fe65d8-30a1-42f5-8308-ce9ba5ba9034/2XKT3Z6QYH.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'Push-ups' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/7b87baa9-5479-4759-89f1-d4e036baacd9/XIpB3QPWcW.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'Mountain Climbers' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/3969c5c6-52ba-4f26-876d-77a8afcc2563/9Q7wx0lzVF.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300, backgroundColor: 'transparent' }]}
            />
          ) : currentExerciseData.name === 'Tree Pose' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/869d45f1-fde4-48fc-af99-5a567db4d4b8/m0BPghjUF8.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300 }]}
            />
          ) : currentExerciseData.name === 'High Knees' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/0762072d-ad36-457a-b36c-d80a3f45110e/BeinVv2VRR.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300 }]}
            />
          ) : currentExerciseData.name === 'Downward Dog' ? (
            <LottieView
              source={{ uri: 'https://lottie.host/c0e71637-1b7e-4320-bac7-d7c7293f7e62/eKHzKTmYDo.lottie' }}
              autoPlay
              loop
              style={[styles.exerciseImage, { width: '100%', height: 300 }]}
            />
          ) : (
            <Image source={{ uri: currentExerciseData.image }} style={styles.exerciseImage} />
          )}

          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{currentExerciseData.name}</Text>
            <Text style={styles.instructions}>{currentExerciseData.instructions}</Text>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>{isResting ? 'Rest Time' : 'Exercise Time'}</Text>
            <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, isActive && styles.activeButton]}
                onPress={() => setIsActive(!isActive)}
              >
                {isActive ? <Pause size={32} color="#fff" /> : <Play size={32} color="#fff" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  if (currentExercise < selectedWorkout.exercises.length - 1) {
                    setCurrentExercise((curr) => curr + 1);
                    setIsResting(false);
                    setTimeLeft(selectedWorkout.exercises[currentExercise + 1].duration);
                    setIsActive(false);
                  }
                }}
              >
                <SkipForward size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {currentExercise < selectedWorkout.exercises.length - 1 && (
            <>
              <Text style={styles.upNextTitle}>Up Next</Text>
              {selectedWorkout.exercises.slice(currentExercise + 1).map((exercise: Exercise, index: number) => (
                <View key={index} style={styles.upNextExercise}>
                  <Image source={{ uri: exercise.image }} style={styles.upNextImage} />
                  <View style={styles.upNextInfo}>
                    <Text style={styles.upNextName}>{exercise.name}</Text>
                    <Text style={styles.upNextDuration}>{exercise.duration} seconds</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.subtitle}>Choose your workout</Text>
      </View>

      {workouts.map((workout) => (
        <TouchableOpacity key={workout.id} style={styles.workoutCard} onPress={() => startWorkout(workout)}>
          <Image source={{ uri: workout.exercises[0].image }} style={styles.workoutImage} />
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>{workout.title}</Text>
            <Text style={styles.workoutMeta}>
              {workout.exercises.length} exercises •{' '}
              {workout.exercises.reduce((acc, curr) => acc + curr.duration + curr.rest, 0)} seconds
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const getExerciseBenefits = (exerciseName: ExerciseName): string => {
  const benefits: Record<ExerciseName, string> = {
    'Push-ups': 'Strengthens chest, shoulders, triceps, and core muscles. Improves upper body strength and endurance.',
    'Squats': 'Builds leg and core strength. Improves balance and mobility. Great for lower body development.',
    'Lunges': 'Strengthens legs and glutes. Improves balance and coordination. Helps with functional movement.',
    'High Knees': 'Great cardio exercise. Improves coordination and strengthens core and legs.',
    'split Jumps': 'Improves explosive power and leg strength. Great for cardiovascular fitness.',
    'Mountain Climbers': 'Full body workout. Improves core strength and cardiovascular endurance.',
    'Downward Dog': 'Stretches hamstrings and shoulders. Strengthens arms and legs. Improves circulation.',
    'Warrior Pose': 'Strengthens legs and core. Improves balance and focus. Stretches hips and shoulders.',
    'Tree Pose': 'Improves balance and focus. Strengthens legs and core. Promotes mental clarity.'
  };
  return benefits[exerciseName];
};

// Update the styles to use the new colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  header: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: colors.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 32,
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    transform: [{ scale: 1 }],
  },
  workoutImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  workoutInfo: {
    padding: 20,
  },
  workoutTitle: {
    fontSize: 24,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  workoutMeta: {
    fontSize: 14,
    color: colors.secondaryText,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 10,
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  exerciseCount: {
    fontSize: 14,
    color: colors.secondaryText,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  exerciseImage: {
    width: '100%',
    height: 180,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  exerciseInfo: {
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    margin: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  exerciseName: {
    fontSize: 26,
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instructions: {
    fontSize: 15,
    color: colors.secondaryText,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  timerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    margin: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  timerLabel: {
    fontSize: 18,
    color: colors.secondaryText,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  timer: {
    fontSize: 64,
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginVertical: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  controlButton: {
    backgroundColor: colors.secondary,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeButton: {
    backgroundColor: colors.accent,
  },
  upNextTitle: {
    fontSize: 22,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  upNextExercise: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  upNextImage: {
    width: 80,
    height: 80,
  },
  upNextInfo: {
    padding: 16,
    justifyContent: 'center',
    flex: 1,
  },
  upNextName: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  upNextDuration: {
    fontSize: 14,
    color: colors.secondaryText,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});