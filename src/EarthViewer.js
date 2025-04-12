import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { Viewer, GeoJsonDataSource } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Needed for Cesium to find assets
window.CESIUM_BASE_URL = "/cesium";

function EarthViewer() {
    const viewerRef = useRef(null);
    const test = null;

    useEffect(() => {
        const viewer = new Viewer(viewerRef.current);

        // Load the GeoJSON file
        const geoJsonUrl = "/data/countries.geo.json"; // Path relative to the public folder
        GeoJsonDataSource.load(geoJsonUrl, {
            stroke: Cesium.Color.BLUE, // Outline color
            fill: Cesium.Color.YELLOW.withAlpha(0.3), // Fill color with transparency
            strokeWidth: 2,
            markerSymbol: "?",
        }).then((dataSource) => {
            viewer.dataSources.add(dataSource);
            viewer.zoomTo(dataSource); // Zoom to the loaded data
        }).catch((error) => {
            console.error("Error loading GeoJSON:", error);
        });

        return () => viewer.destroy();
    }, []);

    return (
        <div
            ref={viewerRef}
            style={{ width: "100%", height: "600px", position: "relative" }}
        />
    );
}

export default EarthViewer;
