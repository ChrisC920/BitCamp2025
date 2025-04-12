import React, { useEffect, useRef, useState } from "react";
import {
    Viewer,
    Color,
    GeoJsonDataSource,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
    BingMapsImageryProvider,
    BingMapsStyle,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

const HeatmapGlobe = () => {
    const viewerRef = useRef(null);
    const [selectedEntity, setSelectedEntity] = useState(null);

    useEffect(() => {
        const viewer = new Viewer(viewerRef.current, {
            // imageryProvider: new BingMapsImageryProvider({
            //     mapStyle: BingMapsStyle.AERIAL,
            // }),
            // baseLayerPicker: false,
            infoBox: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
        });

        GeoJsonDataSource.load("/data/merged_dementia.geo.json")
            .then((dataSource) => {
                viewer.dataSources.add(dataSource);

                dataSource.entities.values.forEach((entity) => {
                    const val = entity.properties?.val?._value;

                    if (!entity.polygon || val == null || isNaN(val)) return;

                    const normalized = Math.min(val / 5000, 1); // Adjust this scale based on your data
                    const color = Color.fromHsl((1 - normalized) * 0.6, 1.0, 0.5).withAlpha(0.8); // red-yellow

                    entity.polygon.material = color;
                    entity.polygon.outline = true;
                    entity.polygon.outlineColor = Color.BLACK.withAlpha(0.3);
                });

                viewer.zoomTo(dataSource);

                // Add click handler for custom info display
                const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction((movement) => {
                    const picked = viewer.scene.pick(movement.position);
                    if (defined(picked) && picked.id && picked.id.properties?.val) {
                        setSelectedEntity(picked.id);
                    } else {
                        setSelectedEntity(null);
                    }
                }, ScreenSpaceEventType.LEFT_CLICK);
            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
            });

        return () => {
            viewerRef.current?.cesiumWidget?.destroy();
        };
    }, []);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    height: "100%",
                    width: "30%",
                    background: "#D3D3D3",
                    boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                    transform: selectedEntity ? "translateX(0)" : "translateX(100%)",
                    transition: "transform 0.3s ease-in-out",
                    zIndex: 1000,
                    borderTopLeftRadius: "12px",
                    borderBottomLeftRadius: "12px",
                    overflowY: "auto",
                }}
            >
                {selectedEntity && (() => {
                    const props = selectedEntity.properties;
                    const val = props?.val?._value;
                    const name = props.country?._value || props.name_en?._value || "Unknown";

                    // 🔥 Color border based on normalized dementia value
                    const normalized = Math.min(val / 5000, 1);
                    const topBorderColor = Color.fromHsl((1 - normalized) * 0.6, 1.0, 0.5).withAlpha(0.8); // red-yellow


                    // 🌍 Optional flag URL (using CountryFlags API or similar)
                    const flagUrl = `https://flagsapi.com/${props.iso_a2?._value || ""}/flat/64.png`;

                    return (
                        <div style={{ padding: "24px", paddingTop: "18px" }}>
                            {/* 🔴 Colored top border */}
                            <div
                                style={{
                                    height: "6px",
                                    background: topBorderColor,
                                    borderTopLeftRadius: "12px",
                                    borderTopRightRadius: "12px",
                                    margin: "-24px -24px 16px -24px",
                                }}
                            />

                            {/* ❌ Close Button */}
                            <button
                                onClick={() => setSelectedEntity(null)}
                                style={{
                                    position: "absolute",
                                    top: "10px",
                                    right: "16px",
                                    fontSize: "20px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#999",
                                }}
                            >
                                &times;
                            </button>

                            {/* 🇺🇳 Flag */}
                            {props.iso_a2?._value && (
                                <img
                                    src={flagUrl}
                                    alt={`${name} flag`}
                                    style={{
                                        width: "48px",
                                        height: "32px",
                                        borderRadius: "4px",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                        marginBottom: "12px",
                                    }}
                                />
                            )}

                            <h2 style={{ marginTop: "0", marginBottom: "12px", fontSize: "20px", color: "#333" }}>
                                {name}
                            </h2>

                            <p style={{ margin: "8px 0", fontSize: "14px" }}>
                                <strong>Population:</strong> {props.pop_est?._value?.toLocaleString()}
                            </p>
                            <p style={{ margin: "8px 0", fontSize: "14px" }}>
                                <strong>Income Group:</strong> {props.income_grp?._value}
                            </p>
                            <p style={{ margin: "8px 0", fontSize: "14px" }}>
                                <strong>Subregion:</strong> {props.subregion?._value}
                            </p>
                            <p style={{ margin: "8px 0", fontSize: "14px" }}>
                                <strong>Dementia Rate:</strong> {val?.toFixed(1) + " occurrences per 100k people"}
                            </p>
                        </div>
                    );
                })()}
            </div>
        </div>


    );
};
export default HeatmapGlobe;
