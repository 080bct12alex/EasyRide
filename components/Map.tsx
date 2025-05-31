import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, Image } from "react-native";
import MaplibreGL from "@maplibre/maplibre-react-native";

import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import {
  calculateDriverTimes,
  generateMarkersFromData,
} from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig.extra?.apiUrl ?? "";
const directionsAPI = Constants.expoConfig.extra?.DIRECTIONS_API_KEY ?? "";
const maptilerKey = Constants.expoConfig.extra?.MAPTILER_API_KEY ?? "";

// Initialize MapLibre
MaplibreGL.setAccessToken(maptilerKey);
MaplibreGL.setConnected(true);

const Map = () => {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();

  const { selectedDriver, setDrivers } = useDriverStore();
  const { data: drivers, loading, error } = useFetch<Driver[]>(`${API_BASE_URL}/api/driver`);

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  useEffect(() => {
    if (Array.isArray(drivers) && userLatitude && userLongitude) {
      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude,
        userLongitude,
      });
      setMarkers(newMarkers);
    }
  }, [drivers, userLatitude, userLongitude]);

  useEffect(() => {
    if (
      markers.length > 0 &&
      destinationLatitude !== undefined &&
      destinationLongitude !== undefined &&
      userLatitude !== undefined &&
      userLongitude !== undefined
    ) {
      calculateDriverTimes({
        markers,
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      }).then((updatedDrivers) => {
        setDrivers(updatedDrivers as MarkerData[]);
      });

      // Fetch directions from GoMaps API
      (async () => {
        try {
          const res = await fetch(
            `https://maps.gomaps.pro/maps/api/directions/json?origin=${userLatitude},${userLongitude}&destination=${destinationLatitude},${destinationLongitude}&key=${directionsAPI}`
          );
          const data = await res.json();
          const polyline = data.routes?.[0]?.overview_polyline?.points;

          if (polyline) {
            const geojson = decodePolylineToGeoJSON(polyline);
            setRouteGeoJSON(geojson);
          }
        } catch (err) {
          console.error("Error fetching directions:", err);
          setRouteGeoJSON(null);
        }
      })();
    }
  }, [
    markers,
    destinationLatitude,
    destinationLongitude,
    userLatitude,
    userLongitude,
  ]);

  function decodePolylineToGeoJSON(encoded: string) {
    let index = 0,
      lat = 0,
      lng = 0,
      coordinates: number[][] = [];

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coordinates.push([lng * 1e-5, lat * 1e-5]);
    }

    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
    };
  }

  if (loading || (!userLatitude && !userLongitude)) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex justify-center items-center w-full h-full">
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MaplibreGL.MapView
        style={{ flex: 1 }}
        styleURL={`https://api.maptiler.com/maps/streets/style.json?key=${maptilerKey}`}

        compassEnabled
        zoomEnabled
        pitchEnabled={false}
        rotateEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        localizeLabels
      >
        <MaplibreGL.Camera
          zoomLevel={14}
          centerCoordinate={[userLongitude ?? 0, userLatitude ?? 0]}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* User Marker */}
        {userLatitude && userLongitude && (
          <MaplibreGL.PointAnnotation
            id="user-location"
            coordinate={[userLongitude, userLatitude]}
          >
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: "#0286FF",
                borderRadius: 10,
                borderWidth: 3,
                borderColor: "white",
              }}
            />
          </MaplibreGL.PointAnnotation>
        )}

        {/* Drivers */}
        {markers.map((marker) => (
          <MaplibreGL.PointAnnotation
            key={marker.id.toString()}
            id={marker.id.toString()}
            coordinate={[marker.longitude, marker.latitude]}
          >
            <Image
              source={
                selectedDriver === +marker.id ? icons.selectedMarker : icons.marker
              }
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </MaplibreGL.PointAnnotation>
        ))}

        {/* Destination */}
        {destinationLatitude && destinationLongitude && (
          <MaplibreGL.PointAnnotation
            id="destination"
            coordinate={[destinationLongitude, destinationLatitude]}
          >
            <Image
              source={icons.pin}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </MaplibreGL.PointAnnotation>
        )}

        {/* Route */}
        {routeGeoJSON && (
          <MaplibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MaplibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: "#0286FF",
                lineWidth: 3,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MaplibreGL.ShapeSource>
        )}
      </MaplibreGL.MapView>
    </View>
  );
};

export default Map;