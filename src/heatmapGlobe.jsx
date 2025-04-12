// HeatmapGlobe.js
import React, { useEffect, useRef } from "react";
import {
    Viewer,
    Cartesian3,
    Color,
    LabelStyle,
    VerticalOrigin,
    Cartesian2
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";


const HeatmapGlobe = ({ data }) => {
    const viewerRef = useRef(null);
    const viewerInstance = useRef(null);

    useEffect(() => {
        viewerInstance.current = new Viewer(viewerRef.current);

        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        const viewer = viewerInstance.current;
        if (!viewer) return;

        // Clear previous entities
        viewer.entities.removeAll();

        data.forEach((point) => {
            const intensity = Math.min(point.value / 3000, 1.0); // Normalize for color
            const color = Color.fromHsl((1 - intensity) * 0.6, 1, 0.5); // Heat color (red → yellow)

            viewer.entities.add({
                position: Cartesian3.fromDegrees(point.lon, point.lat),
                point: {
                    pixelSize: 10,
                    color,
                },
                label: {
                    text: `${point.country}: ${point.value.toFixed(1)}`,
                    font: "12px sans-serif",
                    fillColor: Color.WHITE,
                    verticalOrigin: VerticalOrigin.BOTTOM,
                    pixelOffset: new Cartesian2(0, -12),

                },
            });
        });

        viewer.zoomTo(viewer.entities);
    }, [data]);

    return <div ref={viewerRef} style={{ width: "100%", height: "100vh" }} />;
};

export default HeatmapGlobe;
