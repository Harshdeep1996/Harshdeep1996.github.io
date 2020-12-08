import pandas as pd
import numpy as np
from difflib import SequenceMatcher


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

    df_libretto.to_csv(output_file, sep='\t', index=False)



if __name__ == "__main__":
    input_file = '../data/librettos_7.csv'
    output_file = '../data/librettos_8.csv'
    main(input_file, output_file)
