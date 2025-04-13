// Scroll.js
import React from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const Scroll = ({ minYear, maxYear, selectedYear, onChange }) => {
  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "20px",
      zIndex: 1000,
      background: "white",
      padding: "1rem",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(251, 14, 176, 0.1)"
    }}>
      <Slider
        min={minYear}
        max={maxYear}
        step={1}
        value={selectedYear}
        onChange={onChange}
      />
      <div style={{ textAlign: "center", marginTop: "8px", fontSize: "14px" }}>
        Selected Year: {selectedYear}
      </div>
    </div>
  );
};

export default Scroll;
