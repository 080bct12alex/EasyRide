import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";

import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";

const goMapsApiKey = process.env.EXPO_PUBLIC_PLACES_API_KEY;

const GoogleTextInput = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = async (input: string) => {
    if (!input) return setSuggestions([]);

    try {
      const url = `https://maps.gomaps.pro/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${goMapsApiKey}`;

      const res = await fetch(url);
      const json = await res.json();
      setSuggestions(json.predictions || []);
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    try {
      const url = `https://maps.gomaps.pro/maps/api/place/details/json?place_id=${placeId}&key=${goMapsApiKey}`;
      const res = await fetch(url);
      const json = await res.json();

      const loc = json.result.geometry.location;
      handlePress({
        latitude: loc.lat,
        longitude: loc.lng,
        address: description,
      });

      setQuery(description);
      setSuggestions([]);
    } catch (err) {
      console.error("Details error:", err);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <View
      className={`flex flex-col items-center justify-center relative z-50 rounded-xl ${containerStyle}`}
    >
      <View className="flex flex-row items-center bg-white px-4 py-2 rounded-full shadow-sm w-full">
        <View className="justify-center items-center w-6 h-6 mr-2">
          <Image
            source={icon ? icon : icons.search}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={initialLocation ?? "Where do you want to go?"}
          placeholderTextColor="gray"
          className="flex-1 text-base font-semibold"
          style={{
            backgroundColor: textInputBackgroundColor || "white",
          }}
        />
      </View>

      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          className="bg-white rounded-xl mt-2 w-full shadow-md max-h-60"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="px-4 py-3 border-b border-gray-200"
              onPress={() => handleSelect(item.place_id, item.description)}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default GoogleTextInput;
