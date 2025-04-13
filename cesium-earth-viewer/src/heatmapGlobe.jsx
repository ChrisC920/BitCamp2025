import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import {
    Viewer,
    Color,
    GeoJsonDataSource,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    defined,
    Cartesian3,
    Math as CesiumMath,
    Ion,
} from "cesium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";
Ion.defaultAccessToken = process.env.REACT_APP_CESIUM_ION_TOKEN;

const DATA_SETS = [
    { year: 2013, path: "/data/merged_dementia2013.geo.json" },
    { year: 2014, path: "/data/merged_dementia2014.geo.json" },
    { year: 2015, path: "/data/merged_dementia2015.geo.json" },
    { year: 2016, path: "/data/merged_dementia2016.geo.json" },
    { year: 2017, path: "/data/merged_dementia2017.geo.json" },
    { year: 2018, path: "/data/merged_dementia2018.geo.json" },
    { year: 2019, path: "/data/merged_dementia2019.geo.json" },
    { year: 2020, path: "/data/merged_dementia2020.geo.json" },
    { year: 2021, path: "/data/merged_dementia2021.geo.json" }
];

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
    const lastClickedIdRef = useRef(null);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeYear, setActiveYear] = useState(2021);
    const [datasets, setDatasets] = useState({});
    const typedExplanation = useTypewriter(explanation, 10);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            const loaded = await Promise.all(
                DATA_SETS.map(async ({ year, path }) => {
                    const source = await GeoJsonDataSource.load(path);
                    return { year, source };
                })
            );

            setDatasets(loaded.reduce((acc, { year, source }) => {
                acc[year] = source;
                return acc;
            }, {}));
            setLoading(false);
        };

        loadData();
    }, []);

    useEffect(() => {
        if (!viewerInstance.current) {
            viewerInstance.current = new Viewer(viewerRef.current, {
                projectionPicker: false,
                sceneModePicker: false,
                baseLayerPicker: false,
                infoBox: false,
                selectionIndicator: false,
                timeline: false,
                animation: false,
            });

            viewerInstance.current.camera.setView({
                destination: Cartesian3.fromDegrees(-95.0, 40.0, 20000000),
                orientation: {
                    heading: CesiumMath.toRadians(0),
                    pitch: CesiumMath.toRadians(-90),
                    roll: 0,
                },
            });
        }

        const viewer = viewerInstance.current;
        if (!datasets[activeYear]) return;

        viewer.dataSources.removeAll();
        const dataSource = datasets[activeYear];
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

        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement) => {
            const picked = viewer.scene.pick(movement.position);
            if (defined(picked) && picked.id && picked.id.properties?.val) {
                const newId = picked.id.id;
                if (lastClickedIdRef.current === newId) return;
                lastClickedIdRef.current = newId;
                setExplanation(null);
                setSelectedEntity(picked.id);
            } else {
                lastClickedIdRef.current = null;
                setSelectedEntity(null);
                setExplanation(null);
            }
        }, ScreenSpaceEventType.LEFT_CLICK);

        return () => handler.destroy();
    }, [activeYear, datasets]);

    useEffect(() => {
        if (!loading) return;
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            setLoadingProgress(Math.min(progress, 100));
            if (progress >= 100) clearInterval(interval);
        }, 60);

        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        if (!selectedEntity) return;

        const props = selectedEntity.properties;
        const country = props.country?._value || props.name_en?._value || "Unknown";
        const val = props.val?._value;
        const population = props.pop_est?._value;
        const income = props.income_grp?._value;

        if (!val || !population || !income) return;

        setIsGenerating(true);
        fetch("http://localhost:3001/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, val, population, income }),
        })
            .then((res) => res.json())
            .then((data) => setExplanation(data.explanation))
            .catch(() => setExplanation("⚠️ AI failed to generate insight."))
            .finally(() => setIsGenerating(false));
    }, [selectedEntity]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

            {!loading && (
                <div style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1001,
                    background: "rgba(0,0,0,0.7)",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    width: "500px"
                }}>
                    <Slider
                        min={2013}
                        max={2021}
                        step={1}
                        value={activeYear}
                        onChange={setActiveYear}
                        marks={{
                            2013: "2013",
                            2014: "2014",
                            2015: "2015",
                            2016: "2016",
                            2017: "2017",
                            2018: "2018",
                            2019: "2019", 
                            2020: "2020", 
                            2021: "2021" 
                        }}
                    />
                </div>
            )}

            {loading && (
                <div style={{
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
                }}>
                    <div style={{
                        position: "relative",
                        width: "120px",
                        height: "120px",
                        marginBottom: "20px",
                    }}>
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
                        <div style={{
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
                        }} />
                    </div>
                    <div style={{ fontWeight: 500 }}>
                        Loading Earth Visualization... {loadingProgress}%
                    </div>
                </div>
            )}

            {selectedEntity && (() => {
                const props = selectedEntity.properties;
                const val = props?.val?._value;
                const name = props.country?._value || props.name_en?._value || "Unknown";

                const flagUrl = `https://flagsapi.com/${props.iso_a2?._value || ""}/flat/64.png`;

                return (
                    <div style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        height: "100%",
                        width: "30%",
                        background: "#1e1e1e",
                        color: "#f0f0f0",
                        boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                        transform: "translateX(0)",
                        transition: "transform 0.3s ease-in-out",
                        zIndex: 1000,
                        borderTopLeftRadius: "12px",
                        borderBottomLeftRadius: "12px",
                        overflowY: "auto",
                        overflowX: "hidden",
                        boxSizing: "border-box",
                        padding: "24px",
                    }}>
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
                                color: "#888",
                            }}>
                            &times;
                        </button>
                        {props.iso_a2?._value && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "16px",
                                gap: "12px"
                            }}>
                                <img
                                    src={flagUrl}
                                    alt={`${name} flag`}
                                    style={{
                                        width: "40px",
                                        height: "28px",
                                        borderRadius: "4px",
                                        boxShadow: "0 1px 6px rgba(0,0,0,0.3)"
                                    }}
                                />
                                <h2 style={{ margin: 0, fontSize: "20px" }}>{name}</h2>
                            </div>
                        )}
                        <div style={{
                            fontSize: "12px"
                        }}>
                            <p><strong>Population:</strong> {props.pop_est?._value?.toLocaleString()}</p>
                            <p><strong>Income Group:</strong> {props.income_grp?._value}</p>
                            <p><strong>Subregion:</strong> {props.subregion?._value}</p>
                            <p><strong>Dementia Rate:</strong> {val != null ? (<div>{val?.toFixed(1)} occurrences per 100k</div>) : (<div>No data found.</div>)}</p>
                        </div>
                        <div style={{ fontSize: "13px", marginTop: "16px", fontStyle: "italic" }}>
                            <strong>AI Insight:</strong>{" "}
                            {isGenerating ? (
                                <span style={{ color: "#aaa", fontStyle: "normal" }}>
                                    Generating insight<span className="dot-flash">...</span>
                                </span>
                            ) : explanation ? (
                                <ReactMarkdown>{typedExplanation}</ReactMarkdown>
                            ) : (
                                <span style={{ color: "#777" }}>No insight available.</span>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default HeatmapGlobe;
