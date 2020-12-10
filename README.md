# Libretti Rolandi Entity Extraction

Add description

## Contents

The repository is organised as follows:
* **code**: contains all the code to extract entities from the coperte and title metadatum and their linking to external/internal sources.

In order to be able to reproduce the results from this folder, the files should be run in numeric order. For instance:

```
python 01_scrapper.py
python 02_place_extraction.py
python 03_fuzzy_place_extraction.py
python 04_composers_extraction.py
python 05_location_extraction.py
python 06_title_extraction.py
python 07_genre_extraction.py
python 08_occasion_extraction.py
python 09_quick_fixes.py
```

* [scraper](code/01_scrapper.py): downloads the manifests of the libretti into the folder [manifests](manifests)
* [place extraction](code/02_place_extraction.py): OCRs the coperte of the libretti and extracts tentative city name, stores csv file with existing metadata and extracted city into the folder [data](data)
* [fuzzy place extraction](code/03_fuzzy_place_extraction.py): extracts tentative city name using fuzzy match, stores new csv file into the folder [data](data)
* [composers extraction](code/04_composers_extraction.py): extracts composer names from copertas and titles, stores new csv file into the folder [data](data)
* [location extraction](code/05_location_extraction.py): extracts location of the representation (i.e. name of theater/church/...), stores new csv file into the folder [data](data)
* [title extraction](code/06_title_extraction.py): extracts mere title from title metadatum, stores new csv file into the folder [data](data)
* [genre extraction](code/07_genre_extraction.py): extracts opera genre from title, stores new csv file into the folder [data](data)
* [occasion extraction](code/08_occasion_extraction.py): extracts occasion of representation (i.e. carnival, fair), stores new csv file into the folder [data](data)
* [quick fixes](code/09_quick_fixes.py): improves composer extraction and wikimedia linking, stores new csv file into the folder [data](data)

## Authors

* **Harshdeep
* **Aurel Maeder**
* **Ludovica Schaerf** 

