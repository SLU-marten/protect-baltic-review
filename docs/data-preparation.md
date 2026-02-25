# Data Preparation Guide

How to structure your habitat model data for the review platform.

## Required Directory Structure

```
public/data/
├── fish/
│   ├── gadus-morhua/
│   │   ├── map.tif            # Habitat probability map (GeoTIFF)
│   │   └── metadata.csv       # Model information
│   ├── clupea-harengus/
│   │   ├── map.pdf            # Alternative: PDF map
│   │   └── metadata.csv
│   └── ...
├── invertebrates/
│   ├── saduria-entomon/
│   │   ├── map.tif
│   │   └── metadata.csv
│   └── ...
└── macrophytes/
    ├── fucus-vesiculosus/
    │   ├── map.tif
    │   └── metadata.csv
    └── ...
```

## Folder Naming

- Use **kebab-case** species names: `gadus-morhua`, not `Gadus_morhua`
- One folder per species
- Folder name becomes the species ID

## Map Files

Supported formats:
- `.tif` / `.tiff` — GeoTIFF (preferred, enables georeferenced display)
- `.pdf` — PDF map (fallback, displayed as zoomable image)

Name the file `map.tif` or `map.pdf`.

## Metadata CSV

Each species folder must contain a `metadata.csv` with model information.

### Minimum Fields
```csv
field,value
species_name,Gadus morhua
common_name,Atlantic cod
model_type,MaxEnt
auc,0.92
n_observations,1247
resolution,1km
date,2025-06-15
```

### Format
- Two columns: `field` and `value`
- UTF-8 encoding
- Headers in first row
- Additional fields are displayed automatically

## Species Manifest

After placing all data, run the manifest generator:

```bash
npx tsx scripts/build-manifest.ts
```

This creates `public/species-manifest.json` used by the app to index all species.

## Quick Checklist

- [ ] All species folders use kebab-case names
- [ ] Each folder has exactly one map file (.tif or .pdf)
- [ ] Each folder has a metadata.csv
- [ ] Manifest generated successfully
- [ ] App loads and shows all species in sidebar
