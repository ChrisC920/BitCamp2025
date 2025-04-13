// App.js
import React, { useState } from "react";
import HeatmapGlobe from "./heatmapGlobe";
import Scroll from "./scroll";

function App() {
  const [selectedYear, setSelectedYear] = useState(2018);

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <Scroll
        minYear={2017}
        maxYear={2020}
        selectedYear={selectedYear}
        onChange={setSelectedYear}
      />

      {/* Heatmap Globe */}
      <HeatmapGlobe year={selectedYear} />
    </div>
  );
}

export default App;
