import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Dimensions,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { Clock, Siren as Fire, Users, Apple, ChevronRight, RefreshCw } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type HealthCondition = 'diabetes' | 'hypertension' | 'thyroid';
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface Recipe {
  id: number;
  title: string;
  image: string;
  time: string;
  calories: string;
  servings: string;
  category: MealTime;
  healthCondition: HealthCondition[];
  description: string;
  recipeLink?: string;
}

const recipes: Recipe[] = [
  {
    id: 1,
    title: 'Oats Idli',
    image: 'https://media.istockphoto.com/id/2169535076/photo/oats-idli-is-a-healthy-steamed-south-indian-breakfast-made-with-oats-semolina-yogurt-and.jpg?s=612x612&w=0&k=20&c=qJMqI1ojZmkVvr6gGAr3eNAU3f173DQisEV6A2LReAE=',
    time: '20 min',
    calories: '180 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Steamed oats idli, rich in fiber, helps regulate blood sugar.',
  },
  {
    id: 2,
    title: 'Ragi Dosa',
    image: 'https://media.istockphoto.com/id/2126807243/photo/healthy-super-food-ragi-roti-with-raw-ragi-and-flour-selective-focus.jpg?s=612x612&w=0&k=20&c=Q5uF4Pqb2KFWfmCTP1eRWbwDPqpS9XtS-774Psw5MeA=',
    time: '15 min',
    calories: '150 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Crispy dosa made from ragi flour, ideal for diabetes management.',
  },
  {
    id: 3,
    title: 'Brown Rice with Dal',
    image: 'https://media.gettyimages.com/id/1363638796/photo/stir-fry-brown-rice-vegan-plant-based-asian-recipe.jpg?s=612x612&w=0&k=20&c=PBuGWbJSfKkCyUlKy2KiaA4MtHZc2FKV_ePlPC-KgjU=',
    time: '30 min',
    calories: '350 kcal',
    servings: '3',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Nutritious brown rice and dal, offering sustained energy.',
  },
  {
    id: 4,
    title: 'Quinoa Upma',
    image: 'https://media.gettyimages.com/id/1414272083/photo/quinoa-upma-a-healthy-indian-breakfast-united-states-usa.jpg?s=612x612&w=0&k=20&c=56AyzPcVUjh6dx6SGfZZIaeB1vgg6Uu1ClN8kaMqFlQ=',
    time: '25 min',
    calories: '280 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Savory quinoa with vegetables, low in carbs.',
  },
  {
    id: 5,
    title: 'Daliya with Fruits',
    image: 'https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?w=500',
    time: '15 min',
    calories: '200 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Wholesome porridge, low in sodium and heart-friendly.',
  },
  {
    id: 6,
    title: 'Besan Chilla',
    image: 'https://img.freepik.com/free-photo/tasty-delicious-cheesy-tortilla-with-cream_23-2148248854.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '170 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Savory chickpea flour pancake, low in salt.',
  },
  {
    id: 7,
    title: 'Low-sodium Dal',
    image: 'https://img.freepik.com/premium-photo/dal-image-quick-lunch_1036998-359617.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '25 min',
    calories: '250 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Light lentil curry with minimal salt.',
  },
  {
    id: 8,
    title: 'Millet Khichdi',
    image: 'https://img.freepik.com/free-photo/indian-dhal-spicy-curry-bowl-spices-herbs-rustic-black-wooden-table_2829-18712.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '30 min',
    calories: '300 kcal',
    servings: '3',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Comforting millets and lentils, low in sodium.',
  },
  {
    id: 9,
    title: 'Iodine-rich Eggs',
    image: 'https://img.freepik.com/premium-photo/high-angle-view-fruits-tomatoes_1048944-3796692.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '160 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Scrambled eggs supporting thyroid hormone production.',
  },
  {
    id: 10,
    title: 'Grilled Fish',
    image: 'https://img.freepik.com/premium-photo/tandoori-pomfret-fish-cooked-clay-oven-garnished-with-lemon-mint-cabbage-carrot-salad-selective-focus_466689-29924.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '300 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Grilled fish rich in selenium for thyroid health.',
  },
  {
    id: 11,
    title: 'Baked Chicken',
    image: 'https://img.freepik.com/free-photo/tasty-appetizing-baked-chicken-served-table-with-deco-closeup_1220-6582.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '35 min',
    calories: '350 kcal',
    servings: '3',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Lean chicken baked with herbs for thyroid support.',
  },
  {
    id: 12,
    title: 'Moong Dal Chaat',
    image: 'https://media.istockphoto.com/id/1127740593/photo/sprouted-lentil-salad.jpg?s=612x612&w=0&k=20&c=Bwk-ToqNq7py8FBjQHnLQnOUDEP9cFtrV224w4f4Hzs=',
    time: '10 min',
    calories: '120 kcal',
    servings: '2',
    category: 'snack',
    healthCondition: ['diabetes'],
    description: 'Light moong dal chaat, low in glycemic index for diabetes control.',
  },
  {
    id: 13,
    title: 'Roasted Makhana',
    image: 'https://img.freepik.com/premium-photo/makhana-also-called-as-lotus-seeds-fox-nuts-are-popular-dry-snacks-from-india-served-bowl-selective-focus_466689-19093.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '100 kcal',
    servings: '1',
    category: 'snack',
    healthCondition: ['hypertension'],
    description: 'Crispy roasted fox nuts, low in sodium for heart health.',
  },
  {
    id: 14,
    title: 'Almond & Pumpkin Seeds',
    image: 'https://img.freepik.com/free-photo/top-view-different-nuts-fresh-nuts-inside-tray-dark-surface_140725-75266.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '150 kcal',
    servings: '1',
    category: 'snack',
    healthCondition: ['thyroid'],
    description: 'Nutrient-dense mix of almonds and pumpkin seeds for thyroid support.',
  },
  // Hypertension - Breakfast
  {
    id: 15,
    title: 'Oats with Flaxseeds',
    image: 'https://media.gettyimages.com/id/1364828032/photo/morning-porridge-vegan-recipe-breakfast-bowl-homemade.jpg?s=612x612&w=0&k=20&c=oAOLcPWQhYzE1aPq983Uo58enjCq4gkGYsnkMVYRaco=',
    time: '10 min',
    calories: '200 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Nutritious oats with flaxseeds, low in sodium for heart health.',
  },
  {
    id: 16,
    title: 'Boiled Eggs ',
    image: 'https://media.gettyimages.com/id/1474994705/photo/half-cut-boiled-egg.jpg?s=612x612&w=0&k=20&c=hPUPNmU52hdbidHnpwXQkMuhisk7ugpu3NH_5uqyBes=',
    time: '10 min',
    calories: '50 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Egg whites boiled to perfection, heart-friendly and low in sodium.',
  },
  {
    id: 17,
    title: 'Low-salt Vegetable Poha',
    image: 'https://t3.ftcdn.net/jpg/04/44/43/92/240_F_444439260_xQwTSr3cCyE144NbSIxrL15G4YwxgCnH.jpg',
    time: '15 min',
    calories: '180 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Flattened rice with veggies, minimal salt for blood pressure control.',
  },
  {
    id: 18,
    title: 'Banana (In Moderation)',
    image: 'https://static.wixstatic.com/media/nsplsh_6b39583579476c652d4e41~mv2_d_6000_4000_s_4_2.jpg/v1/fill/w_1000,h_667,al_c,q_85,usm_0.66_1.00_0.01/nsplsh_6b39583579476c652d4e41~mv2_d_6000_4000_s_4_2.jpg',
    time: '5 min',
    calories: '90 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Potassium-rich banana, supports heart health in moderation.',
  },
  {
    id: 19,
    title: 'Beetroot Juice (No Added Salt)',
    image: 'https://img.freepik.com/premium-photo/beetroot-juice_1205-2371.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '70 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['hypertension'],
    description: 'Fresh beetroot juice, naturally lowers blood pressure.',
  },
  // Hypertension - Lunch
  {
    id: 20,
    title: 'Brown Rice',
    image: 'https://img.freepik.com/premium-photo/red-rice-white-b_62856-3797.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '30 min',
    calories: '215 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Whole grain brown rice, fiber-rich and heart-friendly.',
  },
  {
    id: 21,
    title: 'Steamed Spinach',
    image: 'https://img.freepik.com/free-photo/top-view-stewed-spinach-salad-with-carrot-wooden-table_140725-10405.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '30 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Lightly steamed spinach, low in sodium and rich in nutrients.',
  },
  {
    id: 22,
    title: 'Low-salt Dal',
    image: 'https://img.freepik.com/free-photo/white-cup-yellow-pea-soup-wooden-platter-with-red-lentils-around_114579-28705.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '25 min',
    calories: '200 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Lentils cooked with minimal salt, ideal for heart health.',
  },
  {
    id: 23,
    title: 'Cucumber',
    image: 'https://img.freepik.com/premium-photo/cucumber-slices-isolated_403166-196.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '15 kcal',
    servings: '1',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Refreshing cucumber slices, hydrating and low in sodium.',
  },
  {
    id: 24,
    title: 'Jowar Roti',
    image: 'https://img.freepik.com/free-photo/indian-tasty-roti-composition_23-2149073358.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '150 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['hypertension'],
    description: 'Sorghum flatbread, gluten-free and heart-healthy.',
  },
  // Hypertension - Dinner
  {
    id: 25,
    title: 'Mixed Vegetable Soup',
    image: 'https://img.freepik.com/free-photo/lentil-soup-with-mixed-ingredients-herbs-white-bowl-with-spoon_114579-3083.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '100 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Light soup with assorted veggies, low in sodium.',
  },
  {
    id: 26,
    title: 'Steamed Broccoli',
    image: 'https://img.freepik.com/free-photo/half-shot-healthy-meal-with-brocoli-carrots-black-plate-gray-table_140725-86728.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '55 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Steamed broccoli, rich in fiber and heart-protective nutrients.',
  },
  {
    id: 27,
    title: 'Ragi Roti',
    image: 'https://img.freepik.com/premium-photo/finger-millet-ora-a-ragi-dosaa-a-is-healthy-indian-breakfast-served-with-chutney-roll-flat-cone-shape_466689-50486.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '140 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Finger millet flatbread, supports heart health.',
  },
  {
    id: 28,
    title: 'Grilled Tofu',
    image: 'https://img.freepik.com/free-photo/chicken-skewers-with-slices-apples-chili-top-view_2829-19996.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '120 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Grilled tofu, low-sodium protein for heart health.',
  },
  {
    id: 29,
    title: 'Lauki (Bottle Gourd) Sabzi',
    image: 'https://img.freepik.com/premium-photo/aloo-potol-dalna-recipe-is-traditional-sabzi-from-bengal-made-with-potato-pointed-gourd_466689-86423.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '80 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['hypertension'],
    description: 'Lightly spiced bottle gourd dish, low in sodium.',
  },
  // Diabetes - Breakfast
  {
    id: 30,
    title: 'Moong Dal Chilla',
    image: 'https://media.istockphoto.com/id/1465606833/photo/indian-food-moong-dal-chilla-is-ready-to-eat.jpg?s=612x612&w=0&k=20&c=cmJt5uLPAte3JKjAW4qe1-YhtqhlMmD-rGkMO3StKEc=',
    time: '20 min',
    calories: '170 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Savory moong dal pancake, low glycemic index.',
  },
  {
    id: 31,
    title: 'Besan Cheela',
    image: 'https://media.istockphoto.com/id/938876440/photo/besan-chilla-indian-home-food.jpg?s=612x612&w=0&k=20&c=LQ7S6at-uuH2KfFouNQeJ7hR4lYPU0sm86yeRi27NsQ=',
    time: '15 min',
    calories: '160 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Chickpea flour pancake, ideal for blood sugar control.',
  },
  {
    id: 32,
    title: 'Ragi Porridge',
    image: 'https://img.freepik.com/free-photo/red-bean-hot-soup-white-bowl-place-wooden-cutting-board_1150-35313.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '180 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Nutritious finger millet porridge, helps stabilize glucose.',
  },
  {
    id: 33,
    title: 'Sprouted Moong Salad',
    image: 'https://media.istockphoto.com/id/1127740593/photo/sprouted-lentil-salad.jpg?s=612x612&w=0&k=20&c=Bwk-ToqNq7py8FBjQHnLQnOUDEP9cFtrV224w4f4Hzs=',
    time: '10 min',
    calories: '120 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Fresh sprouted moong salad, low in carbs.',
  },
  {
    id: 34,
    title: 'Apple Slices with Cinnamon',
    image: 'https://img.freepik.com/free-photo/high-angle-arrangement-with-cooked-apples-cinnamon-sticks_23-2148325594.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '80 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['diabetes'],
    description: 'Apple slices with cinnamon, supports blood sugar regulation.',
  },
  // Diabetes - Lunch
  {
    id: 35,
    title: 'Quinoa',
    image: 'https://img.freepik.com/free-photo/quinoa-with-vegetables-cooked-lunch-dinner-served-bowl-closeup_1220-5345.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '220 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Protein-rich quinoa, low glycemic index grain.',
  },
  {
    id: 36,
    title: 'Bitter Gourd (Karela) Sabzi',
    image: 'https://img.freepik.com/premium-photo/karela-chips-bitter-gourd-fry-is-healthy-snack-recipe_466689-31428.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '25 min',
    calories: '90 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Bitter gourd dish, known to lower blood sugar.',
  },
  {
    id: 37,
    title: 'Whole Moong Dal',
    image: 'https://media.istockphoto.com/id/1191001292/photo/vegetable-masala-oats-khichadi-served-in-a-bowl-selective-focus.jpg?s=612x612&w=0&k=20&c=oeumyyHsyhgGvnh5FLW13GQc_j0-5EyDFavdaPdoDqQ=',
    time: '30 min',
    calories: '210 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Whole moong dal, fiber-rich for glucose control.',
  },
  {
    id: 38,
    title: 'Carrot Sticks',
    image: 'https://media.istockphoto.com/id/815270634/photo/bowl-of-chopped-carrots.jpg?s=612x612&w=0&k=20&c=aeEWzhPvUQStlSW6UcIuKnUFQ8uWYcJcmFReB5KGl9Q=',
    time: '5 min',
    calories: '40 kcal',
    servings: '1',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Crunchy carrot sticks, low in carbs.',
  },
  {
    id: 39,
    title: 'Bajra Roti',
    image: 'https://media.istockphoto.com/id/1156261095/photo/bajra-sorghum-ki-roti-or-pearl-millet-flat-bread.jpg?s=612x612&w=0&k=20&c=XOyTv7yzJV-eQWrbc8PlYo_XRoTqzEteZBhIsMYXZeo=',
    time: '20 min',
    calories: '150 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['diabetes'],
    description: 'Pearl millet flatbread, supports stable blood sugar.',
  },
  // Diabetes - Dinner
  {
    id: 40,
    title: 'Lentil Soup',
    image: 'https://media.istockphoto.com/id/870329822/photo/curried-lentil-soup.jpg?s=612x612&w=0&k=20&c=9fWWuD0s7gYy_WR_xvbr8Z8-rAp1ZT69BiWB_u070tA=',
    time: '25 min',
    calories: '150 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Light lentil soup, low in carbs for diabetes.',
  },
  {
    id: 41,
    title: 'Grilled Vegetables',
    image: 'https://img.freepik.com/free-photo/healthy-tasty-vegetables-grilled-pan_1220-4453.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '100 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Assorted grilled veggies, low glycemic index.',
  },
  {
    id: 42,
    title: 'Methi Roti',
    image: 'https://img.freepik.com/premium-photo/aloo-paratha-indian-potato-stuffed-flatbread-with-butter-top-served-with-fresh-sweet-lassi-chutney-pickle-selective-focus_466689-49022.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '140 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Fenugreek flatbread, aids blood sugar management.',
  },
  {
    id: 43,
    title: 'Cabbage Sabzi',
    image: 'https://img.freepik.com/premium-photo/stewed-cabbage-bowl-grey-background_80295-1531.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '80 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Stir-fried cabbage, low-carb vegetable dish.',
  },
  {
    id: 44,
    title: 'Tofu Scramble',
    image: 'https://img.freepik.com/free-photo/top-view-high-protein-meal-composition_23-2149089634.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '130 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['diabetes'],
    description: 'Spiced tofu scramble, protein-rich and low-carb.',
  },
  // Thyroid - Breakfast
  {
    id: 45,
    title: 'Ragi Dosa',
    image: 'https://media.istockphoto.com/id/2126807243/photo/healthy-super-food-ragi-roti-with-raw-ragi-and-flour-selective-focus.jpg?s=612x612&w=0&k=20&c=Q5uF4Pqb2KFWfmCTP1eRWbwDPqpS9XtS-774Psw5MeA=',
    time: '15 min',
    calories: '150 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Crispy ragi dosa, supports thyroid health.',
  },
  {
    id: 46,
    title: 'Boiled Eggs',
    image: 'https://img.freepik.com/free-photo/boiled-eggs-bowl-decorated-with-parsley-leaves_2829-8366.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '140 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Boiled eggs, rich in iodine for thyroid function.',
  },
  {
    id: 47,
    title: 'Moringa (Drumstick Leaf) Smoothie',
    image: 'https://img.freepik.com/free-photo/natural-smoothies-with-spinach_23-2148574138.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '100 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Nutrient-packed moringa smoothie for thyroid support.',
  },
  {
    id: 48,
    title: 'Almonds and Walnuts',
    image: 'https://img.freepik.com/free-photo/traditional-azerbaijan-holiday-novruz-sweets-pakhlavas_114579-41659.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '160 kcal',
    servings: '1',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Nuts rich in selenium, beneficial for thyroid.',
  },
  {
    id: 49,
    title: 'Fruit Salad (No Melon or Cruciferous)',
    image: 'https://img.freepik.com/free-photo/mixed-assorted-fruits_74190-7057.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '10 min',
    calories: '120 kcal',
    servings: '2',
    category: 'breakfast',
    healthCondition: ['thyroid'],
    description: 'Thyroid-friendly fruit salad with apples and berries.',
  },
  // Thyroid - Lunch
  {
    id: 50,
    title: 'Bajra Roti',
    image: 'https://img.freepik.com/premium-photo/singhara-atta-roti-singoda-water-chestnut-paratha-flatbread_466689-70025.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '150 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Pearl millet flatbread, supports thyroid health.',
  },
  {
    id: 51,
    title: 'Palak Dal',
    image: 'https://img.freepik.com/free-photo/indian-dhal-spicy-curry-bowl-spices-herbs-rustic-black-wooden-table_2829-18712.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '25 min',
    calories: '200 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Spinach and lentil curry, nutrient-rich for thyroid.',
  },
  {
    id: 52,
    title: 'Turmeric Rice',
    image: 'https://img.freepik.com/premium-photo/lemon-rice-with-curry-leaf-peanuts-red-chilly-served-ceramic-bowl-selective-focus_466689-8223.jpg?uid=R196102930&ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '30 min',
    calories: '210 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Rice with turmeric, anti-inflammatory for thyroid support.',
  },
  {
    id: 53,
    title: 'Zucchini Stir-fry',
    image: 'https://img.freepik.com/premium-photo/indian-style-masala-sabji-sabzi-fried-bhindi-okra-also-known-as-ladyfinger-served-bowl-moody-background-selective-focus_466689-58163.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '80 kcal',
    servings: '2',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Light zucchini stir-fry, thyroid-friendly vegetable.',
  },
  {
    id: 54,
    title: 'Curd (Low-fat)',
    image: 'https://img.freepik.com/premium-photo/plain-curd-yogurt-dahi-hindi-served-bowl-moody-background-selective-focus_466689-29264.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '5 min',
    calories: '90 kcal',
    servings: '1',
    category: 'lunch',
    healthCondition: ['thyroid'],
    description: 'Low-fat curd, supports digestion and thyroid health.',
  },
  // Thyroid - Dinner
  {
    id: 55,
    title: 'Clear Veggie Soup',
    image: 'https://img.freepik.com/free-photo/isolated-shot-white-bowl-with-hot-sour-soup-perfect-food-blog-menu-usage_181624-8524.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '100 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Light vegetable soup, gentle on thyroid function.',
  },
  {
    id: 56,
    title: 'Paneer Bhurji',
    image: 'https://img.freepik.com/premium-photo/paneer-khus-khus-curry-cottage-cheese-posto-masala-made-using-poppy-seeds-indian-recipe_1093310-149.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '200 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Spiced paneer scramble, protein for thyroid support.',
  },
  {
    id: 57,
    title: 'Quinoa',
    image: 'https://img.freepik.com/free-photo/quinoa-with-vegetables-cooked-lunch-dinner-served-bowl-closeup_1220-5345.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '220 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Quinoa, nutrient-dense grain for thyroid health.',
  },
  {
    id: 58,
    title: 'Lauki Sabzi',
    image: 'https://img.freepik.com/free-photo/top-view-roasted-eggplant-salad-bowl-wooden-spoon-different-spices-small-bowls-dark-surface_140725-88557.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '20 min',
    calories: '80 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Bottle gourd sabzi, light and thyroid-friendly.',
  },
  {
    id: 59,
    title: 'Grilled Carrots and Beans',
    image: 'https://img.freepik.com/premium-photo/roasted-carrots-coated-spicy-sweet-blend_961875-220324.jpg?ga=GA1.1.588523550.1744470825&semt=ais_hybrid&w=740',
    time: '15 min',
    calories: '90 kcal',
    servings: '2',
    category: 'dinner',
    healthCondition: ['thyroid'],
    description: 'Grilled carrots and beans, supports thyroid function.',
  },
];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=500';

