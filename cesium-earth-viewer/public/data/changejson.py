import json

# Load the JSON file
with open('countries.geo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Specify the properties to keep
properties_to_keep = ['formal_en', 'economy', 'pop_year', 'pop_rank', 'pop_est', 'income_grp', 'abbrev,' 'continent', 'subregion', 'name_en', 'iso_a2', 'iso_a3']  # Add all properties you want to keep

# Iterate through each feature and retain only the specified properties
for feature in data.get('features', []):
    feature['properties'] = {key: value for key, value in feature['properties'].items() if key in properties_to_keep}

# Save the updated JSON back to the file
with open('countries.geo2.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print(f"Only properties {properties_to_keep} retained successfully!")
