import React from "react";
import { useNavigate } from "react-router-dom";
import Starfield from "./Starfield"; // ⬅️ import this

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div style={{ position: "relative", overflow: "hidden", height: "100vh" }}>
            <Starfield />

            <div
                style={{
                    zIndex: 2,
                    position: "relative",
                    color: "#fff",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "2rem",
                }}
            >
                <h1>Dementia Data Explorer</h1>
                <p>
                    An interactive visualization of global dementia prevalence using satellite imagery and AI-powered insight.
                </p>
                <button
                    onClick={() => navigate("/globe")}
                    style={{
                        backgroundColor: "#ffffff10",
                        border: "1px solid #888",
                        padding: "0.8rem 1.5rem",
                        fontSize: "1rem",
                        borderRadius: "8px",
                        color: "#fff",
                        cursor: "pointer",
                        marginTop: "1rem",
                    }}
                >
                    🚀 Enter Visualizer
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
