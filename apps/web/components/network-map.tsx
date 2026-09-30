"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";

export type NetworkMapLocation = {
  latitude: number;
  longitude: number;
  countryCode: string | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
};

export type NetworkMapPoint = NetworkMapLocation & {
  address: string;
  port: number | null;
  network: string;
  connected: boolean;
  discovered: boolean;
};

function formatEndpoint(point: NetworkMapPoint): string {
  if (point.port === null) {
    return point.address;
  }

  if (point.address.includes(":") && !point.address.startsWith("[")) {
    return `[${point.address}]:${point.port}`;
  }

  return `${point.address}:${point.port}`;
}

function formatLocation(point: NetworkMapPoint): string {
  const parts = [point.cityName, point.regionName, point.countryName].filter(
    (value): value is string => value !== null && value.length > 0
  );

  return parts.length === 0 ? "Approximate location unavailable" : parts.join(", ");
}

export function NetworkMap({
  points,
  providerConfigured,
  eligibleAddressCount,
  styleUrl,
}: {
  points: NetworkMapPoint[];
  providerConfigured: boolean;
  eligibleAddressCount: number;
  styleUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const geojson = {
      type: "FeatureCollection" as const,
      features: points.map((point, index) => ({
        type: "Feature" as const,
        id: index,
        geometry: {
          type: "Point" as const,
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          address: point.address,
          port: point.port,
          network: point.network,
          connected: point.connected,
          discovered: point.discovered,
          countryCode: point.countryCode,
          countryName: point.countryName,
          regionName: point.regionName,
          cityName: point.cityName,
        },
      })),
    };

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [10, 22],
      zoom: 1.15,
      minZoom: 1,
      maxZoom: 12,
    });

    map.addControl(
      new NavigationControl({
        visualizePitch: false,
        showCompass: false,
      }),
      "top-right"
    );

    map.on("error", () => {
      setMapError(true);
    });

    map.on("load", () => {
      setMapError(false);

      map.addSource("mercatura-network-nodes", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 44,
      });

      map.addLayer({
        id: "mercatura-node-clusters",
        type: "circle",
        source: "mercatura-network-nodes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#e3ae43", 10, "#c98f2f", 50, "#a66d1c"],
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 21, 50, 27],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#201706",
          "circle-opacity": 0.92,
        },
      });

      map.addLayer({
        id: "mercatura-node-cluster-count",
        type: "symbol",
        source: "mercatura-network-nodes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#111008",
        },
      });

      map.addLayer({
        id: "mercatura-nodes",
        type: "circle",
        source: "mercatura-network-nodes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#f0bd50",
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#5d4316",
          "circle-opacity": 0.96,
        },
      });

      map.on("click", "mercatura-node-clusters", async (event) => {
        const feature = event.features?.[0];

        if (
          feature === undefined ||
          feature.geometry.type !== "Point" ||
          feature.properties === null
        ) {
          return;
        }

        const clusterId = Number(feature.properties.cluster_id);

        if (!Number.isFinite(clusterId)) {
          return;
        }

        const source = map.getSource("mercatura-network-nodes") as GeoJSONSource;

        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);

          map.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom,
          });
        } catch {
          // A failed map interaction must not affect explorer data.
        }
      });

      map.on("click", "mercatura-nodes", (event) => {
        const feature = event.features?.[0];

        if (
          feature === undefined ||
          feature.geometry.type !== "Point" ||
          feature.properties === null
        ) {
          return;
        }

        const coordinates = feature.geometry.coordinates as [number, number];

        const properties = feature.properties as Record<string, unknown>;

        const point: NetworkMapPoint = {
          address: String(properties.address ?? ""),
          port:
            properties.port === null || properties.port === undefined || properties.port === ""
              ? null
              : Number(properties.port),
          network: String(properties.network ?? ""),
          connected: properties.connected === true || properties.connected === "true",
          discovered: properties.discovered === true || properties.discovered === "true",
          latitude: coordinates[1],
          longitude: coordinates[0],
          countryCode:
            properties.countryCode === null || properties.countryCode === undefined
              ? null
              : String(properties.countryCode),
          countryName:
            properties.countryName === null || properties.countryName === undefined
              ? null
              : String(properties.countryName),
          regionName:
            properties.regionName === null || properties.regionName === undefined
              ? null
              : String(properties.regionName),
          cityName:
            properties.cityName === null || properties.cityName === undefined
              ? null
              : String(properties.cityName),
        };

        const popup = document.createElement("div");
        popup.className = "mercatura-map-popup";

        const endpoint = document.createElement("div");
        endpoint.className = "mercatura-map-popup-endpoint";
        endpoint.textContent = formatEndpoint(point);

        const location = document.createElement("div");
        location.className = "mercatura-map-popup-location";
        location.textContent = formatLocation(point);

        const observation = document.createElement("div");
        observation.className = "mercatura-map-popup-observation";

        const labels: string[] = [];

        if (point.connected) {
          labels.push("connected peer");
        }

        if (point.discovered) {
          labels.push("discovered address");
        }

        observation.textContent =
          labels.length === 0 ? "Public network observation" : labels.join(" · ");

        popup.append(endpoint, location, observation);

        new Popup({
          offset: 12,
          maxWidth: "340px",
        })
          .setLngLat(coordinates)
          .setDOMContent(popup)
          .addTo(map);
      });

      for (const layer of ["mercatura-node-clusters", "mercatura-nodes"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    return () => {
      map.remove();
    };
  }, [points, styleUrl]);

  const status = !providerConfigured
    ? "Local node geolocation is not configured yet."
    : points.length === 0
      ? `${eligibleAddressCount.toLocaleString(
          "en-US"
        )} public IP observations are eligible, but none currently resolved to a geographic location.`
      : null;

  return (
    <div className="mercatura-map relative min-h-[390px] overflow-hidden rounded-[8px] border border-[#292a24] bg-[#090b0a]">
      <div ref={containerRef} className="absolute inset-0" />

      {status !== null ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 rounded-lg border border-[#5a431d] bg-[#0b0d0c]/95 px-4 py-3 text-xs leading-5 text-[#b0a17f] shadow-xl">
          {status}
        </div>
      ) : null}

      {mapError ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-[#5c4520] bg-[#11120f]/95 px-3 py-2 text-xs text-[#c9a35b]">
          Basemap tiles are temporarily unavailable.
        </div>
      ) : null}
    </div>
  );
}
