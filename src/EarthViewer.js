import React, { useEffect, useRef } from "react";
import { Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Needed for Cesium to find assets
window.CESIUM_BASE_URL = "/cesium";

function EarthViewer() {
    const viewerRef = useRef(null);
    const test = null;

    useEffect(() => {
        const viewer = new Viewer(viewerRef.current);
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