interface RecipeCardProps {
  recipe: Recipe;
  flipped: boolean;
  toggleFlip: (id: number) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, flipped, toggleFlip }) => {
  const { width } = useWindowDimensions();
  const cardWidth = width > 700 ? (width - 40) / 2 : width - 32;
  
  const rotation = useSharedValue(0);
  const frontOpacity = useSharedValue(1);
  const backOpacity = useSharedValue(0);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: frontOpacity.value,
    transform: [{ rotateY: `${rotation.value}deg` }],
    backfaceVisibility: 'hidden' as any,
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backOpacity.value,
    transform: [{ rotateY: `${rotation.value + 180}deg` }],
    backfaceVisibility: 'hidden' as any,
  }));

  useEffect(() => {
    rotation.value = withTiming(flipped ? 180 : 0, {
      duration: 400,
      easing: Easing.inOut(Easing.ease),
    });
    frontOpacity.value = withTiming(flipped ? 0 : 1, {
      duration: 400,
    });
    backOpacity.value = withTiming(flipped ? 1 : 0, {
      duration: 400,
    });
  }, [flipped]);

  const handleRecipePress = () => {
    if (recipe.recipeLink) {
      console.log('Recipe link:', recipe.recipeLink);
    }
    toggleFlip(recipe.id);
  };

  return (
    <TouchableOpacity
      onPress={handleRecipePress}
      style={[viewStyles.recipeCard, { width: cardWidth }]}
    >
      <View style={viewStyles.cardInner}>
        <Animated.View style={[viewStyles.cardFront, frontAnimatedStyle]}>
          <Image
            source={{ uri: recipe.image }}
            style={imageStyles.recipeImage}
            defaultSource={{ uri: FALLBACK_IMAGE }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={viewStyles.imageGradient}
          />
          <BlurView intensity={90} tint="dark" style={viewStyles.recipeContent}>
            <View style={viewStyles.recipeHeader}>
              <Text style={textStyles.recipeTitle}>{recipe.title}</Text>
              <View style={viewStyles.recipeStats}>
                <View style={viewStyles.recipeStat}>
                  <Clock size={14} color="#fff" />
                  <Text style={textStyles.recipeStatText}>{recipe.time}</Text>
                </View>
                <View style={viewStyles.recipeStat}>
                  <Fire size={14} color="#fff" />
                  <Text style={textStyles.recipeStatText}>{recipe.calories}</Text>
                </View>
                <View style={viewStyles.recipeStat}>
                  <Users size={14} color="#fff" />
                  <Text style={textStyles.recipeStatText}>{recipe.servings}</Text>
                </View>
              </View>
            </View>
            <View style={viewStyles.recipeTags}>
              {recipe.healthCondition.map((condition) => (
                <View key={condition} style={viewStyles.tag}>
                  <Text style={textStyles.tagText}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </Text>
                </View>
              ))}
              <View style={viewStyles.tag}>
                <Text style={textStyles.tagText}>
                  {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
                </Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
        <Animated.View style={[viewStyles.cardBack, backAnimatedStyle]}>
          <BlurView intensity={90} tint="dark" style={viewStyles.cardBackContent}>
            <Text style={textStyles.descriptionTitle}>{recipe.title}</Text>
            <Text style={textStyles.descriptionText}>{recipe.description}</Text>
            <View style={viewStyles.recipeLinkPlaceholder}>
              <Text style={textStyles.recipeLinkText}>Recipe details coming soon</Text>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default function FoodScreen() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width > 700;
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>({});
  const [userDiseases, setUserDiseases] = useState<HealthCondition[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserDiseases();
    registerForPushNotificationsAsync();
    scheduleDailyNotification();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUserDiseases();
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh recipes. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchUserDiseases = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const diseases = data.diseases || [];
          setUserDiseases(diseases);
          
          // Filter recipes based on user's diseases
          const recommended = recipes.filter(recipe => 
            recipe.healthCondition.some(condition => 
              diseases.includes(condition)
            )
          );
          setRecommendedRecipes(recommended);
        }
      }
    } catch (error) {
      console.error('Error fetching user diseases:', error);
    }
  };

  async function registerForPushNotificationsAsync() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission required', 'Please allow notifications for meal reminders');
      }
    } catch (error) {
      console.error('Failed to register notifications:', error);
    }
  }

  async function scheduleDailyNotification() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Meal Planning Reminder",
          body: "Check today's healthy Indian meal recommendations!"
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 24 * 60 * 60, // 24 hours
          repeats: true
        }
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  const toggleFlip = (id: number) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRecipes = selectedCategory === 'All'
    ? recommendedRecipes
    : recommendedRecipes.filter(recipe => 
        recipe.category.toLowerCase() === selectedCategory.toLowerCase()
      );

  return (
    <View style={viewStyles.container}>
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={viewStyles.gradientBackground}
      />
      <ScrollView 
        style={viewStyles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
            progressBackgroundColor="#2a5298"
          />
        }
      >
        <View style={[viewStyles.header, { paddingTop: Platform.OS === 'ios' ? height * 0.06 : height * 0.04 }]}>
          <BlurView intensity={90} tint="dark" style={viewStyles.headerContent}>
            <View style={viewStyles.headerTop}>
              <Text style={[textStyles.title, { fontSize: width > 500 ? 32 : 28 }]}>Healthy Indian Recipes</Text>
              <TouchableOpacity 
                style={viewStyles.refreshButton}
                onPress={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw 
                  size={20} 
                  color="#fff" 
                  style={[
                    viewStyles.refreshIcon,
                    refreshing && viewStyles.refreshIconSpinning
                  ]} 
                />
              </TouchableOpacity>
            </View>
            <Text style={textStyles.subtitle}>
              {userDiseases.length > 0 
                ? `Personalized recommendations for ${userDiseases.join(', ')}`
                : 'Discover delicious and nutritious meals'}
            </Text>
          </BlurView>
        </View>

        {userDiseases.length === 0 && (
          <View style={viewStyles.noDiseasesContainer}>
            <BlurView intensity={80} tint="dark" style={viewStyles.noDiseasesContent}>
              <Text style={textStyles.noDiseasesText}>
                Please update your health conditions in the profile section to get personalized recipe recommendations.
              </Text>
            </BlurView>
          </View>
        )}

        <View style={viewStyles.categories}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: width * 0.04 }}
          >
            {['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'].map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  viewStyles.categoryButton,
                  selectedCategory === category && viewStyles.categoryButtonActive,
                  { paddingHorizontal: width * 0.04 }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    textStyles.categoryText,
                    selectedCategory === category && textStyles.categoryTextActive,
                    { fontSize: width > 500 ? 16 : 14 }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[viewStyles.recipesContainer, isLargeScreen && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                flipped={!!flippedCards[recipe.id]}
                toggleFlip={toggleFlip}
              />
            ))
          ) : (
            <Text style={textStyles.noRecipesText}>
              {userDiseases.length > 0 
                ? 'No recipes found for this category'
                : 'Please add your health conditions in the profile section'}
            </Text>
          )}
        </View>

        <View style={viewStyles.tipsCard}>
          <BlurView intensity={80} tint="dark" style={viewStyles.tipsContent}>
            <View style={viewStyles.tipsHeader}>
              <Apple size={width > 500 ? 24 : 20} color="#fff" />
              <Text style={[textStyles.tipsTitle, { fontSize: width > 500 ? 20 : 18 }]}>Daily Health Tips</Text>
            </View>
            <Text style={[textStyles.tipItem, { fontSize: width > 500 ? 16 : 14 }]}>• Start your day with warm honey water</Text>
            <Text style={[textStyles.tipItem, { fontSize: width > 500 ? 16 : 14 }]}>• Eat meals at fixed times</Text>
            <Text style={[textStyles.tipItem, { fontSize: width > 500 ? 16 : 14 }]}>• Include fiber-rich vegetables</Text>
            <Text style={[textStyles.tipItem, { fontSize: width > 500 ? 16 : 14 }]}>• Stay hydrated throughout the day</Text>
          </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  } as ViewStyle,
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  header: {
    padding: 16,
  } as ViewStyle,
  headerContent: {
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  categories: {
    marginVertical: 16,
  } as ViewStyle,
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  } as ViewStyle,
  categoryButtonActive: {
    backgroundColor: '#2a5298',
  } as ViewStyle,
  recipesContainer: {
    paddingHorizontal: 16,
  } as ViewStyle,
  recipeCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  } as ViewStyle,
  cardInner: {
    position: 'relative',
    width: '100%',
    height: 240,
  } as ViewStyle,
  cardFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  } as ViewStyle,
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  } as ViewStyle,
  cardBackContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  recipeContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  } as ViewStyle,
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  } as ViewStyle,
  recipeHeader: {
    marginBottom: 8,
  } as ViewStyle,
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 4,
  } as ViewStyle,
  recipeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  } as ViewStyle,
  recipeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  } as ViewStyle,
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  } as ViewStyle,
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a5298',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  } as ViewStyle,
  tipsCard: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    marginTop: -8,
  } as ViewStyle,
  tipsContent: {
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
  } as ViewStyle,
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  recipeLinkPlaceholder: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(42, 82, 152, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as ViewStyle,
  noDiseasesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  } as ViewStyle,
  noDiseasesContent: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  } as ViewStyle,
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  } as ViewStyle,
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  } as ViewStyle,
  refreshIcon: {
    transform: [{ rotate: '0deg' }],
  } as ViewStyle,
  refreshIconSpinning: {
    transform: [{ rotate: '360deg' }],
  } as ViewStyle,
});

const textStyles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  } as TextStyle,
  subtitle: {
    fontSize: 14,
    color: '#ddd',
    opacity: 0.9,
    marginTop: 4,
  } as TextStyle,
  categoryText: {
    color: '#fff',
    fontWeight: '600',
  } as TextStyle,
  categoryTextActive: {
    fontWeight: '800',
  } as TextStyle,
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  recipeStatText: {
    color: '#ddd',
    marginLeft: 4,
    fontSize: 12,
  } as TextStyle,
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  } as TextStyle,
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  descriptionText: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
  viewMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  } as TextStyle,
  noRecipesText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  } as TextStyle,
  tipsTitle: {
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  } as TextStyle,
  tipItem: {
    color: '#ddd',
    marginBottom: 6,
  } as TextStyle,
  recipeLinkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  } as TextStyle,
  noDiseasesText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
});

const imageStyles = StyleSheet.create({
  recipeImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  } as ImageStyle,
});