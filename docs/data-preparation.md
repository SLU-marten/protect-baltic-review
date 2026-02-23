# Data Preparation Guide

How to structure your habitat model data for the review platform.

## Required Directory Structure

```
public/data/
├── fish/
│   ├── fish_details.csv                # One CSV with ALL fish species info
│   ├── binary_confidence_tif/          # One .tif per species
│   │   ├── Gadus_morhua.tif
│   │   ├── Clupea_harengus.tif
│   │   └── ...
│   └── binary_confidence_pdf/          # One .pdf per species (same maps)
│       ├── Gadus_morhua.pdf
│       ├── Clupea_harengus.pdf
│       └── ...
├── invertebrates/
│   ├── invertebrates_details.csv
│   ├── binary_confidence_tif/
│   │   └── ...
│   └── binary_confidence_pdf/
│       └── ...
└── macrophytes/
    ├── macrophytes_details.csv
    ├── binary_confidence_tif/
    │   └── ...
    └── binary_confidence_pdf/
        └── ...
```

## The Details CSV

Each category has ONE CSV file containing info about ALL species in that category.

### Required Columns

| Column | Type | Description |
|--------|------|-------------|
| `scientific_name` | string | Latin species name — **must match TIF/PDF filenames** |
| `common_name` | string | Common/vernacular name |
| `flag` | string | Modeller's quality flag for this model |
| `comment` | string | Modeller's comment on model quality |
| `mean_TSS_ensemble` | number | True Skill Statistic (model performance) |

### Example: fish_details.csv
```csv
scientific_name,common_name,flag,comment,mean_TSS_ensemble
Gadus morhua,Atlantic cod,good,Strong model with high observation count,0.92
Clupea harengus,Atlantic herring,moderate,Limited winter observations,0.71
```

## Map Files

Each species has a map in both formats:
- **binary_confidence_tif/**: GeoTIFF (preferred — enables georeferenced display)
- **binary_confidence_pdf/**: PDF (fallback — displayed as zoomable image)

Filenames should match exactly between TIF and PDF folders and correspond to the species name in the CSV.

## Quick Checklist

- [ ] Three category folders: `fish/`, `invertebrates/`, `macrophytes/`
- [ ] One `*_details.csv` per category with all species as rows
- [ ] `binary_confidence_tif/` folder with one .tif per species
- [ ] `binary_confidence_pdf/` folder with one .pdf per species
- [ ] Filenames consistent between CSV, TIF, and PDF
- [ ] Place everything under `public/data/`
