import React, { useEffect, useRef, useState } from "react";
import {
    Viewer,
    Color,
    GeoJsonDataSource,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

const HeatmapGlobe = () => {
    const viewerRef = useRef(null);
    const viewerInstance = useRef(null);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [explanation, setExplanation] = useState(null); // 🌟 Gemini explanation state

    useEffect(() => {
        viewerInstance.current = new Viewer(viewerRef.current, {
            infoBox: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
        });
        const viewer = viewerInstance.current;

        GeoJsonDataSource.load("/data/merged_dementia.geo.json")
            .then((dataSource) => {
                viewer.dataSources.add(dataSource);

                dataSource.entities.values.forEach((entity) => {
                    const val = entity.properties?.val?._value;
                    if (!entity.polygon || val == null || isNaN(val)) return;

                    const normalized = Math.min(val / 5000, 1);
                    const color = Color.fromHsl((1 - normalized) * 0.6, 1.0, 0.5).withAlpha(0.8); // red-yellow

                    entity.polygon.material = color;
                    entity.polygon.outline = true;
                    entity.polygon.outlineColor = Color.BLACK.withAlpha(0.3);
                });

                viewer.zoomTo(dataSource);

                // 👆 Handle clicks to select countries
                const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction((movement) => {
                    const picked = viewer.scene.pick(movement.position);
                    if (defined(picked) && picked.id && picked.id.properties?.val) {
                        setSelectedEntity(picked.id);
                        setExplanation(null); // Clear previous AI explanation
                    } else {
                        setSelectedEntity(null);
                        setExplanation(null);
                    }
                }, ScreenSpaceEventType.LEFT_CLICK);
            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
            });

        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
                viewerInstance.current = null;
            }
            viewerRef.current?.cesiumWidget?.destroy();
        };
    }, []);

    // 🔌 Fetch Gemini explanation
    useEffect(() => {
        if (!selectedEntity) return;

        const props = selectedEntity.properties;
        const country = props.country?._value || props.name_en?._value || "Unknown";
        const val = props.val?._value;
        const population = props.pop_est?._value;
        const income = props.income_grp?._value;

        if (!val || !population || !income) return;

        fetch("http://localhost:3001/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, val, population, income }),
        })
            .then((res) => res.json())
            .then((data) => {
                setExplanation(data.explanation);
            })
            .catch((err) => {
                console.error("Failed to fetch explanation:", err);
                setExplanation("AI failed to generate insight.");
            });
    }, [selectedEntity]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    height: "100%",
                    width: "340px",
                    background: "#ffffff",
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

                    const normalized = Math.min(val / 5000, 1);
                    const r = Math.round(255 - 116 * normalized);
                    const g = Math.round(255 * (1 - normalized));
                    const topBorderColor = `rgb(${r},${g},0)`;
                    const flagUrl = `https://flagsapi.com/${props.iso_a2?._value || ""}/flat/64.png`;

                    return (
                        <div style={{ padding: "24px", paddingTop: "18px" }}>
                            <div
                                style={{
                                    height: "6px",
                                    background: topBorderColor,
                                    borderTopLeftRadius: "12px",
                                    borderTopRightRadius: "12px",
                                    margin: "-24px -24px 16px -24px",
                                }}
                            />

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
                                <strong>Dementia Rate:</strong> {val?.toFixed(1)} per 100k
                            </p>

                            {explanation && (
                                <p style={{ fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>
                                    <strong>AI Insight:</strong> {explanation}
                                </p>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default HeatmapGlobe;
