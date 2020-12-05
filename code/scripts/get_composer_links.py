import json
import pandas as pd

x = pd.read_csv('../../data/librettos_7.csv', sep='\t')

y = x[x['inferred_composer'] != 'Not found']
y = y[x['city_name'] != '0']

YEAR_TICKS = list(range(1606, 1926, 22))

y['merged'] = y.apply(lambda row: {row['city_name']:[row['date'],row['title']]}, axis=1)

y3 = y[['merged', 'inferred_composer']].groupby('inferred_composer').agg(list)
y3 = y3[y3['merged'].apply(lambda x: True if len(x) > 1 else False)]

y3['cities'] = y3['merged'].apply(lambda x: set([[*i][0] for i in x]))
y3 = y3[y3['cities'].apply(lambda x: True if len(x) > 1 else False)]

def lower_bound_check(x):
    lower_bounds = dict()
    for i in x:
        city_ = list(i.keys())[0]
        year_ = int(i[city_][0])
        title_ = i[city_][1]
        for j, y in enumerate(YEAR_TICKS):
            if y >= year_:
                lower_bounds.setdefault(str(YEAR_TICKS[j-1]), [])
                lower_bounds[str(YEAR_TICKS[j-1])] += [[year_, city_, title_]]
                break
    
    ## Check if 2 cities are similar in the same 22 years period
    for k in list(lower_bounds):
        if len(set([m[1] for m in lower_bounds[str(k)]])) == 1:
            del lower_bounds[str(k)]
    return lower_bounds


y3['lower_bounds_list'] = y3['merged'].apply(lambda x: lower_bound_check(x))
y3['lower_bounds'] = y3['lower_bounds_list'].apply(
    lambda x: list(x.keys())[0] if len(x.keys()) else 'Not there')
y3 = y3[y3['lower_bounds'] != 'Not there']
y3['lower_bounds_val'] = y3['lower_bounds_list'].apply(lambda x: list(x.values())[0])
y3['titles'] = y3['lower_bounds_val'].apply(lambda x: '\t\t'.join([i[2] for i in x]))
y3.reset_index().to_csv('../../data/composer_links.csv', index=False)
