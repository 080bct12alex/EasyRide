import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { ReactNativeModal } from "react-native-modal";

import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useLocationStore } from "@/store";
import { PaymentProps } from "@/types/type";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? "MISSING_apiUrl";

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
}: PaymentProps) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { userId } = useAuth();

  const {
    userAddress,
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationAddress,
    destinationLongitude,
  } = useLocationStore();

  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const openPaymentSheet = async () => {
    setLoading(true);
    try {
      const initSuccess = await initializePaymentSheet();
      if (!initSuccess) return;

      const { error } = await presentPaymentSheet();
      if (error) {
        Alert.alert(`Error code: ${error.code}`, error.message);
      } else {
        // Payment succeeded — now create ride booking
        await fetchAPI(`${API_BASE_URL}/api/ride/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin_address: userAddress,
            destination_address: destinationAddress,
            origin_latitude: userLatitude,
            origin_longitude: userLongitude,
            destination_latitude: destinationLatitude,
            destination_longitude: destinationLongitude,
            ride_time: rideTime.toFixed(0),
            fare_price: parseInt(amount) * 100,
            payment_status: "paid",
            driver_id: driverId,
            user_id: userId,
          }),
        });

        setSuccess(true);
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong during payment.");
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentSheet = async (): Promise<boolean> => {
    try {
      const response = await fetchAPI(`${API_BASE_URL}/api/stripe/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName || email.split("@")[0],
          email,
          amount,
        }),
      });

      const { paymentIntent, customer, ephemeralKey } = response;

      const { error } = await initPaymentSheet({
        merchantDisplayName: "EasyRyde",
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey.secret,
        paymentIntentClientSecret: paymentIntent.client_secret,
        allowsDelayedPaymentMethods: true,
        returnURL: "myapp://book-ride",
      });

      if (error) {
        Alert.alert("Error", error.message);
        return false;
      }

      return true;
    } catch (error) {
      Alert.alert("Init Error", "Failed to initialize payment sheet");
      return false;
    }
  };

  if (loading)
    return (
      <View className="flex items-center justify-center w-full h-full">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );

  return (
    <>
      <CustomButton
        title="Confirm Ride"
        className="my-10"
        onPress={openPaymentSheet}
      />

      <ReactNativeModal
        isVisible={success}
        onBackdropPress={() => setSuccess(false)}
      >
        <View className="flex flex-col items-center justify-center bg-white p-7 rounded-2xl">
          <Image source={images.check} className="w-28 h-28 mt-5" />
          <Text className="text-2xl text-center font-JakartaBold mt-5">
            Booking placed successfully
          </Text>
          <Text className="text-md text-general-200 font-JakartaRegular text-center mt-3">
            Thank you for your booking. Your reservation has been successfully
            placed. Please proceed with your trip.
          </Text>
          <CustomButton
            title="Back Home"
            onPress={() => {
              setSuccess(false);
              router.push("/(root)/(tabs)/home");
            }}
            className="mt-5"
          />
        </View>
      </ReactNativeModal>
    </>
  );
};

export default Payment;
