import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { fetchAPI } from "@/lib/fetch";


import Constants from "expo-constants";
const API_BASE_URL = Constants.expoConfig.extra.apiUrl;

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      // Ensure error is properly handled
      console.error("SecureStore get item error: ", error instanceof Error ? error.message : String(error));
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (deleteError) {
        // Silently handle deletion errors
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      // Log the error but don't throw
      console.error("Error saving token:", err instanceof Error ? err.message : String(err));
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/(tabs)/home"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        if (signUp && signUp.createdUserId) {
          try {
            await fetchAPI(`${API_BASE_URL}/api/user`, {
              method: "POST",
              body: JSON.stringify({
                name: `${signUp.firstName} ${signUp.lastName}`,
                email: signUp.emailAddress,
                clerkId: signUp.createdUserId,
              }),
            });
          } catch (apiError) {
            console.error("API error during signup:", apiError);
            // Continue despite API error
          }
        }

        return {
          success: true,
          code: "success",
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error("OAuth error:", err instanceof Error ? err.message : String(err));
    return {
      success: false,
      code: err.code || "unknown_error",
      message: err?.errors && err.errors[0]?.longMessage ? err.errors[0].longMessage : "An error occurred during authentication",
    };
  }
};