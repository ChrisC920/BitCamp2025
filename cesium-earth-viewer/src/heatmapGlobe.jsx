import React, { useEffect, useRef, useState } from "react";
import {
    Viewer,
    Color,
    GeoJsonDataSource,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
    Cartesian3, 
    Math as CesiumMath,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

const HeatmapGlobe = ({ year }) => {
    const viewerRef = useRef(null);
    const viewerInstance = useRef(null);
    const clickHandler = useRef(null);
    const dataSourceRef = useRef(null);
    const abortControllerRef = useRef(new AbortController());

    const [selectedEntity, setSelectedEntity] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize viewer 
    useEffect(() => {
        viewerInstance.current = new Viewer(viewerRef.current, {
            infoBox: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
        });

        const viewer = viewerInstance.current;
        viewer.camera.setView({
            destination: Cartesian3.fromDegrees(-95.0, 40.0, 20000000),
            orientation: {
                heading: CesiumMath.toRadians(0),
                pitch: CesiumMath.toRadians(-90),
                roll: 0,
            },
        });

        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
                viewerInstance.current = null;
            }
        };
    }, []);

    // data loading
    useEffect(() => {
        const viewer = viewerInstance.current;
        if (!viewer) return;

        const loadData = async () => {
            setLoading(true);
            setSelectedEntity(null);
            setExplanation(null);
            
            try {
                abortControllerRef.current.abort();
                abortControllerRef.current = new AbortController();

                // Clear previous data
                if (dataSourceRef.current) {
                    viewer.dataSources.remove(dataSourceRef.current);
                    dataSourceRef.current = null;
                }
                if (clickHandler.current) {
                    clickHandler.current.destroy();
                    clickHandler.current = null;
                }

                // Load new data
                const dataSource = await GeoJsonDataSource.load(
                    `/data/merged_dementia${year}.geo.json`,
                    { abortSignal: abortControllerRef.current.signal }
                );
                
                dataSourceRef.current = dataSource;
                viewer.dataSources.add(dataSource);

                // Style entities
                dataSource.entities.values.forEach((entity) => {
                    const val = entity.properties?.val?._value;
                    if (!entity.polygon || val == null || isNaN(val)) return;

                    const normalized = Math.min(val / 5000, 1);
                    const color = Color.fromHsl(
                        (1 - normalized) * 0.6, 
                        1.0, 
                        0.5
                    ).withAlpha(0.4);

                    entity.polygon.material = color;
                    entity.polygon.outline = true;
                    entity.polygon.outlineColor = Color.BLACK.withAlpha(0.3);
                });

                // click handler
                clickHandler.current = new ScreenSpaceEventHandler(viewer.scene.canvas);
                clickHandler.current.setInputAction((movement) => {
                    const picked = viewer.scene.pick(movement.position);
                    if (defined(picked) && picked.id?.properties?.val) {
                        setSelectedEntity(picked.id);
                    } else {
                        setSelectedEntity(null);
                    }
                    setExplanation(null);
                }, ScreenSpaceEventType.LEFT_CLICK);

                await viewer.zoomTo(dataSource);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Error loading GeoJSON:", error);
                }
            }
            setLoading(false);
        };

        loadData();

        return () => {
            abortControllerRef.current.abort();
            if (clickHandler.current) {
                clickHandler.current.destroy();
                clickHandler.current = null;
            }
        };
    }, [year]);

    // ai explanation
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
            .then((data) => setExplanation(data.explanation))
            .catch(() => setExplanation("AI failed to generate insight."));
    }, [selectedEntity]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

            {loading && (
                <div style={{
                    position: "absolute",
                    zIndex: 2000,
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "#000000cc",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#fff",
                    fontSize: "1.6rem",
                    fontWeight: "bold",
                }}>
                    Loading globe...
                </div>
            )}

            <div style={{
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
                overflowY: "auto",
            }}>
                {selectedEntity && (() => {
                    const props = selectedEntity.properties;
                    const val = props?.val?._value;
                    const name = props.country?._value || props.name_en?._value || "Unknown";
                    const normalized = Math.min(val / 5000, 1);
                    const topBorderColor = `rgb(
                        ${Math.round(255 - 116 * normalized)},
                        ${Math.round(255 * (1 - normalized))},
                        0
                    )`;

                    return (
                        <div style={{ padding: "24px" }}>
                            <div style={{
                                height: "6px",
                                background: topBorderColor,
                                margin: "-24px -24px 16px -24px",
                            }} />

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
                                    src={`https://flagsapi.com/${props.iso_a2._value}/flat/64.png`}
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

                            <h2 style={{ margin: "0 0 12px 0", fontSize: "20px" }}>{name}</h2>
                            <p><strong>Population:</strong> {props.pop_est?._value?.toLocaleString()}</p>
                            <p><strong>Income Group:</strong> {props.income_grp?._value}</p>
                            <p><strong>Dementia Rate:</strong> {val?.toFixed(1)} per 100k</p>
                            
                            {explanation && (
                                <p style={{ marginTop: "16px", fontStyle: "italic" }}>
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
