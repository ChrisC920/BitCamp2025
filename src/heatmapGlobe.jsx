import React, { useEffect, useRef } from "react";
import {
    Viewer,
    Color,
    GeoJsonDataSource,
} from "cesium";
// import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

const HeatmapGlobe = () => {
    const viewerRef = useRef(null);
    const viewerInstance = useRef(null);

    useEffect(() => {
        // cesium viewer
        viewerInstance.current = new Viewer(viewerRef.current);

        // Load the country borders json
        const geoJsonUrl = "../data/countries.geo2.json";
        GeoJsonDataSource.load(geoJsonUrl, {
            stroke: Color.BLUE, // Border color
            fill: Color.PINK.withAlpha(0.5),
            strokeWidth: 5,
            markerSymbol: '?'
        })
            .then((dataSource) => {
                viewerInstance.current.dataSources.add(dataSource);
            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
            });

        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
            }
        };
    }, []);

    return <div ref={viewerRef} style={{ width: "100%", height: "100vh" }} />;
};

export default HeatmapGlobe;
