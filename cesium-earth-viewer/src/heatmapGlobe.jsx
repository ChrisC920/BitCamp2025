import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
    Viewer,
    Color,
    GeoJsonDataSource,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
    Cartesian3, Math as CesiumMath,
    Ion,
    ArcGisMapServerImageryProvider,
} from "cesium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";
Ion.defaultAccessToken = process.env.REACT_APP_CESIUM_ION_TOKEN;

const useTypewriter = (text, speed = 25) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        if (!text) return setDisplayedText("");
        let index = 0;
        setDisplayedText("");

        const interval = setInterval(() => {
            setDisplayedText((prev) => prev + text.charAt(index));
            index++;
            if (index >= text.length) clearInterval(interval);
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return displayedText;
};


const HeatmapGlobe = () => {
    const viewerRef = useRef(null);
    const viewerInstance = useRef(null);
    const lastClickedIdRef = useRef(null); // 🆕 stores last clicked entity ID


    const [selectedEntity, setSelectedEntity] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0); // From 0 to 100

    const [isGenerating, setIsGenerating] = useState(false); // 🆕 add this
    const typedExplanation = useTypewriter(explanation, 10);



    useEffect(() => {
        viewerInstance.current = new Viewer(viewerRef.current, {
            projectionPicker: false,
            sceneModePicker: false,
            baseLayerPicker: false,
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

        GeoJsonDataSource.load("/data/merged_dementia.geo.json")
            .then((dataSource) => {
                viewer.dataSources.add(dataSource);

                dataSource.entities.values.forEach((entity) => {
                    const val = entity.properties?.val?._value;
                    if (!entity.polygon || val == null || isNaN(val)) return;

                    const normalized = Math.min(val / 5000, 1);
                    const color = Color.fromHsl((1 - normalized) * 0.6, 1.0, 0.5).withAlpha(0.3);

                    entity.polygon.material = color;
                    entity.polygon.outline = true;
                    entity.polygon.outlineColor = Color.BLACK.withAlpha(0.8);
                    entity.polygon.outlineWidth = 2;
                });

                viewer.zoomTo(dataSource).then(() => {
                    setLoading(false);
                    viewer.camera.flyTo({
                        destination: Cartesian3.fromDegrees(-95.0, 40.0, 20000000), // View over America
                        orientation: {
                            heading: CesiumMath.toRadians(360),     // Full spin
                            pitch: CesiumMath.toRadians(-90),       // Top-down view
                            roll: 0,
                        },
                        duration: 3, // seconds
                        easingFunction: Cesium.EasingFunction.SINUSOIDAL_IN_OUT,
                    });

                });

                // 👆 Handle clicks
                const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction((movement) => {
                    const picked = viewer.scene.pick(movement.position);

                    if (defined(picked) && picked.id && picked.id.properties?.val) {
                        const newId = picked.id.id;

                        // 🛑 Ignore if the clicked country is already selected
                        if (lastClickedIdRef.current === newId) return;

                        lastClickedIdRef.current = newId;           // Update last clicked
                        setExplanation(null);                       // Clear old insight
                        setSelectedEntity(picked.id);               // Select new entity

                    } else {
                        // 🌐 Clicked on empty space
                        lastClickedIdRef.current = null;
                        setSelectedEntity(null);
                        setExplanation(null);
                    }
                }, ScreenSpaceEventType.LEFT_CLICK);


            })
            .catch((error) => {
                console.error("Error loading GeoJSON:", error);
            });
        const test = null;
        return () => {
            if (viewerInstance.current) {
                viewerInstance.current.destroy();
                viewerInstance.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!selectedEntity) return;

        const props = selectedEntity.properties;
        const country = props.country?._value || props.name_en?._value || "Unknown";
        const val = props.val?._value;
        const population = props.pop_est?._value;
        const income = props.income_grp?._value;

        if (!val || !population || !income) return;

        setIsGenerating(true); // 🟡 start loading

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
                setExplanation("⚠️ AI failed to generate insight.");
            })
            .finally(() => {
                setIsGenerating(false); // ✅ done loading
            });
    }, [selectedEntity]);
    useEffect(() => {
        if (!loading) return;
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            setLoadingProgress(Math.min(progress, 100));
            if (progress >= 100) clearInterval(interval);
        }, 60); // ~3 seconds

        return () => clearInterval(interval);
    }, [loading]);


    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            {/* 🌍 Cesium Viewer */}
            <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

            {/* ⏳ Loading Overlay */}
            {loading && (
                <div
                    style={{
                        position: "absolute",
                        zIndex: 2000,
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: "#000000ee",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                        color: "#fff",
                        fontSize: "1.4rem",
                        fontFamily: "Segoe UI, sans-serif",
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            width: "120px",
                            height: "120px",
                            marginBottom: "20px",
                        }}
                    >
                        {/* Globe image */}
                        <img
                            src="/images/earth.png"
                            alt="Earth"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                opacity: 0.15,
                                position: "absolute",
                                top: 0,
                                left: 0,
                                zIndex: 1,
                            }}
                        />

                        {/* Filled progress overlay */}
                        <div
                            style={{
                                backgroundImage: "url(/images/earth.png)",
                                backgroundSize: "cover",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: `${loadingProgress}%`,
                                height: "100%",
                                opacity: 1,
                                zIndex: 2,
                                transition: "width 0.2s ease-out",
                            }}
                        />
                    </div>

                    <div style={{ fontWeight: 500 }}>
                        Loading Earth Visualization... {loadingProgress}%
                    </div>
                </div>
            )}



            {/* ℹ️ Info Side Panel */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    height: "100%",
                    width: "30%",
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

                            <div style={{ fontSize: "13px", marginTop: "16px", fontStyle: "italic" }}>
                                <strong>AI Insight:</strong>{" "}
                                {isGenerating ? (
                                    <span style={{ color: "#888", fontStyle: "normal" }}>Generating insight<span className="dot-flash">...</span></span>
                                ) : explanation ? (
                                    <ReactMarkdown>{typedExplanation}</ReactMarkdown>
                                ) : (
                                    <span style={{ color: "#aaa" }}>No insight available.</span>
                                )}

                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

};

export default HeatmapGlobe;
