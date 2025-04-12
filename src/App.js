// App.js
import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import HeatmapGlobe from "./heatmapGlobe";
import countryLatLong from "./countryLatLong";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/data/2021dementia.csv")
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const filtered = results.data
              .filter(
                (row) =>
                  row.measure === "Incidence" &&
                  row.metric === "Rate" &&
                  row.age === "55+ years" &&
                  row.sex === "Both" &&
                  row.year === "2021" &&
                  countryLatLong[row.location]
              )
              .map((row) => {
                const val = parseFloat(row.val);
                const coords = countryLatLong[row.location];

                return {
                  country: row.location,
                  value: val,
                  lat: coords.lat,
                  lon: coords.lon,
                };
              });

            setData(filtered);
          },
        });
      });
  }, []);

  return <HeatmapGlobe data={data} />;
}

export default App;