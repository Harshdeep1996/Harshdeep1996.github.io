import pandas as pd
import numpy as np
from difflib import SequenceMatcher
import requests
import json

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()


def main(input_file, manifest_path, output_file):
    df_libretto = pd.read_csv(input_file, delimiter='\t', index_col='file_name')


    #correct composers
    composers = [comp if  type(comp) != float else 'Not found' for comp in df_libretto.inferred_composer.tolist()]
    represetari = ['rapprefencarfi', 'recitatfi', 'rapprefentarfinel', 'rarenesentans', 'rapprefetanfi', 'rapprefentarfinel teatro', 'rapprefentarhi']
    corrected_composers = []

    for comp in composers:
        comp_bool = False
        for rep in represetari:
            if similar(comp,rep) > 0.7:

                comp_bool = True
        if comp_bool:
            corrected_composers.append('Not found')
        else: corrected_composers.append(comp)

    df_libretto['inferred_composer'] = corrected_composers

    # add original source
    ids = df_libretto.index
    original_sources = []

    for id in ids:
        filename = manifest_path + id
        if filename.endswith(".json"):
            with open(filename) as jsonFile:
                jsonData = json.load(jsonFile)

                web_id = jsonData["@id"]
                web_id = web_id.split('/')[-2]
                web_address = 'http://dl.cini.it/collections/show/' + web_id
                original_sources.append(web_address)

    df_libretto['original_sources'] = original_sources

    print('finished with sources and composer, starting with wiki')

    # title linking step 1
    ses = requests.Session()
    url = "https://it.wikipedia.org/w/api.php"

    df_libretto['title_mediawiki_pageid'] = [ses.get(url=url, 
                                                     params={"action": "query",
                                                             "format": "json",
                                                             "list": "search",
                                                             "srsearch": df_libretto.loc[idx, 'inferred_title']
                                                             +' opera'}).json()
                                            ['query']['search'][0]['pageid']
                                            if ('query' in ses.get(url=url,
                                                params={"action": "query",
                                                        "format": "json",
                                                         "list": "search",
                                                         "srsearch": df_libretto.loc[idx, 'inferred_title']
                                                         +' opera'}).json().keys()) 
                                             and (len(ses.get(url=url,
                                                  params={"action": "query",
                                                          "format": "json",
                                                          "list": "search",
                                                          "srsearch": df_libretto.loc[idx, 'inferred_title']
                                                          + ' opera'}).json()['query']['search']) > 0)
                                            else
                                                df_libretto.loc[idx, 'title_mediawiki_pageid']
                                            for idx in df_libretto.index
                                       ]
    print('title mediawiki adjusted')
    
    # extract information composer
    
    ses = requests.Session()
    df_libretto['composer_mediawiki_pageid'] = [ses.get(url=url, 
                                                        params={"action": "query",
                                                               "format": "json",
                                                               "list": "search",
                                                               "srsearch": 
                                                               df_libretto.loc[idx, 'inferred_composer'] +
                                                              ' maestro'}).json()['query']['search'][0]['pageid']
                                                if ('query' in ses.get(url=url, 
                                                                       params={"action": "query",
                                                                               "format": "json",
                                                                               "list": "search",
                                                                               "srsearch":
                                                                               df_libretto.loc[idx,
                                                                                              'inferred_composer']
                                                                               + ' maestro'}).json().keys()) 
                                                and (len(ses.get(url=url, 
                                                                 params={"action": "query",
                                                                         "format": "json",
                                                                         "list": "search",
                                                                         "srsearch":
                                                                         df_libretto.loc[idx, 'inferred_composer']
                                                                         + ' maestro'}).json()
                                                         ['query']['search']) > 0)
                                                else
                                                   df_libretto.loc[idx, 'composer_mediawiki_pageid']
                                               for idx in df_libretto.index
                                            ]

    print('composer mediawiki adjusted')

    print(df_libretto.sample(5))
    print('Number of rows for which no title was found:', 
          df_libretto[df_libretto['inferred_title'] == 'Not found'].shape,
          '\nnumber of rows for which no match to the title was found:',
          df_libretto[df_libretto['title_mediawiki_pageid'] == 'Not found'].shape,
          ' over the total number of rows:', df_libretto.shape)

    df_libretto.to_csv(output_file, sep='\t')


if __name__ == "__main__":
    input_file = '../data/librettos_7.csv'
    manifest_path = '../manifests/'
    output_file = '../data/librettos_8.csv'
    main(input_file, manifest_path, output_file)
