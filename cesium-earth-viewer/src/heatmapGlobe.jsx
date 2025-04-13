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

  // Preload all datasets
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

  // Initialize viewer and handle year changes
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

    // Clear existing data sources
    viewer.dataSources.removeAll();
    const dataSource = datasets[activeYear];
    viewer.dataSources.add(dataSource);

    // Apply styling
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

    // Set up click handler
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

      {/* Year Slider */}
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
          width: "300px"
        }}>
          <Slider
            min={2019}
            max={2021}
            step={1}
            value={activeYear}
            onChange={setActiveYear}
            marks={{ 2019: "2019", 2020: "2020", 2021: "2021" }}
          />
        </div>
      )}

      {/* Loading Overlay */}
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
            }}/>
          </div>
          <div style={{ fontWeight: 500 }}>
            Loading Earth Visualization... {loadingProgress}%
          </div>
        </div>
      )}

      {/* Info Side Panel */}
      <div style={{
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
      }}>
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
              <div style={{
                height: "6px",
                background: topBorderColor,
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                margin: "-24px -24px 16px -24px",
              }}/>
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
                }}>
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
                  <span style={{ color: "#888", fontStyle: "normal" }}>
                    Generating insight<span className="dot-flash">...</span>
                  </span>
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
