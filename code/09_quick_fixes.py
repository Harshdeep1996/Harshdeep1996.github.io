import pandas as pd
import numpy as np
from difflib import SequenceMatcher
import requests

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()


def main(input_file, output_file):
    df_libretto = pd.read_csv(input_file, delimiter='\t', index_col='file_name')


    #correct composers
    composers = [comp if  type(comp) != float else 'Not found' for comp in df_libretto.inferred_composer.tolist()]
    represetari = ['rapprefencarfi', 'recitatfi', 'rapprefentarfinel', 'rarenesentans', 'rapprefetanfi', 'rapprefentarfinel teatro', 'rapprefentarhi']
    corrected_composers = []

    for comp in composers:
        comp_bool = False
        for rep in represetari:
            if similar(comp,rep) > 0.7:
                print(comp)

                comp_bool = True
        if comp_bool:
            corrected_composers.append('Not found')
        else: corrected_composers.append(comp)

    df_libretto['inferred_composer'] = corrected_composers

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

    df_libretto.to_csv(output_file, sep='\t', index=False)


if __name__ == "__main__":
    input_file = '../data/librettos_7.csv'
    output_file = '../data/librettos_8.csv'
    main(input_file, output_file)
