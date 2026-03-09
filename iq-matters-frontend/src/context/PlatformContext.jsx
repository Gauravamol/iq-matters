import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { apiRequest } from "../lib/api";
import { useAuth } from "./AuthContext";

const PlatformContext = createContext(null);

function toFeatureMap(features) {
  return (features || []).reduce((accumulator, feature) => {
    accumulator[feature.feature_key] = {
      ...feature,
      enabled: Boolean(feature.enabled)
    };
    return accumulator;
  }, {});
}

export function PlatformProvider({ children }) {
  const { token } = useAuth();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshFeatures = useCallback(async () => {
    try {
      const data = await apiRequest("/platform-features", token ? { token } : {});
      setFeatures(data || []);
      return data || [];
    } catch (error) {
      setFeatures([]);
      return [];
    }
  }, [token]);

  const updateFeature = useCallback(async (featureKey, enabled) => {
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await apiRequest(`/admin/platform-features/${featureKey}`, {
      method: "PATCH",
      token,
      body: { enabled }
    });

    setFeatures((current) => {
      const existingFeature = current.find((feature) => feature.feature_key === featureKey);

      if (!existingFeature) {
        return [...current, response.feature];
      }

      return current.map((feature) => (
        feature.feature_key === featureKey ? response.feature : feature
      ));
    });

    return response.feature;
  }, [token]);

  useEffect(() => {
    let isActive = true;

    refreshFeatures().finally(() => {
      if (isActive) {
        setLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [refreshFeatures]);

  const featureMap = useMemo(() => toFeatureMap(features), [features]);
  const animationsEnabled = featureMap.ui_animations?.enabled !== false;

  const value = useMemo(() => ({
    loading,
    features,
    featureMap,
    refreshFeatures,
    updateFeature,
    isFeatureEnabled(featureKey, defaultValue = true) {
      if (!(featureKey in featureMap)) {
        return defaultValue;
      }

      return Boolean(featureMap[featureKey]?.enabled);
    }
  }), [featureMap, features, loading, refreshFeatures, updateFeature]);

  return (
    <PlatformContext.Provider value={value}>
      <MotionConfig reducedMotion={animationsEnabled ? "never" : "always"}>
        {children}
      </MotionConfig>
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const value = useContext(PlatformContext);

  if (!value) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }

  return value;
}
