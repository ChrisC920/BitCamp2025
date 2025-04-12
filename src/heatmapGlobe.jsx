import React, { useEffect, useRef } from "react";
import {
    Viewer,
    Color,
    GeoJsonDataSource
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

const HeatmapGlobe = () => {
    const viewerRef = useRef(null);

    useEffect(() => {
        const viewer = new Viewer(viewerRef.current);

        GeoJsonDataSource.load("/data/merged_dementia.geo.json")
            .then((dataSource) => {
                viewer.dataSources.add(dataSource);

                dataSource.entities.values.forEach((entity) => {
                    const val = entity.properties?.val?._value;

                    if (!entity.polygon || val == null || isNaN(val)) return;

                    // 🔥 Normalize and map value to a color
                    const normalized = Math.min(val / 2000, 1); // Adjust this scale based on your data
                    const color = Color.fromHsl((1 - normalized) * 0.6, 1.0, 0.5).withAlpha(0.8); // red-yellow

                    entity.polygon.material = color;
                    entity.polygon.outline = true;
                    entity.polygon.outlineColor = Color.BLACK.withAlpha(0.3);
                });

                viewer.zoomTo(dataSource);
            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
            });

        return () => viewer.destroy();
    }, []);

    return <div ref={viewerRef} style={{ width: "100%", height: "100vh" }} />;
};

export default HeatmapGlobe;
