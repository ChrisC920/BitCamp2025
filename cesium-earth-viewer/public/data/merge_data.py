import csv
import json
import pycountry

def get_iso3(country_name):
    try:
        return pycountry.countries.lookup(country_name).alpha_3
    except LookupError:
        print(f"[WARN] Unmatched country: {country_name}")
        return None


# Step 1: Load dementia data and map it by ISO3
dementia_data = {}
with open("2021dementia.csv", newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if (
            row["measure"] == "Prevalence"
            and row["metric"] == "Rate"
            and row["age"] == "55+ years"
            and row["sex"] == "Both"
            and row["year"] == "2021"
        ):
            iso3 = get_iso3(row["location"])
            if iso3:
                try:
                    dementia_data[iso3] = {
                        "val": float(row["val"]),
                        "upper": float(row["upper"]),
                        "lower": float(row["lower"]),
                        "country": row["location"]
                    }
                except ValueError:
                    continue

# Step 2: Load the original GeoJSON
with open("countries.geo2.json", "r", encoding="utf-8") as geojson_file:
    geo_data = json.load(geojson_file)

# Step 3: Merge by ISO3 (e.g., 'USA', 'CHN', etc.)
for feature in geo_data["features"]:
    iso3 = feature["properties"].get("iso_a3")
    if iso3 in dementia_data:
        feature["properties"].update(dementia_data[iso3])
        print(f"success: {dementia_data[iso3]}")
    else:
        feature["properties"].update({
            "val": None,
            "upper": None,
            "lower": None
        })

# Step 4: Save the merged GeoJSON
with open("merged_dementia.geo.json", "w", encoding="utf-8") as outfile:
    json.dump(geo_data, outfile, indent=2)
