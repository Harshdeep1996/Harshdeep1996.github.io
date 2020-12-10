import pandas as pd

librettos = pd.read_csv('../../data/librettos_8.csv', sep='\t')

print('Total number of librettos: {}'.format(librettos.shape[0]))
print('Columns present in the CSV: {}'.format(librettos.columns))
print(librettos['date'].min(), librettos['date'].max())

## We have year for all the librettos except 14 of them
librettos[librettos['date'] == 'no_year'].shape[0]

librettos_with_year = librettos[librettos['date'] != ', Venetiis']
librettos_with_year = librettos_with_year[librettos_with_year['date'] != 'no_year']
librettos_with_year_and_city = librettos_with_year[librettos_with_year['city_name'] != '0']
librettos_with_year_and_city['date'] = librettos_with_year_and_city['date'].apply(lambda x: int(x[:4]))
librettos_with_year_and_city = librettos_with_year_and_city[librettos_with_year_and_city['date'] != 19]
print(librettos_with_year_and_city['date'].min(), librettos_with_year_and_city['date'].max())

librettos_with_year_and_city.to_csv('../../data/get_librettos_dummies.csv')
