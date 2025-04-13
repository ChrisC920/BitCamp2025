import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css"; // ⬅️ We'll create this CSS file next

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-container">
            <div className="content">
                <h1>Dementia Data Explorer</h1>
                <p>
                    An interactive visualization of global dementia prevalence using satellite imagery and AI-powered insight.
                </p>
                <button onClick={() => navigate("/globe")}>🚀 Enter Visualizer</button>
            </div>
        </div>
    );
};

export default LandingPage;
