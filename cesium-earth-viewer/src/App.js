import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import HeatmapGlobe from "./heatmapGlobe";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/globe" element={<HeatmapGlobe />} />
      </Routes>
    </Router>
  );
}

export default App;
